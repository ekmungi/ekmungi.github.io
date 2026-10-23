// Site tests for what other sites read from a page: every page of the production build has a meta description and the basic Open Graph
// tags (title, description, address, type), with the page's own summary where it has one, and no image or tracking. Also the 404 page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { parse } from 'node-html-parser';
import { blogIsPublished, isDraft, readEntries, themesInOrder } from '../content-data.mjs';
import { REPO_ROOT, allHtmlFiles, loadPage, tidy } from '../helpers.mjs';

// The public address of the site, as astro.config.mjs sets it.
const SITE_URL = 'https://ekmungi.github.io';

/**
 * Turn a built file into its address on the site: "index.html" is "/", "blog/index.html" is "/blog/", "privacy.html" is "/privacy.html".
 * @param {string} file - an absolute path under dist/.
 * @returns {string} the route.
 */
function routeOf(file) {
  const path = relative(`${REPO_ROOT}/dist`, file).replaceAll('\\', '/');
  return `/${path.replace(/(^|\/)index\.html$/, '$1')}`;
}

/**
 * Read the description and Open Graph tags of a page.
 * @param {import('node-html-parser').HTMLElement} page - a parsed page.
 * @returns {Record<string, string[]>} each tag's values, so a tag written twice is visible.
 */
function metaOf(page) {
  const values = (selector) => page.querySelectorAll(selector).map((tag) => tag.getAttribute('content'));
  return {
    description: values('head meta[name="description"]'),
    title: values('head meta[property="og:title"]'),
    ogDescription: values('head meta[property="og:description"]'),
    url: values('head meta[property="og:url"]'),
    type: values('head meta[property="og:type"]'),
    image: values('head meta[property="og:image"]'),
  };
}

test('every page has one description and the four basic Open Graph tags, matching its title and its address', () => {
  const files = allHtmlFiles('dist');
  assert.ok(files.length > 5);
  for (const file of files) {
    const page = parse(readFileSync(file, 'utf8'));
    const route = routeOf(file);
    const meta = metaOf(page);
    assert.equal(meta.description.length, 1, `${route}: one meta description`);
    assert.ok(tidy(meta.description[0]).length > 0, `${route}: the description says something`);
    assert.deepEqual(meta.title, [page.querySelector('title').text], `${route}: og:title is the page title`);
    assert.deepEqual(meta.ogDescription, meta.description, `${route}: og:description is the description`);
    assert.deepEqual(meta.url, [`${SITE_URL}${route}`], `${route}: og:url is the page's address`);
    assert.deepEqual(meta.type, [route.startsWith('/blog/') && route !== '/blog/' && !route.startsWith('/blog/tags/') ? 'article' : 'website'], `${route}: og:type`);
    assert.deepEqual(meta.image, [], `${route}: no Open Graph image`);
  }
});

test('posts, projects and research themes are described by their own summary', () => {
  const pages = [
    ...readEntries('posts').filter((entry) => !isDraft(entry)).map(({ id, data }) => [`/blog/${id}/`, data.summary]),
    ...readEntries('projects').filter((entry) => !isDraft(entry)).map(({ id, data }) => [`/projects/${id}/`, data.summary]),
    ...themesInOrder().map(({ id, data }) => [`/profile/research/${id}/`, data.summary]),
  ];
  assert.ok(pages.length > 0);
  for (const [route, summary] of pages) assert.deepEqual(metaOf(loadPage('dist', route)).description, [summary], route);
});

test('the 404 page is built in the site\'s look and leads back to the landing page, and to the blog once a post is published', () => {
  const page = loadPage('dist', '/404.html');
  const main = page.querySelector('main');
  assert.equal(page.querySelector('title').text, 'Page not found | Anant Vemuri');
  assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), ['Page not found']);
  assert.ok(page.querySelector('header.top'), 'the top bar is there');
  assert.equal(page.querySelectorAll('footer').length, 1, 'the footer is there');
  const links = main.querySelectorAll('a').map((link) => link.getAttribute('href'));
  assert.ok(links.includes('/'), 'it links to the landing page');
  assert.equal(links.includes('/blog/'), blogIsPublished(), 'it links to the blog only once a post is published');
  assert.equal(page.querySelectorAll('[aria-current]').length, 0, 'no top-bar link is marked');
  assert.equal(page.querySelectorAll('script').length, 0, 'no script');
});
