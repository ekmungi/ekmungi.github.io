// The fixture builds the site tests use: each is a small, invented content folder built on its own, so a state of the site (nothing
// published yet, drafts shown, a broken file) can be checked whatever the real content is. Every title, tag and text here is invented.
import { markdown } from '../fixture-build.mjs';
import { FIXTURE_PHOTO } from './photo.mjs';
import { PLACEHOLDER_STORY, WRITTEN_STORY, profileWithStory } from './profile-text.mjs';

/**
 * Write an invented post.
 * @param {{ title: string, date: string, tags: string[], draft?: boolean, body?: string }} post - its fields.
 * @returns {string} the Markdown file.
 */
function post({ title, date, tags, draft = false, body = 'Fixture text.' }) {
  return markdown([`title: ${JSON.stringify(title)}`, `date: ${date}`, 'summary: "Fixture summary."', `tags: ${JSON.stringify(tags)}`, `draft: ${draft}`], body);
}

/**
 * Write an invented project.
 * @param {string[]} fields - its front-matter lines.
 * @param {string} [body] - its text.
 * @returns {string} the Markdown file.
 */
function project(fields, body = 'Fixture project text.') {
  return markdown(fields, body);
}

// The posts of the "drafts" fixture as the blog must list them: newest first, and the two posts of one day by title A to Z ignoring case.
export const DRAFT_POSTS = [
  { slug: 'fixture-newest', title: 'Fixture: newest post', datetime: '2026-03-03', shown: '3 March 2026', pills: [['Alpha', 'alpha'], ['Beta', 'beta']] },
  { slug: 'fixture-middle-a', title: 'Fixture: A middle post', datetime: '2026-02-02', shown: '2 February 2026', pills: [['alpha', 'alpha']] },
  { slug: 'fixture-middle-b', title: 'Fixture: b middle post', datetime: '2026-02-02', shown: '2 February 2026', pills: [['Alpha', 'alpha'], ['gamma', 'gamma']] },
  { slug: 'fixture-oldest', title: 'Fixture: oldest post', datetime: '2026-01-01', shown: '1 January 2026', pills: [['Brand New Tag', 'brand-new-tag'], ['Beta', 'beta']] },
];

// The tag frame of the "drafts" fixture: "All posts", then by count, then A to Z ignoring case; "Alpha" is the first spelling met.
export const DRAFT_FRAME = [
  ['All posts', '/blog/', 4],
  ['Alpha', '/blog/tags/alpha/', 3],
  ['Beta', '/blog/tags/beta/', 2],
  ['Brand New Tag', '/blog/tags/brand-new-tag/', 1],
  ['gamma', '/blog/tags/gamma/', 1],
];

// Which posts (by title) each tag page of the "drafts" fixture lists, newest first.
export const DRAFT_TAG_PAGES = {
  alpha: [DRAFT_POSTS[0].title, DRAFT_POSTS[1].title, DRAFT_POSTS[2].title],
  beta: [DRAFT_POSTS[0].title, DRAFT_POSTS[3].title],
  'brand-new-tag': [DRAFT_POSTS[3].title],
  gamma: [DRAFT_POSTS[2].title],
};

// The research experiment of the "drafts" fixture and its two updates, newest first as the page must show them.
export const DRAFT_EXPERIMENT = {
  slug: 'fixture-experiment',
  title: 'Fixture: an experiment',
  updates: [
    ['2026-02-07', '7 February 2026', 'Fixture: second update'],
    ['2026-01-05', '5 January 2026', 'Fixture: first update'],
  ],
};

// The two software projects of the "drafts" fixture, A to Z ignoring case, with the status line each must show.
export const DRAFT_SOFTWARE = [
  { slug: 'fixture-tool-a', title: 'Fixture tool A', status: 'Code private' },
  { slug: 'fixture-tool-b', title: 'fixture tool b', status: 'Planned' },
];

// The one post of the "published-post" fixture, which is not a draft, and the tag it carries.
export const PUBLISHED_POST = { slug: 'fixture-published-post', title: 'Fixture: the published post', tag: 'Fixture Tag', tagSlug: 'fixture-tag' };

// The profile file of a fixture whose story is still a placeholder, and of one whose story is written. Both keep the real profile's header.
const PLACEHOLDER_PROFILE = { 'profile/profile.md': profileWithStory(PLACEHOLDER_STORY) };
const WRITTEN_PROFILE = { 'profile/profile.md': profileWithStory(WRITTEN_STORY) };

// The fixtures, by name: whether drafts are shown, whether the build must succeed, the invented content files and, where a fixture needs
// one, the files of its public folder. A fixture with no public files has no portrait photo.
export const FIXTURES = {
  // Nothing ready yet: no published post, no photo, a story that is a placeholder. One draft post, one draft research project and one
  // published software project, built like production.
  unpublished: {
    drafts: false,
    expect: 'pass',
    files: {
      ...PLACEHOLDER_PROFILE,
      'posts/fixture-draft-post.md': post({ title: 'Fixture: a draft post', date: '2026-01-01', tags: ['Fixture Tag'], draft: true }),
      'projects/fixture-software.md': project(['title: "Fixture software"', 'kind: software', 'summary: "Fixture summary."', 'status: "Planned"']),
      'projects/fixture-draft-research.md': project([
        'title: "Fixture: a draft experiment"',
        'kind: research',
        'summary: "Fixture summary."',
        'status: "Planned"',
        'colab: "https://colab.research.google.com/"',
        'draft: true',
      ]),
    },
  },
  // Drafts shown, as in dist-test: four posts with shared, merged and new tags, one research experiment and two software projects. The story
  // is a placeholder and there is no photo, so the unfinished parts show here.
  drafts: {
    drafts: true,
    expect: 'pass',
    files: {
      ...PLACEHOLDER_PROFILE,
      'posts/fixture-newest.md': post({ title: DRAFT_POSTS[0].title, date: '2026-03-03', tags: ['Alpha', 'Beta'], draft: true }),
      'posts/fixture-middle-a.md': post({ title: DRAFT_POSTS[1].title, date: '2026-02-02', tags: ['alpha'] }),
      'posts/fixture-middle-b.md': post({ title: DRAFT_POSTS[2].title, date: '2026-02-02', tags: ['Alpha', 'gamma'], draft: true }),
      'posts/fixture-oldest.md': post({ title: DRAFT_POSTS[3].title, date: '2026-01-01', tags: ['Brand New Tag', 'Beta', 'beta'], body: 'First paragraph.\n\nSecond paragraph.' }),
      'projects/fixture-experiment.md': project(
        [
          `title: "${DRAFT_EXPERIMENT.title}"`,
          'kind: research',
          'summary: "Fixture summary."',
          'status: "Planned"',
          'colab: "https://colab.research.google.com/"',
          'draft: true',
          'updates:',
          '  - date: 2026-01-05',
          '    text: "Fixture: first update"',
          '  - date: 2026-02-07',
          '    text: "Fixture: second update"',
        ],
        '<p data-placeholder="fixture-research">Fixture text still to be written.</p>',
      ),
      'projects/fixture-tool-b.md': project(['title: "fixture tool b"', 'kind: software', 'summary: "Fixture summary b."', 'status: "Planned"']),
      'projects/fixture-tool-a.md': project(['title: "Fixture tool A"', 'kind: software', 'summary: "Fixture summary a."', 'status: "In use"', 'private: true']),
    },
  },
  // One published post, and nothing else ready (placeholder story, no photo), built like production: the blog appears with its post and tag.
  'published-post': {
    drafts: false,
    expect: 'pass',
    files: {
      ...PLACEHOLDER_PROFILE,
      'posts/fixture-published-post.md': post({ title: PUBLISHED_POST.title, date: '2026-04-04', tags: [PUBLISHED_POST.tag] }),
    },
  },
  // A portrait photo (synthetic, no metadata) and nothing else ready, built like production: the photo slot appears.
  'with-photo': {
    drafts: false,
    expect: 'pass',
    files: { ...PLACEHOLDER_PROFILE },
    publicFiles: { 'images/photo.jpg': FIXTURE_PHOTO },
  },
  // A written story and nothing else ready, built like production: the Story frame appears beside At a glance.
  'story-written': {
    drafts: false,
    expect: 'pass',
    files: { ...WRITTEN_PROFILE },
  },
  // A post whose title is only spaces: the build must refuse it and say why.
  'no-title': {
    drafts: false,
    expect: 'fail',
    files: {
      'posts/fixture-blank-title.md': post({ title: '   ', date: '2026-01-01', tags: ['Fixture Tag'] }),
    },
  },
  // A project that names a diagram file which does not exist: the build must refuse it and name the file.
  'missing-diagram': {
    drafts: false,
    expect: 'fail',
    files: {
      'projects/fixture-no-diagram.md': project([
        'title: "Fixture tool"',
        'kind: software',
        'summary: "Fixture summary."',
        'status: "Planned"',
        'diagram:',
        '  file: "fixture-missing.svg"',
        '  caption: "Fixture caption."',
      ]),
    },
  },
  // A project that names a view file which does not exist: the build must refuse it and name the file.
  'missing-view': {
    drafts: false,
    expect: 'fail',
    files: {
      'projects/fixture-no-view.md': project([
        'title: "Fixture tool"',
        'kind: software',
        'summary: "Fixture summary."',
        'status: "Planned"',
        'views:',
        '  - file: "fixture-missing-view.svg"',
        '    caption: "Fixture caption."',
      ]),
    },
  },
};
