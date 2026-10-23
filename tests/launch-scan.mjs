// Test helper for the launch gate: finds draft and example titles, [data-placeholder] marks and published posts in a build, and finds and reads the portrait photo.
// Image metadata is checked by image-metadata.mjs, and links by link-scan.mjs.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { parse } from 'node-html-parser';
import { allHtmlFiles, REPO_ROOT } from './helpers.mjs';

// Where the landing page expects its portrait, relative to the repository root.
const PHOTO_PATH = ['public', 'images', 'photo.jpg'];

// Written in place of a name when a [data-placeholder] attribute has no value.
const NO_NAME = '(no name)';

/**
 * Pick the form of a path to show in a message: relative to the repository when the file is inside it, absolute otherwise; forward slashes.
 * @param {string} file - an absolute path.
 * @returns {string} the path to show.
 */
export function displayPath(file) {
  const inside = relative(REPO_ROOT, file);
  const shown = inside.startsWith('..') ? file : inside;
  return shown.split(sep).join('/');
}

/**
 * Read the two front-matter fields the launch gate needs.
 * @param {string} markdown - a Markdown file that may start with a "---" front-matter block.
 * @returns {{ title: string | null, draft: boolean }} the title (quotes removed; null when absent) and whether the entry is marked draft: true.
 */
export function frontMatterOf(markdown) {
  const block = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return { title: null, draft: false };
  const lines = block[1].split(/\r?\n/).filter((line) => !line.trimStart().startsWith('#'));
  const titleLine = lines.find((line) => /^title:/.test(line));
  const title = titleLine ? titleLine.replace(/^title:\s*/, '').trim().replace(/^"(.*)"$|^'(.*)'$/, '$1$2') : null;
  return { title, draft: lines.some((line) => /^draft:\s*true\s*$/.test(line)) };
}

/**
 * List every Markdown file under a folder, at any depth.
 * @param {string} dir - an absolute folder path.
 * @returns {string[]} absolute paths of the .md files.
 */
function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

/**
 * Collect the titles of the entries marked draft: true.
 * @param {string} contentDir - the content folder, for example src/content.
 * @returns {string[]} the draft titles.
 */
export function draftTitles(contentDir) {
  return markdownFiles(contentDir)
    .map((file) => frontMatterOf(readFileSync(file, 'utf8')))
    .filter(({ title, draft }) => draft && title !== null)
    .map(({ title }) => title);
}

/**
 * Collect the titles of the stand-in entries: those that start with "Example:", whether or not they are marked draft.
 * @param {string} contentDir - the content folder, for example src/content.
 * @returns {string[]} the example titles.
 */
export function exampleTitles(contentDir) {
  return markdownFiles(contentDir)
    .map((file) => frontMatterOf(readFileSync(file, 'utf8')).title)
    .filter((title) => title !== null && /^example:/i.test(title));
}

/**
 * Find every [data-placeholder] mark in a build.
 * @param {string} outDir - the build folder, relative to the repository root or absolute.
 * @returns {string[]} one line per mark: "<page>: <placeholder name>".
 */
export function placeholderHits(outDir) {
  return allHtmlFiles(outDir).flatMap((file) =>
    parse(readFileSync(file, 'utf8'))
      .querySelectorAll('[data-placeholder]')
      .map((element) => `${displayPath(file)}: ${element.getAttribute('data-placeholder') || NO_NAME}`),
  );
}

/**
 * Find pages of a build whose text contains any of the given titles.
 * @param {string} outDir - the build folder, relative to the repository root or absolute.
 * @param {readonly string[]} titles - the titles to look for, for example the draft titles.
 * @returns {string[]} one line per page and title: '<page>: "<title>"'.
 */
export function titleHits(outDir, titles) {
  if (titles.length === 0) return [];
  return allHtmlFiles(outDir).flatMap((file) => {
    // node-html-parser decodes entities in .text, so "it&#39;s" is compared as "it's".
    const text = parse(readFileSync(file, 'utf8')).text;
    return titles.filter((title) => text.includes(title)).map((title) => `${displayPath(file)}: "${title}"`);
  });
}

/**
 * List the built blog post pages: /blog/<slug>/ but not the blog index and not the tag pages.
 * @param {string} outDir - the build folder, relative to the repository root or absolute.
 * @returns {string[]} paths relative to the build folder, forward slashes, sorted; empty when the build has no blog folder.
 */
export function publishedPostPages(outDir) {
  const root = resolve(REPO_ROOT, outDir);
  const blog = join(root, 'blog');
  let entries;
  try {
    entries = readdirSync(blog, { withFileTypes: true });
  } catch (error) {
    // No blog folder at all means no post was built; any other failure is a real problem.
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'tags')
    .map((entry) => `blog/${entry.name}/index.html`)
    .filter((page) => isFile(join(root, ...page.split('/'))))
    .sort();
}

/**
 * Tell whether a path is a file.
 * @param {string} path - any path.
 * @returns {boolean} true for a file, false for a folder or a missing path.
 */
function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Tell whether the portrait photo is in place.
 * @param {string} root - the repository folder.
 * @returns {boolean} true when public/images/photo.jpg is a file.
 */
export function photoPresent(root) {
  return isFile(join(root, ...PHOTO_PATH));
}

/**
 * Read the portrait photo.
 * @param {string} root - the repository folder.
 * @returns {Buffer | null} the bytes of public/images/photo.jpg, or null when it is missing or is a folder.
 */
export function readPhoto(root) {
  try {
    return readFileSync(join(root, ...PHOTO_PATH));
  } catch (error) {
    // A missing file (or a folder in its place) is the normal "no photo yet" case; any other failure is a real problem.
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) return null;
    throw error;
  }
}
