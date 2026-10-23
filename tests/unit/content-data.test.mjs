// Unit tests for tests/content-data.mjs and tests/fixture-build.mjs: reading content files and deriving what a build must show, on invented content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';
import {
  blogIsPublished,
  photoExists,
  pillsOf,
  profileEntry,
  readEntries,
  shownDay,
  sortByTitle,
  sortPosts,
  splitMarkdown,
  statusOf,
  storyIsWritten,
  tagFrameOf,
  tagSlug,
  themesInOrder,
} from '../content-data.mjs';
import { FIXTURE_ROOT, fixtureOut, markdown, writeFixture } from '../fixture-build.mjs';

/** A post as readEntries gives it, for the ordering and tag tests. */
const post = (title, date, tags) => ({ id: title, data: { title, date, tags }, body: '' });

/**
 * Make a throwaway content folder from a map of relative paths to file text, run a check against it and delete it afterwards.
 * @param {Record<string, string>} files - relative path (forward slashes) to file text.
 * @param {(root: string) => void} check - the assertions to run; receives the folder.
 * @returns {void}
 */
function withContent(files, check) {
  const root = mkdtempSync(join(tmpdir(), 'content-data-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(root, ...path.split('/').slice(0, -1)), { recursive: true });
      writeFileSync(join(root, ...path.split('/')), text);
    }
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('splitMarkdown parses the front matter as YAML, keeps dates as written and returns the body', () => {
  const { data, body } = splitMarkdown('---\r\ntitle: "A: b"\r\ndate: 2026-01-02\r\ndraft: true\r\ntags: ["x"]\r\n---\r\n\r\nBody text.\r\n');
  assert.deepEqual(data, { title: 'A: b', date: '2026-01-02', draft: true, tags: ['x'] });
  assert.equal(body.trim(), 'Body text.');
  assert.deepEqual(splitMarkdown('No front matter.'), { data: {}, body: 'No front matter.' });
});

test('readEntries reads every Markdown file of a collection at any depth, with its address as id, and nothing else', () => {
  withContent({ 'posts/b.md': '---\ntitle: B\n---\n', 'posts/deep/a.md': '---\ntitle: A\n---\n', 'posts/.gitkeep': '', 'posts/notes.txt': 'x' }, (root) => {
    assert.deepEqual(readEntries('posts', root).map(({ id, data }) => [id, data.title]), [['b', 'B'], ['deep/a', 'A']]);
    assert.deepEqual(readEntries('projects', root), [], 'a missing collection folder has no entries');
  });
});

test('themesInOrder sorts by the order field, and profileEntry reads profile.md or says it is missing', () => {
  withContent({ 'research/z.md': '---\ntitle: Z\norder: 1\n---\n', 'research/a.md': '---\ntitle: A\norder: 2\n---\n', 'profile/profile.md': '---\nglance: {}\n---\nStory' }, (root) => {
    assert.deepEqual(themesInOrder(root).map(({ id }) => id), ['z', 'a']);
    assert.equal(profileEntry(root).body, 'Story');
  });
  withContent({ 'research/a.md': '---\norder: 1\n---\n' }, (root) => assert.throws(() => profileEntry(root), /profile\.md is missing/));
});

test('sortPosts puts newer posts first and posts of one day by title A to Z ignoring case; the input is not changed', () => {
  const posts = [post('b', '2026-01-01', []), post('C', '2026-01-02', []), post('a', '2026-01-01', [])];
  assert.deepEqual(sortPosts(posts).map(({ id }) => id), ['C', 'a', 'b']);
  assert.deepEqual(posts.map(({ id }) => id), ['b', 'C', 'a']);
  assert.deepEqual(sortByTitle(posts).map(({ id }) => id), ['a', 'b', 'C']);
});

test('tagSlug and pillsOf give each tag one address and one pill, first spelling first, skipping a tag with no letter or digit', () => {
  assert.equal(tagSlug('  Drug Discovery! '), 'drug-discovery');
  assert.equal(tagSlug('Caf\u{e9}'), 'cafe');
  assert.deepEqual(pillsOf(['Drug discovery', 'AI', 'drug Discovery', '???']), [['Drug discovery', '/blog/tags/drug-discovery/'], ['AI', '/blog/tags/ai/']]);
});

test('tagFrameOf starts with All posts and orders tags by count, then A to Z ignoring case, counting a post once per tag', () => {
  const posts = [post('one', '2026-01-03', ['beta', 'Alpha', 'alpha']), post('two', '2026-01-02', ['alpha', 'Gamma']), post('three', '2026-01-01', ['Beta'])];
  assert.deepEqual(tagFrameOf(posts), [
    ['All posts', '/blog/', 3],
    ['Alpha', '/blog/tags/alpha/', 2],
    ['beta', '/blog/tags/beta/', 2],
    ['Gamma', '/blog/tags/gamma/', 1],
  ]);
  assert.deepEqual(tagFrameOf([]), [['All posts', '/blog/', 0]]);
});

test('shownDay writes a date as day, month name and year, and statusOf picks the status line', () => {
  assert.equal(shownDay('2026-10-07'), '7 October 2026');
  assert.equal(statusOf({ repo: 'https://github.com/ekmungi/x', status: 'ignored' }), 'Public on GitHub');
  assert.equal(statusOf({ private: true, status: 'ignored' }), 'Code private');
  assert.equal(statusOf({ status: 'Planned' }), 'Planned');
});

test('markdown writes a front-matter block and a body, and fixtureOut names the fixture build folder', () => {
  assert.equal(markdown(['title: "T"'], 'Body'), '---\ntitle: "T"\n---\n\nBody\n');
  assert.equal(fixtureOut('no-posts'), 'fixture-builds/no-posts/dist');
});

test('writeFixture writes the invented files beside a copy of the real profile and themes, under the git-ignored fixture folder', () => {
  const name = 'unit-helper-check';
  try {
    const dir = writeFixture(name, { 'posts/a.md': 'x' });
    assert.equal(dir, `./${FIXTURE_ROOT}/${name}/content`);
    const content = join(REPO_ROOT, FIXTURE_ROOT, name, 'content');
    assert.equal(readFileSync(join(content, 'posts', 'a.md'), 'utf8'), 'x');
    assert.ok(existsSync(join(content, 'profile', 'profile.md')), 'the profile is copied');
    assert.ok(existsSync(join(content, 'projects')), 'an empty projects folder exists');
  } finally {
    rmSync(join(REPO_ROOT, FIXTURE_ROOT, name), { recursive: true, force: true });
  }
});

test('writeFixture also makes a public folder of its own, empty unless public files are given, and writes binary files unchanged', () => {
  const name = 'unit-helper-public';
  try {
    writeFixture(name, {}, { 'images/photo.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
    const publicDir = join(REPO_ROOT, FIXTURE_ROOT, name, 'public');
    assert.deepEqual([...readFileSync(join(publicDir, 'images', 'photo.jpg'))], [0xff, 0xd8, 0xff, 0xd9]);
    writeFixture(name, {});
    assert.ok(existsSync(publicDir), 'the public folder exists');
    assert.ok(!existsSync(join(publicDir, 'images')), 'and holds nothing when no public file is given');
  } finally {
    rmSync(join(REPO_ROOT, FIXTURE_ROOT, name), { recursive: true, force: true });
  }
});

test('blogIsPublished is true only when a post is not a draft', () => {
  const draftPost = '---\ntitle: A\ndraft: true\n---\n';
  const livePost = '---\ntitle: B\n---\n';
  withContent({ 'posts/a.md': draftPost }, (root) => assert.equal(blogIsPublished(root), false));
  withContent({ 'posts/a.md': draftPost, 'posts/b.md': livePost }, (root) => assert.equal(blogIsPublished(root), true));
  withContent({ 'posts/.gitkeep': '' }, (root) => assert.equal(blogIsPublished(root), false));
});

test('photoExists is true only when images/photo.jpg is in the public folder', () => {
  withContent({ 'images/photo.jpg': 'x' }, (root) => assert.equal(photoExists(root), true));
  withContent({ 'images/other.jpg': 'x' }, (root) => assert.equal(photoExists(root), false));
});

test('storyIsWritten is false for an empty story and for one with a data-placeholder mark, and true for plain text', () => {
  const profile = (story) => ({ 'profile/profile.md': `---\nglance: {}\n---\n${story}` });
  withContent(profile('<p data-placeholder="story">x</p>'), (root) => assert.equal(storyIsWritten(root), false));
  withContent(profile('  \n'), (root) => assert.equal(storyIsWritten(root), false));
  withContent(profile('A written paragraph.'), (root) => assert.equal(storyIsWritten(root), true));
});
