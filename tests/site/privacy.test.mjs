// Site tests for the privacy page: it sits at its exact address and its text is the published policy, word for word.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadPage, tidy, REPO_ROOT } from '../helpers.mjs';

// The commit that holds the policy text Google's sign-in app points at today.
const SOURCE = 'fe41869:_pages/privacy.md';

/**
 * Read the original policy from git history.
 * @returns {string} the whole markdown file, front matter included.
 */
function originalPolicy() {
  return execFileSync('git', ['show', SOURCE], { cwd: REPO_ROOT, encoding: 'utf8' });
}

/**
 * Split a markdown file into its front matter lines and its body.
 * @param {string} markdown - a file that may start with a "---" front matter block.
 * @returns {{ frontMatter: string, body: string }} the text between the "---" lines (empty if none) and the rest.
 */
function splitFrontMatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  return match ? { frontMatter: match[1], body: markdown.slice(match[0].length) } : { frontMatter: '', body: markdown };
}

/**
 * Reduce markdown to the text a reader sees: no front matter, heading marks, list bullets, emphasis or link targets.
 * @param {string} markdown - a markdown file.
 * @returns {string} the visible text, one paragraph per line.
 */
function markdownToText(markdown) {
  return splitFrontMatter(markdown)
    .body.split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^\s*[-*+]\s+/, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/(\*\*|__|\*|`)/g, ''),
    )
    .join('\n');
}

/**
 * List the link targets in a markdown file, in order.
 * @param {string} markdown - a markdown file.
 * @returns {string[]} the address of every [text](address) link.
 */
function markdownLinks(markdown) {
  return [...splitFrontMatter(markdown).body.matchAll(/\[[^\]]+\]\(([^)]*)\)/g)].map((match) => match[1]);
}

/**
 * Collapse whitespace and write typographic quotes as plain ones, so that only the words are compared.
 * Astro turns a plain apostrophe into a curly one while building markdown; that is typesetting, not a change of text.
 * @param {string} text - any text.
 * @returns {string} the comparable text.
 */
function normalise(text) {
  return tidy(text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'));
}

test('markdownToText keeps the words and drops front matter, heading marks, bullets and link targets', () => {
  const md = '---\ntitle: T\n---\n\n## Head\n\nA **bold** [link](https://x.test/a) here.\n\n- one\n- two\n';
  assert.equal(normalise(markdownToText(md)), 'Head A bold link here. one two');
  assert.deepEqual(markdownLinks(md), ['https://x.test/a']);
});

test('normalise folds typographic quotes and collapses whitespace', () => {
  assert.equal(normalise(' Anant’s  “tool” \n'), 'Anant\'s "tool"');
});

test('privacy.html exists at the root and nowhere else', () => {
  assert.ok(existsSync(resolve(REPO_ROOT, 'dist/privacy.html')), 'dist/privacy.html is built');
  assert.ok(!existsSync(resolve(REPO_ROOT, 'dist/privacy/index.html')), 'no folder-style /privacy/ page');
});

test('privacy text matches fe41869 word for word', () => {
  const page = loadPage('dist', '/privacy.html');
  const original = markdownToText(originalPolicy());
  assert.ok(original.length > 800, 'the original policy was read from git');
  // The compared text is the markdown body only: it sits in the frame. The page's <h1> comes from the front-matter title and is outside it.
  const body = page.querySelector('main .frame');
  assert.ok(body, 'the markdown body is in a frame inside <main>');
  assert.equal(normalise(body.text), normalise(original));
});

test('privacy page has exactly one h1, the front-matter title, outside the markdown body', () => {
  const page = loadPage('dist', '/privacy.html');
  const headings = page.querySelectorAll('h1');
  assert.equal(headings.length, 1, 'one h1 on the page');
  assert.equal(tidy(headings[0].text), 'Privacy Policy');
  assert.equal(tidy(headings[0].text), splitFrontMatter(originalPolicy()).frontMatter.match(/^title:s*(.+)$/m)[1].trim());
  assert.ok(page.querySelector('main').querySelector('h1'), 'the h1 is in <main>');
  assert.equal(page.querySelectorAll('.frame h1').length, 0, 'the h1 is not part of the markdown body');
});

test('privacy page keeps the original headings, list and link targets', () => {
  const main = loadPage('dist', '/privacy.html').querySelector('main');
  const original = originalPolicy();
  const count = (pattern) => original.split(/\r?\n/).filter((line) => pattern.test(line)).length;
  assert.equal(main.querySelectorAll('h2').length, count(/^## /));
  assert.equal(main.querySelectorAll('h3').length, count(/^### /));
  assert.equal(main.querySelectorAll('li').length, count(/^- /));
  assert.deepEqual(
    main.querySelectorAll('a').map((link) => link.getAttribute('href')),
    markdownLinks(original),
  );
});

test('privacy page title is the original title', () => {
  const title = splitFrontMatter(originalPolicy()).frontMatter.match(/^title:\s*(.+)$/m)[1].trim();
  assert.equal(title, 'Privacy Policy');
  assert.equal(tidy(loadPage('dist', '/privacy.html').querySelector('title').text), title);
});
