// Test helper: reads the content files the way a reader of the site would, so the site tests derive what a build must show from the content
// itself and keep passing as posts, projects and papers are added. Ordering and tag rules, and the rules for which unfinished parts a production
// build hides (no published post, no photo file, a story that is still a placeholder), are written out again here, independently of src/lib.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { REPO_ROOT } from './helpers.mjs';

// The folder the real build reads its content from.
export const CONTENT_DIR = resolve(REPO_ROOT, 'src', 'content');

/**
 * Split a Markdown file into its front matter (parsed as YAML) and its body.
 * @param {string} markdown - the file text.
 * @returns {{ data: Record<string, any>, body: string }} the front-matter fields (empty when there is none) and the text after it.
 */
export function splitMarkdown(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: markdown };
  return { data: parseYaml(match[1]) ?? {}, body: markdown.slice(match[0].length) };
}

/**
 * List the Markdown files of a folder at any depth.
 * @param {string} dir - an absolute folder path.
 * @returns {string[]} absolute paths, sorted.
 */
function markdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? markdownFiles(join(dir, entry.name)) : entry.name.endsWith('.md') ? [join(dir, entry.name)] : []))
    .sort();
}

/**
 * Read every entry of one content collection.
 * @param {string} collection - the folder name under the content folder: "posts", "projects", "research" or "profile".
 * @param {string} [contentDir] - the content folder; the real one by default.
 * @returns {{ id: string, data: Record<string, any>, body: string }[]} one entry per file; the id is the file path without ".md", which is its address.
 */
export function readEntries(collection, contentDir = CONTENT_DIR) {
  const dir = join(contentDir, collection);
  return markdownFiles(dir).map((file) => ({
    id: relative(dir, file).replaceAll('\\', '/').replace(/\.md$/, ''),
    ...splitMarkdown(readFileSync(file, 'utf8')),
  }));
}

/** Tell whether an entry is marked draft: true. */
export const isDraft = (entry) => entry.data.draft === true;

/** Compare two texts A to Z ignoring case, the way the site orders titles and tags. */
const byText = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

/**
 * Order posts newest first, and posts of the same day by title A to Z.
 * @param {{ data: { date: string, title: string } }[]} posts - posts as read by readEntries; not changed.
 * @returns {object[]} a new, sorted array.
 */
export function sortPosts(posts) {
  return [...posts].sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)) || byText(a.data.title, b.data.title));
}

/**
 * Order entries A to Z by title, ignoring case.
 * @param {{ data: { title: string } }[]} entries - entries as read by readEntries; not changed.
 * @returns {object[]} a new, sorted array.
 */
export function sortByTitle(entries) {
  return [...entries].sort((a, b) => byText(a.data.title, b.data.title));
}

/**
 * The address slug of a tag: accents removed, lower case, every run of other characters one dash, no dash at either end.
 * @param {string} tag - a tag as written.
 * @returns {string} the slug; empty when the tag has no letter or digit.
 */
export function tagSlug(tag) {
  return tag.normalize('NFKD').replace(/[\u{300}-\u{36f}]/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * The pills of one post: each tag once (first spelling), in the order written, with its page address.
 * @param {string[]} tags - the post's tags.
 * @returns {[string, string][]} [label, address] pairs.
 */
export function pillsOf(tags) {
  const seen = new Set();
  return tags.flatMap((tag) => {
    const slug = tagSlug(tag);
    if (slug === '' || seen.has(slug)) return [];
    seen.add(slug);
    return [[tag, `/blog/tags/${slug}/`]];
  });
}

/**
 * The tag frame a list of posts must produce: "All posts" first, then every tag by count (highest first) and A to Z.
 * @param {object[]} posts - the posts the build shows, newest first (the first spelling met names the tag).
 * @returns {[string, string, number][]} [label, address, count] rows.
 */
export function tagFrameOf(posts) {
  const found = new Map();
  for (const post of posts) {
    for (const [label, href] of pillsOf(post.data.tags)) found.set(href, { label: found.get(href)?.label ?? label, count: (found.get(href)?.count ?? 0) + 1 });
  }
  const tags = [...found].sort(([, a], [, b]) => b.count - a.count || byText(a.label, b.label)).map(([href, { label, count }]) => [label, href, count]);
  return [['All posts', '/blog/', posts.length], ...tags];
}

/**
 * Write a YYYY-MM-DD date the way the site shows it, for example "21 October 2026".
 * @param {string} iso - a date as written in a content file.
 * @returns {string} the day, the month name and the year.
 */
export function shownDay(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * The status line of a project: "Public on GitHub" with a repo, "Code private" when private, otherwise the written status.
 * @param {{ repo?: string, private?: boolean, status: string }} data - the project's fields.
 * @returns {string} the status line.
 */
export function statusOf(data) {
  if (data.repo) return 'Public on GitHub';
  if (data.private) return 'Code private';
  return data.status;
}

/**
 * The research themes in profile order (their `order` field, lowest first).
 * @param {string} [contentDir] - the content folder; the real one by default.
 * @returns {object[]} the theme entries.
 */
export function themesInOrder(contentDir = CONTENT_DIR) {
  return readEntries('research', contentDir).sort((a, b) => a.data.order - b.data.order);
}

/**
 * The profile entry (src/content/profile/profile.md).
 * @param {string} [contentDir] - the content folder; the real one by default.
 * @returns {{ id: string, data: Record<string, any>, body: string }} the profile.
 * @throws {Error} when the profile file is missing.
 */
export function profileEntry(contentDir = CONTENT_DIR) {
  const entry = readEntries('profile', contentDir).find(({ id }) => id === 'profile');
  if (!entry) throw new Error('src/content/profile/profile.md is missing.');
  return entry;
}

// The public folder of the real build, where the portrait photo would be.
export const PUBLIC_DIR = resolve(REPO_ROOT, 'public');

/**
 * Whether the production build must show the blog: it does as soon as one post is not a draft.
 * @param {string} [contentDir] - the content folder; the real one by default.
 * @returns {boolean} true when at least one post is published.
 */
export function blogIsPublished(contentDir = CONTENT_DIR) {
  return readEntries('posts', contentDir).some((post) => !isDraft(post));
}

/**
 * Whether the portrait file is in place, so the landing page shows it.
 * @param {string} [publicDir] - the public folder; the real one by default.
 * @returns {boolean} true when images/photo.jpg exists in it.
 */
export function photoExists(publicDir = PUBLIC_DIR) {
  return existsSync(join(publicDir, 'images', 'photo.jpg'));
}

/**
 * Whether the profile story has been written: the body has text and no data-placeholder mark.
 * @param {string} [contentDir] - the content folder; the real one by default.
 * @returns {boolean} true when the Story frame has real text to show.
 */
export function storyIsWritten(contentDir = CONTENT_DIR) {
  const { body } = profileEntry(contentDir);
  return body.trim() !== '' && !/data-placeholder/i.test(body);
}
