// Unit tests for tests/launch-scan.mjs: reading draft and example titles, finding placeholders and unfinished titles in a build, counting published posts, finding and reading the photo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  draftTitles,
  exampleTitles,
  frontMatterOf,
  photoPresent,
  placeholderHits,
  publishedPostPages,
  readPhoto,
  titleHits,
} from '../launch-scan.mjs';

/**
 * Make a throwaway folder tree from a map of relative paths to file text, run a check against it and delete it afterwards.
 * @param {Record<string, string>} files - relative path (forward slashes) to file text.
 * @param {(root: string) => void} check - the assertions to run; receives the folder.
 * @returns {void}
 */
function withTree(files, check) {
  const root = mkdtempSync(join(tmpdir(), 'launch-scan-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      const target = join(root, ...path.split('/'));
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, text);
    }
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('frontMatterOf reads a quoted title and a draft flag, skipping comment lines', () => {
  const markdown = '---\n# a comment\ntitle: "Example: a title"\ndraft: true\n---\n\nBody\n';
  assert.deepEqual(frontMatterOf(markdown), { title: 'Example: a title', draft: true });
});

test('frontMatterOf reads an unquoted title, treats a missing draft as false and copes with CRLF', () => {
  assert.deepEqual(frontMatterOf('---\r\ntitle: Plain title\r\n---\r\n'), { title: 'Plain title', draft: false });
});

test('frontMatterOf gives a null title and no draft for text without front matter', () => {
  assert.deepEqual(frontMatterOf('Just a body.'), { title: null, draft: false });
});

test('draftTitles returns the titles of draft entries only, from any depth', () => {
  withTree(
    {
      'posts/a.md': '---\ntitle: "Draft one"\ndraft: true\n---\n',
      'posts/b.md': '---\ntitle: "Published one"\ndraft: false\n---\n',
      'projects/deep/c.md': '---\ntitle: "Draft two"\ndraft: true\n---\n',
      'projects/notes.txt': 'title: "Ignored"\ndraft: true\n',
    },
    (root) => assert.deepEqual(draftTitles(root).sort(), ['Draft one', 'Draft two']),
  );
});

test('exampleTitles returns the titles that start with "Example:", draft or not, from any depth, and no other title', () => {
  withTree(
    {
      'posts/a.md': '---\ntitle: "Example: a stand-in"\ndraft: true\n---\n',
      'posts/b.md': '---\ntitle: "Example: published by mistake"\ndraft: false\n---\n',
      'projects/deep/c.md': '---\ntitle: "example: lower case"\n---\n',
      'posts/d.md': '---\ntitle: "Examples of real work"\n---\n',
      'posts/e.md': '---\ntitle: "A real title"\n---\n',
      'projects/notes.txt': 'title: "Example: ignored"\n',
    },
    (root) => assert.deepEqual(exampleTitles(root).sort(), ['Example: a stand-in', 'Example: published by mistake', 'example: lower case']),
  );
});

test('exampleTitles returns an empty list when no title is an example', () => {
  withTree({ 'posts/a.md': '---\ntitle: "Real"\n---\n' }, (root) => assert.deepEqual(exampleTitles(root), []));
});

test('placeholderHits lists each page and placeholder name found', () => {
  withTree(
    {
      'index.html': '<main><div data-placeholder="photo">Your photo</div><p data-placeholder="intro">x</p></main>',
      'blog/index.html': '<p>fine</p>',
      'profile/index.html': '<p data-placeholder>bare</p>',
    },
    (root) => {
      assert.deepEqual(placeholderHits(root).sort(), [
        `${join(root, 'index.html')}: photo`.replaceAll('\\', '/'),
        `${join(root, 'index.html')}: intro`.replaceAll('\\', '/'),
        `${join(root, 'profile', 'index.html')}: (no name)`.replaceAll('\\', '/'),
      ].sort());
    },
  );
});

test('placeholderHits returns nothing for a build without placeholders', () => {
  withTree({ 'index.html': '<p>done</p>' }, (root) => assert.deepEqual(placeholderHits(root), []));
});

test('titleHits finds a draft title in the visible text, entity-decoded, and ignores other pages', () => {
  withTree(
    {
      'index.html': '<h1>Example: it&#39;s a draft</h1>',
      'blog/index.html': '<p>Nothing here</p>',
    },
    (root) => {
      const hits = titleHits(root, ["Example: it's a draft", 'Another draft']);
      assert.equal(hits.length, 1);
      assert.ok(hits[0].endsWith('index.html: "Example: it\'s a draft"'));
    },
  );
});

test('titleHits returns nothing when there are no draft titles', () => {
  withTree({ 'index.html': '<h1>Hello</h1>' }, (root) => assert.deepEqual(titleHits(root, []), []));
});

test('publishedPostPages counts post pages and leaves out the blog index and the tag pages', () => {
  withTree(
    {
      'blog/index.html': 'list',
      'blog/tags/ai/index.html': 'tag',
      'blog/first-post/index.html': 'post',
      'blog/second-post/index.html': 'post',
      'projects/x/index.html': 'not a post',
    },
    (root) => assert.deepEqual(publishedPostPages(root), ['blog/first-post/index.html', 'blog/second-post/index.html']),
  );
});

test('publishedPostPages returns an empty list when the build has no blog folder', () => {
  withTree({ 'index.html': 'x' }, (root) => assert.deepEqual(publishedPostPages(root), []));
});

test('photoPresent is true only when public/images/photo.jpg is a file', () => {
  withTree({ 'public/images/photo.jpg': 'jpeg bytes' }, (root) => assert.equal(photoPresent(root), true));
  withTree({ 'public/images/other.jpg': 'x' }, (root) => assert.equal(photoPresent(root), false));
  withTree({ 'public/images/photo.jpg/inner.txt': 'x' }, (root) => assert.equal(photoPresent(root), false));
});

test('readPhoto returns the bytes of public/images/photo.jpg and null when it is missing', () => {
  withTree({ 'public/images/photo.jpg': 'jpeg bytes' }, (root) => assert.equal(readPhoto(root).toString(), 'jpeg bytes'));
  withTree({ 'index.html': 'x' }, (root) => assert.equal(readPhoto(root), null));
});
