// Site tests for the rule "nothing unfinished is ever visible" on the real builds. A production build (dist/) never contains a placeholder, a
// draft or example title, a link to a page that is not built, or a link to the blog while no post is published; the drafts build (dist-test/)
// still shows what production hides, so the author sees what is missing. What each build must show is read from the content, so the tests
// keep passing as the photo, the story and the first post arrive; fixed states are tested on fixture builds in fixture-hidden.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { CONTENT_DIR, blogIsPublished, photoExists, readEntries, storyIsWritten } from '../content-data.mjs';
import { allHtmlFiles, loadPage, tidy } from '../helpers.mjs';
import { draftTitles, exampleTitles, placeholderHits, titleHits } from '../launch-scan.mjs';
import { brokenLinks, linksToBlog } from '../link-scan.mjs';

test('the production build has no [data-placeholder] element on any page', () => {
  assert.deepEqual(placeholderHits('dist'), []);
});

test('the production build shows no draft title, no example title and no "Example:" text on any page', () => {
  assert.deepEqual(titleHits('dist', [...draftTitles(CONTENT_DIR), ...exampleTitles(CONTENT_DIR)]), []);
  for (const file of allHtmlFiles('dist')) {
    const text = tidy(parse(readFileSync(file, 'utf8')).querySelector('body').text);
    assert.ok(!/\bExample:/.test(text), `${file} has no "Example:" text`);
  }
});

test('the production build links to the blog only once a post is published', () => {
  const hits = linksToBlog('dist');
  if (blogIsPublished()) assert.ok(hits.length > 0, 'a published post makes the Blog link appear');
  else assert.deepEqual(hits, [], 'no page links to the blog while no post is published');
});

test('every link in the production build leads to a page or file that is built', () => {
  assert.deepEqual(brokenLinks('dist'), []);
});

test('the drafts build still shows the unfinished photo slot and the unfinished story, so the author can see what is missing', () => {
  const landing = loadPage('dist-test', '/');
  const slot = landing.querySelector('main .photo');
  assert.ok(slot, 'the drafts build has a photo slot');
  if (photoExists()) assert.equal(slot.getAttribute('data-placeholder'), undefined);
  else {
    assert.equal(slot.getAttribute('data-placeholder'), 'photo');
    assert.equal(tidy(slot.text), 'Your photo');
  }
  const story = loadPage('dist-test', '/profile/')
    .querySelectorAll('main .frame')
    .find((frame) => tidy(frame.querySelector('h2').text) === 'Story');
  assert.ok(story, 'the drafts build has a Story frame');
  assert.equal(story.querySelectorAll('[data-placeholder]').length, storyIsWritten() ? 0 : 1);
});

test('the drafts build shows the Blog link as soon as any post exists, draft or not', () => {
  const links = loadPage('dist-test', '/').querySelectorAll('header nav a').map((link) => link.getAttribute('href'));
  assert.equal(links.includes('/blog/'), readEntries('posts').length > 0);
});
