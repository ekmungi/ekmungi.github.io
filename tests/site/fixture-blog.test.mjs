// Site tests for the blog on the fixture builds (npm run build:fixtures): the page with nothing published, and a known set of draft posts
// whose order, tag frame, tag pages and pills are written out here as the expected result.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, loadPage, tidy } from '../helpers.mjs';
import { builtCss, flatRules } from '../css-helpers.mjs';
import { fixtureOut } from '../fixture-build.mjs';
import { DRAFT_FRAME, DRAFT_POSTS, DRAFT_TAG_PAGES } from '../fixtures/definitions.mjs';

const UNPUBLISHED = fixtureOut('unpublished');
const DRAFTS = fixtureOut('drafts');

/** The title links of the posts listed on a built page, in page order. */
const listedTitles = (page) => page.querySelectorAll('main .posts .post .post-title').map((title) => tidy(title.text));

/** The tag frame's links as [name, address, count]. */
const frameRows = (page) =>
  page.querySelectorAll('main .tagframe li a').map((link) => [tidy(link.querySelector('.tag-name').text), link.getAttribute('href'), Number(tidy(link.querySelector('.tag-count').text))]);

/** The pills of one element as [label, slug] pairs. */
const pillsIn = (element) => element.querySelectorAll('.pills a.pill').map((pill) => [tidy(pill.text), pill.getAttribute('href').replace(/^\/blog\/tags\/|\/$/g, '')]);

test('with no post published, /blog/ shows only its title and lede: no tag frame, no list and no placeholder', () => {
  const page = loadPage(UNPUBLISHED, '/blog/');
  const main = page.querySelector('main');
  assert.equal(page.querySelector('title').text, 'Blog | Anant Vemuri');
  assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), ['Blog']);
  assert.ok(tidy(main.querySelector('.lede').text).length > 0, 'the lede is there');
  assert.equal(main.querySelectorAll('.tagframe, .post, .posts, .blog, .frame, aside, [data-placeholder]').length, 0, 'nothing but the title and lede');
  // The page is built, but the top bar has no Blog link while no post is published, so there is no link to mark.
  assert.equal(page.querySelectorAll('[aria-current]').length, 0, 'nothing is marked');
});

test('with no post published, a draft post has no page and its tag has no page', () => {
  assert.throws(() => loadPage(UNPUBLISHED, '/blog/fixture-draft-post/'), /not found/);
  assert.ok(!existsSync(join(REPO_ROOT, UNPUBLISHED, 'blog', 'tags')), 'no tag pages at all');
});

test('the drafts fixture lists its posts newest first, posts of one day A to Z, each with date, linked title, summary and pills', () => {
  const cards = loadPage(DRAFTS, '/blog/').querySelectorAll('main .posts article.post');
  assert.equal(cards.length, DRAFT_POSTS.length);
  cards.forEach((card, index) => {
    const expected = DRAFT_POSTS[index];
    const link = card.querySelector('.post-title a');
    assert.equal(link.getAttribute('href'), `/blog/${expected.slug}/`);
    assert.equal(tidy(link.text), expected.title);
    assert.equal(card.querySelector('time').getAttribute('datetime'), expected.datetime);
    assert.equal(tidy(card.querySelector('time').text), expected.shown);
    assert.equal(tidy(card.querySelector('.summary').text), 'Fixture summary.');
    assert.deepEqual(pillsIn(card), expected.pills, `${expected.slug}: a tag repeated in another spelling shows once`);
  });
});

test('the tag frame merges spellings, counts each post once and orders tags by count, then A to Z', () => {
  assert.deepEqual(frameRows(loadPage(DRAFTS, '/blog/')), DRAFT_FRAME);
});

test('a new tag needs no registering: its page exists, lists only its posts and marks it current in the frame', () => {
  for (const [slug, titles] of Object.entries(DRAFT_TAG_PAGES)) {
    const route = `/blog/tags/${slug}/`;
    const page = loadPage(DRAFTS, route);
    assert.deepEqual(listedTitles(page), titles, route);
    assert.deepEqual(frameRows(page), DRAFT_FRAME, `${route}: the frame is the same on every blog page`);
    const current = page.querySelectorAll('main .tagframe a[aria-current]').map((link) => [link.getAttribute('href'), link.getAttribute('aria-current')]);
    assert.deepEqual(current, [[route, 'page']], route);
  }
});

test('the post list comes first in the page and the tag frame after it (the frame sits on the right)', () => {
  const blog = loadPage(DRAFTS, '/blog/').querySelector('main .blog');
  assert.deepEqual(blog.children.map((child) => child.classList.value.find((name) => name === 'posts' || name === 'tagframe')), ['posts', 'tagframe']);
});

test('a post with two paragraphs shows both in its body', () => {
  const main = loadPage(DRAFTS, '/blog/fixture-oldest/').querySelector('main');
  assert.deepEqual(main.querySelectorAll('.post-body p').map((p) => tidy(p.text)), ['First paragraph.', 'Second paragraph.']);
});

test('on narrow screens the tag frame moves above the posts, and on wide ones it is the right-hand column', () => {
  // The build writes the shared stylesheet to a .css file and inlines a component's own styles into the page, so both are read.
  const inline = loadPage(DRAFTS, '/blog/').querySelectorAll('style').map((style) => style.text).join('\n');
  // Astro's scoping attributes ([data-astro-cid-...]) are removed from the selectors so the test can write plain ".tagframe".
  const rules = flatRules(`${builtCss(DRAFTS)}\n${inline}`).map((rule) => ({ ...rule, selector: rule.selector.replace(/\[[^\]]*\]/g, '') }));
  const narrow = (rule) => rule.context.some((condition) => /max-width:\s*860px/.test(condition));
  const above = rules.filter((rule) => narrow(rule) && /(^|,)\s*\.tagframe\s*(,|$)/.test(rule.selector) && /order\s*:\s*-1/.test(rule.body));
  assert.equal(above.length, 1, 'one rule under a 860 px media condition gives .tagframe order: -1');
  const wide = rules.find((rule) => rule.context.length === 0 && /^\.blog$/.test(rule.selector));
  assert.ok(wide, 'a base .blog rule exists');
  assert.match(wide.body, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)\s+270px/, 'posts take the room, the tag frame is 270 px on the right');
  const single = rules.find((rule) => narrow(rule) && rule.selector.split(',').some((part) => part.trim() === '.blog'));
  assert.ok(single, 'a rule under the narrow condition makes .blog one column');
  assert.match(single.body, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)(?!\s+\d)/, 'one column');
});
