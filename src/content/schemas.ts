// Checked shapes for every content type (posts, projects, research, profile). A file that breaks a rule fails the build.
import { z } from 'astro/zod';
import { SITE } from '../data/site.ts';
import { findNonPublicRepo, hasParentSegment, pointsAtGithub } from '../lib/repo-guard.ts';
import { tagSlug } from '../lib/tags.ts';

// The one thing a date error needs to say; the same text is used whichever way the date was wrong.
const DATE_HINT = 'Write the date like 2026-10-21.';

// Dates written as text must be exactly YYYY-MM-DD and a real calendar day. Looser text is refused because
// parsing it is a guess: "0" becomes 1999, and "October 21, 2026" is read in local time, a day early.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Tell whether text is a real calendar day written as YYYY-MM-DD ("2026-02-31" is not: it would roll over to 3 March).
 * @param text - the date as written in a content file.
 * @returns true when the text has the YYYY-MM-DD shape and reading it as a date and writing it back gives the same text.
 */
function isRealDay(text: string): boolean {
  if (!ISO_DATE.test(text)) return false;
  const date = new Date(text);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

// A date arrives either as a Date (front matter written as 2026-10-21 without quotes is read that way) or as
// YYYY-MM-DD text. Anything else is refused before coercion, because z.coerce.date() alone would turn a blank
// (null) date into 1 January 1970 and a number into a 1970 timestamp, and a post with no real date would build.
const dateField = z
  .union([z.date(), z.string().refine(isRealDay, DATE_HINT)], { error: DATE_HINT })
  .pipe(z.coerce.date({ error: DATE_HINT }));

/**
 * Say plainly why a repository mention is refused.
 * @param name - the repository name found in the link; empty when the owner was mentioned without one.
 * @returns the error message shown at build time.
 */
function notPublicMessage(name: string): string {
  if (name === '') {
    return 'This link mentions ekmungi without naming a repository from the public allow-list in src/data/site.ts, so the site must not link to it.';
  }
  return `This link points at the repository "${name}", which is not on the public allow-list in src/data/site.ts, so the site must not link to it.`;
}

// Every web address in the content model goes through this schema: it must use http or https (so a content file
// cannot carry a "javascript:" link), and it must not name an ekmungi repository that is off the public
// allow-list. The guard reads the whole address, so a repository tucked into a fragment, a query or an
// encoded path is caught as well as an ordinary github.com link, and a ".." segment is refused because it
// could lead from a listed repository to another one.
const webUrl = z.url({ protocol: /^https?$/ }).superRefine((url, ctx) => {
  const found = findNonPublicRepo(url, SITE.publicRepos);
  if (found) ctx.addIssue({ code: 'custom', message: notPublicMessage(found.name) });
  if (hasParentSegment(url)) {
    ctx.addIssue({
      code: 'custom',
      message: 'This link contains a ".." path segment, which could lead from a listed repository to a different one. Remove it.',
    });
  }
});

// A language tag such as "fr" or "de-CH": two or three lower-case letters, then optional subtags.
const LANG_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

// A paper or publication: its title and, when it is online, its address. A title in another language than English names that language
// (lang), so screen readers pronounce it correctly, and may carry an English translation that is shown after it in brackets.
const titledLink = z.object({
  title: z.string(),
  url: webUrl.optional(),
  lang: z.string().regex(LANG_TAG, 'Write the language as a language tag, for example "fr".').optional(),
  translation: z.string().optional(),
});

/**
 * A text field that must say something. The text is kept exactly as written; it is refused when nothing is left once spaces are removed.
 * @param kind - what the entry is, for the message ("post", "project").
 * @param name - the field's name, for the message ("title", "summary").
 * @returns the string schema.
 */
function filledText(kind: string, name: string) {
  return z.string().refine((text) => text.trim() !== '', `A ${kind} needs a ${name}: write one that is more than spaces.`);
}

// The only form of repository link the `repo` field accepts. The capture group is the repository name.
const REPO_LINK = /^https:\/\/github\.com\/ekmungi\/([^/]+)\/?$/;

// A diagram file name: lower-case letters, digits and hyphens, ending in .svg. It names a file in src/assets/diagrams, so a path or
// a ".." cannot lead the page to a file elsewhere.
const DIAGRAM_FILE = /^[a-z0-9-]+\.svg$/;

// A project's "How it works" diagram: the SVG file and the one line shown under it.
const diagramField = z.object({
  file: z.string().regex(DIAGRAM_FILE, 'Name the diagram by its file in src/assets/diagrams: lower-case letters, digits and hyphens, ending in .svg.'),
  caption: filledText('diagram', 'caption'),
});

// A view of the project's interface, drawn from its code: an SVG file in src/assets/diagrams and the one line shown under it.
const viewField = z.object({
  file: z.string().regex(DIAGRAM_FILE, 'Name the view by its file in src/assets/diagrams: lower-case letters, digits and hyphens, ending in .svg.'),
  caption: filledText('view', 'caption'),
});

// A warning the reader must see before anything else on the project page, such as the need for consent before recording.
const noticeField = z.object({
  title: filledText('notice', 'title'),
  text: filledText('notice', 'text'),
});

// A paper a project builds on: its title and address, who wrote it, where and when it appeared, and what the project takes from it.
// The address is required, so a reader can always look the paper up.
const referenceField = z.object({
  title: filledText('reference', 'title'),
  url: webUrl,
  authors: filledText('reference', 'authors'),
  source: filledText('reference', 'source'),
  use: filledText('reference', 'use'),
});

// The one host a `colab` link may use. Other hosts (githubtocolab.com, old Colab aliases) can also open
// a GitHub notebook, so allowing only this host keeps the GitHub checks complete.
const COLAB_HOST = 'colab.research.google.com';

/**
 * Read the host of an address.
 * @param url - an address as written in a content file.
 * @returns the host name, or null when the address cannot be read (the field's url() check reports that).
 */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** A blog post: dated, summarised and tagged. Drafts are hidden from the public build. */
export const postSchema = z.object({
  title: filledText('post', 'title'),
  date: dateField,
  summary: filledText('post', 'summary'),
  // At least one tag, and each tag needs an a-z or 0-9 character (see tagSlug), otherwise its tag page would have no address.
  tags: z
    .array(z.string().refine((tag) => tagSlug(tag) !== '', 'A tag needs at least one a-z or 0-9 character, because its address is built from those.'))
    .min(1, 'A post needs at least one tag.'),
  draft: z.boolean().default(false),
});

/**
 * A project, either a research experiment or software.
 * The refinements are the build-time guard for the privacy rule. Every link, `repo` and `colab` included, is
 * checked against the public allow-list by the shared URL schema. On top of that, a private project has no
 * repo link and no GitHub-backed Colab link, a `repo` has the exact form github.com/ekmungi/<name>, and a
 * `colab` link is on Colab itself.
 */
export const projectSchema = z
  .object({
    title: filledText('project', 'title'),
    kind: z.enum(['research', 'software']),
    summary: filledText('project', 'summary'),
    status: z.string(),
    repo: webUrl.optional(),
    private: z.boolean().default(false),
    colab: webUrl.optional(),
    notice: noticeField.optional(),
    diagram: diagramField.optional(),
    views: z.array(viewField).default([]),
    references: z.array(referenceField).default([]),
    draft: z.boolean().default(false),
    updates: z.array(z.object({ date: dateField, text: z.string() })).default([]),
  })
  .superRefine((project, ctx) => {
    if (project.private && project.repo) {
      ctx.addIssue({
        code: 'custom',
        path: ['private'],
        message: 'A private project must not have a repo link. Remove `repo`, or set `private: false` if the repository is public.',
      });
    }
    if (project.private && project.colab && pointsAtGithub(project.colab)) {
      ctx.addIssue({
        code: 'custom',
        path: ['private'],
        message: 'A private project must not have a GitHub-backed colab link. Remove `colab`, or set `private: false` if the repository is public.',
      });
    }
    const colabHost = project.colab === undefined ? null : hostOf(project.colab);
    if (colabHost !== null && colabHost !== COLAB_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['colab'],
        message: `The colab link "${project.colab}" must be on ${COLAB_HOST}.`,
      });
    }
    if (project.repo) {
      const name = REPO_LINK.exec(project.repo)?.[1];
      if (name === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['repo'],
          message: `The repo link "${project.repo}" must be exactly https://github.com/ekmungi/<name>, with no extra path or suffix.`,
        });
      } else if (!SITE.publicRepos.includes(name)) {
        // The name is everything after the owner, so a query, a fragment or an encoded path glued to it lands here too.
        // The shared URL check accepts any capitalisation of a public repository, so that slip gets its own message.
        const spelled = SITE.publicRepos.includes(name.toLowerCase());
        ctx.addIssue({
          code: 'custom',
          path: ['repo'],
          message: spelled
            ? `The repo link must spell the repository exactly as listed on the public allow-list: "${name.toLowerCase()}".`
            : `The repository "${name}" is not on the public allow-list in src/data/site.ts, so the site must not link to it.`,
        });
      }
    }
  });

/** A research position on the profile page: where and when, a summary and the papers that came from it. */
export const researchSchema = z.object({
  title: z.string(),
  period: z.string(),
  place: z.string(),
  summary: z.string(),
  // Position on the profile page; lower numbers come first.
  order: z.number(),
  papers: z.array(titledLink),
});

/** The profile page: the at-a-glance block and the lists around the story, which is the Markdown body. */
export const profileSchema = z.object({
  glance: z.object({
    now: z.string(),
    basedIn: z.string(),
    experience: z.string(),
    education: z.string(),
    languages: z.string(),
  }),
  experience: z.array(z.object({ when: z.string(), title: z.string(), org: z.string(), line: z.string() })),
  publications: z.array(titledLink),
  patents: z.array(z.string()),
  mentoring: z.array(z.string()),
  education: z.array(z.string()),
});
