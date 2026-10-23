// Site tests for the blog on the real builds: /blog/, the post pages and the tag pages. The production build (dist/) shows the published posts
// and the test build (dist-test/) shows drafts too. What each build must show is derived from the post files, so the tests keep passing as
// posts are written, published or deleted; fixed states (nothing published, a known set of tags) are tested on fixture builds in fixture-blog.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDraft, pillsOf, readEntries, shownDay, sortPosts, tagFrameOf } from '../content-data.mjs';
import { REPO_ROOT, loadPage, tidy } from '../helpers.mjs';
import { publishedPostPages } from '../launch-scan.mjs';

const ALL_POSTS = readEntries('posts');

// Each build with the posts it must show, newest first.
const BUILDS = [
  { outDir: 'dist', posts: sortPosts(ALL_POSTS.filter((post) => !isDraft(post))) },
  { outDir: 'dist-test', posts: sortPosts(ALL_POSTS) },
];

/** The tag pages a build must have: one per tag address in its tag frame, without "All posts". */
const tagRoutes = (posts) => tagFrameOf(posts).slice(1).map(([, href]) => href);

/** The [label, address] pills of one element. */
const pillsIn = (element) => element.querySelectorAll('.pills a.pill').map((pill) => [tidy(pill.text), pill.getAttribute('href')]);

/** The tag frame's rows as [name, address, count]. */
const frameRows = (page) =>
  page.querySelectorAll('main .tagframe li a').map((link) => [tidy(link.querySelector('.tag-name').text), link.getAttribute('href'), Number(tidy(link.querySelector('.tag-count').text))]);

/** The top-bar links that carry aria-current, as [label, value] pairs. */
const markedNav = (page) => page.querySelectorAll('header nav a[aria-current]').map((link) => [tidy(link.text), link.getAttribute('aria-current')]);

/**
 * List the tag page folders a build has.
 * @param {string} outDir - the build folder.
 * @returns {string[]} the tag addresses, sorted.
 */
function builtTagRoutes(outDir) {
  const tags = join(REPO_ROOT, outDir, 'blog', 'tags');
  return existsSync(tags) ? readdirSync(tags).map((slug) => `/blog/tags/${slug}/`).sort() : [];
}

test('/blog/ has its title, one h1 and a lede in both builds, and a list and tag frame only when there are posts', () => {
  for (const { outDir, posts } of BUILDS) {
    const page = loadPage(outDir, '/blog/');
    const main = page.querySelector('main');
    assert.equal(page.querySelector('title').text, 'Blog | Anant Vemuri', outDir);
    assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), ['Blog'], outDir);
    assert.ok(tidy(main.querySelector('.lede').text).length > 0, `${outDir}: the lede is there`);
    assert.equal(main.querySelectorAll('.tagframe').length, posts.length > 0 ? 1 : 0, `${outDir}: a tag frame only with posts`);
    assert.equal(main.querySelectorAll('.posts').length, posts.length > 0 ? 1 : 0, `${outDir}: a post list only with posts`);
  }
});

test('/blog/ lists every post of the build newest first, each with its date, linked title, summary and tags', () => {
  for (const { outDir, posts } of BUILDS) {
    const cards = loadPage(outDir, '/blog/').querySelectorAll('main .posts article.post');
    assert.equal(cards.length, posts.length, outDir);
    cards.forEach((card, index) => {
      const { id, data } = posts[index];
      const link = card.querySelector('.post-title a');
      assert.equal(link.getAttribute('href'), `/blog/${id}/`, outDir);
      assert.equal(tidy(link.text), data.title, outDir);
      assert.equal(card.querySelector('time').getAttribute('datetime'), data.date, `${outDir} ${id}`);
      assert.equal(tidy(card.querySelector('time').text), shownDay(data.date), `${outDir} ${id}`);
      assert.equal(tidy(card.querySelector('.summary').text), tidy(data.summary), `${outDir} ${id}`);
      assert.deepEqual(pillsIn(card), pillsOf(data.tags), `${outDir} ${id}`);
    });
  }
});

test('every post shown has its own page, and no other post page is built', () => {
  for (const { outDir, posts } of BUILDS) {
    assert.deepEqual(publishedPostPages(outDir), posts.map(({ id }) => `blog/${id}/index.html`).sort(), outDir);
  }
});

test('a post page shows its title, date, tags as links and its text, and no tag frame', () => {
  for (const { outDir, posts } of BUILDS) {
    for (const { id, data } of posts) {
      const page = loadPage(outDir, `/blog/${id}/`);
      const main = page.querySelector('main');
      assert.equal(page.querySelector('title').text, `${data.title} | Anant Vemuri`, id);
      assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), [data.title], id);
      assert.equal(main.querySelector('time').getAttribute('datetime'), data.date, id);
      assert.equal(tidy(main.querySelector('time').text), shownDay(data.date), id);
      assert.deepEqual(pillsIn(main), pillsOf(data.tags), id);
      assert.ok(main.querySelector('.post-body').childNodes.some((node) => tidy(node.text).length > 0), `${id}: the markdown body is rendered`);
      assert.equal(main.querySelectorAll('nav, .tagframe').length, 0, `${id}: no <nav> and no tag frame inside <main>`);
    }
  }
});

test('the tag frame lists "All posts" and every tag with its count', () => {
  for (const { outDir, posts } of BUILDS) {
    if (posts.length === 0) continue;
    assert.deepEqual(frameRows(loadPage(outDir, '/blog/')), tagFrameOf(posts), outDir);
  }
});

test('every tag has a page that lists exactly its posts, newest first, under the same frame with that tag marked', () => {
  for (const { outDir, posts } of BUILDS) {
    const routes = tagRoutes(posts);
    assert.deepEqual(builtTagRoutes(outDir), [...routes].sort(), `${outDir}: one page per tag and no other`);
    for (const route of routes) {
      const page = loadPage(outDir, route);
      const expected = posts.filter(({ data }) => pillsOf(data.tags).some(([, href]) => href === route)).map(({ data }) => data.title);
      assert.deepEqual(page.querySelectorAll('main .posts .post .post-title').map((title) => tidy(title.text)), expected, `${outDir} ${route}`);
      assert.deepEqual(frameRows(page), tagFrameOf(posts), `${outDir} ${route}`);
      const marked = page.querySelectorAll('main .tagframe a[aria-current]').map((link) => [link.getAttribute('href'), link.getAttribute('aria-current')]);
      assert.deepEqual(marked, [[route, 'page']], `${outDir} ${route}`);
      assert.match(tidy(page.querySelector('main h1').text), /^Posts tagged /, `${outDir} ${route}`);
    }
  }
});

test('on /blog/ the top-bar Blog link is aria-current="page", and so is "All posts" when the tag frame is shown; with no post there is no Blog link to mark', () => {
  for (const { outDir, posts } of BUILDS) {
    const page = loadPage(outDir, '/blog/');
    assert.deepEqual(markedNav(page), posts.length > 0 ? [['Blog', 'page']] : [], outDir);
    const frame = page.querySelectorAll('main .tagframe a[aria-current]').map((link) => [tidy(link.querySelector('.tag-name').text), link.getAttribute('aria-current')]);
    assert.deepEqual(frame, posts.length > 0 ? [['All posts', 'page']] : [], outDir);
    assert.equal(page.querySelectorAll('[aria-current]').length, posts.length > 0 ? 2 : 0, `${outDir}: nothing else is marked`);
  }
});

test('the top bar of every page has a Blog link when the build shows a post, and none when it does not', () => {
  for (const { outDir, posts } of BUILDS) {
    for (const route of ['/', '/profile/', '/projects/', '/blog/', '/privacy.html']) {
      const links = loadPage(outDir, route).querySelectorAll('header nav a').map((link) => link.getAttribute('href'));
      assert.equal(links.includes('/blog/'), posts.length > 0, `${outDir} ${route}`);
    }
  }
});

test('on a post page and a tag page the top-bar Blog link is aria-current="true"', () => {
  for (const { outDir, posts } of BUILDS) {
    for (const route of [...posts.map(({ id }) => `/blog/${id}/`), ...tagRoutes(posts)]) {
      const page = loadPage(outDir, route);
      assert.deepEqual(markedNav(page), [['Blog', 'true']], `${outDir} ${route}`);
      assert.equal(page.querySelectorAll('[aria-current]').length, route.startsWith('/blog/tags/') ? 2 : 1, `${outDir} ${route}: nothing else is marked`);
    }
  }
});

test('the blog pages work without JavaScript: they ship no script', () => {
  for (const { outDir, posts } of BUILDS) {
    for (const route of ['/blog/', ...posts.map(({ id }) => `/blog/${id}/`), ...tagRoutes(posts)]) {
      assert.equal(loadPage(outDir, route).querySelectorAll('script').length, 0, `${outDir} ${route}`);
    }
  }
});
