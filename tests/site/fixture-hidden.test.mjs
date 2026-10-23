// Site tests on the fixture builds (npm run build:fixtures) for the rule "nothing unfinished is ever visible", one state at a time:
// nothing ready yet, the drafts build, a first published post, a photo, and a written story. Each fixture is built from invented content,
// so these states are checked whatever the real content is today.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { REPO_ROOT, allHtmlFiles, loadPage, tidy } from '../helpers.mjs';
import { FIXTURE_ROOT, fixtureOut } from '../fixture-build.mjs';
import { PUBLISHED_POST } from '../fixtures/definitions.mjs';
import { FIXTURE_PHOTO } from '../fixtures/photo.mjs';
import { WRITTEN_STORY } from '../fixtures/profile-text.mjs';
import { isJpeg, jpegMetadataKinds } from '../image-metadata.mjs';
import { draftTitles, placeholderHits, publishedPostPages, titleHits } from '../launch-scan.mjs';
import { brokenLinks, linksToBlog } from '../link-scan.mjs';

const NOTHING_READY = fixtureOut('unpublished');
const DRAFTS = fixtureOut('drafts');
const FIRST_POST = fixtureOut('published-post');
const WITH_PHOTO = fixtureOut('with-photo');
const WRITTEN = fixtureOut('story-written');

// The nav links and doors of the sections that are always there, and of the Blog, which waits for a first published post.
const PROFILE_AND_PROJECTS = [['Profile', '/profile/'], ['Projects', '/projects/']];
const BLOG = ['Blog', '/blog/'];

/** The top-bar links of a page as [label, address]. */
const navOf = (outDir, route = '/') => loadPage(outDir, route).querySelectorAll('header nav a').map((link) => [tidy(link.text), link.getAttribute('href')]);

/** The door links of the landing page as [label, address]. */
const doorsOf = (outDir) => loadPage(outDir, '/').querySelectorAll('main .door').map((door) => [tidy(door.querySelector('.door-title').text), door.getAttribute('href')]);

/** The column span of a frame, read from its "s<number>" class; null when it has none. */
const spanOf = (frame) => {
  const match = frame.classList.value.map((name) => /^s(\d+)$/.exec(name)).find(Boolean);
  return match ? Number(match[1]) : null;
};

/** The [heading, span] pairs of the frames inside <main> of the profile page. */
const profileFrames = (outDir) => loadPage(outDir, '/profile/').querySelectorAll('main .frame').map((frame) => [tidy(frame.querySelector('h2').text), spanOf(frame)]);

/** The links inside <main> of a page, as addresses. */
const mainLinks = (outDir, route) => loadPage(outDir, route).querySelectorAll('main a').map((link) => link.getAttribute('href'));

test('nothing ready: no page of the production build shows a placeholder or a draft title', () => {
  assert.deepEqual(placeholderHits(NOTHING_READY), []);
  const content = join(REPO_ROOT, FIXTURE_ROOT, 'unpublished', 'content');
  assert.ok(draftTitles(content).length > 0, 'the fixture does have draft titles that must stay out');
  assert.deepEqual(titleHits(NOTHING_READY, draftTitles(content)), []);
});

test('nothing ready: the landing page has a text-only hero and two evenly laid-out doors, Profile and Projects', () => {
  const page = loadPage(NOTHING_READY, '/');
  assert.deepEqual(doorsOf(NOTHING_READY), PROFILE_AND_PROJECTS);
  assert.match(page.querySelector('main .doors').getAttribute('style'), /--doors:\s*2\b/);
  assert.equal(page.querySelector('main .photo'), null, 'no photo slot');
  assert.ok(page.querySelector('main .hero').classList.contains('text-only'));
  assert.equal(page.querySelector('main .hero').children.length, 1, 'no empty column beside the text');
});

test('nothing ready: no top bar shows Blog and no page links to the blog, the 404 page and the privacy page included', () => {
  for (const file of allHtmlFiles(NOTHING_READY)) {
    const labels = parseNav(file);
    assert.ok(!labels.includes('Blog'), `${file} has no Blog link in its top bar`);
  }
  assert.deepEqual(linksToBlog(NOTHING_READY), []);
  assert.deepEqual(mainLinks(NOTHING_READY, '/404.html'), ['/'], 'the 404 page leads back to the landing page only');
});

test('nothing ready: the profile has no Story frame and At a glance uses the full row, with all five facts', () => {
  assert.deepEqual(profileFrames(NOTHING_READY).slice(0, 2), [['At a glance', 12], ['Experience', 12]]);
  const list = loadPage(NOTHING_READY, '/profile/').querySelector('dl.glance');
  assert.ok(list.classList.contains('wide'));
  assert.equal(list.querySelectorAll('dt').length, 5);
  assert.equal(list.querySelectorAll('dd').length, 5);
});

test('nothing ready: every link in the build leads to a page that is built', () => {
  assert.deepEqual(brokenLinks(NOTHING_READY), []);
});

test('the drafts build shows the unfinished parts: the photo slot, the Story frame and the Blog link, with two columns in the hero', () => {
  const landing = loadPage(DRAFTS, '/');
  const slot = landing.querySelector('main .photo');
  assert.equal(slot.getAttribute('data-placeholder'), 'photo');
  assert.equal(tidy(slot.text), 'Your photo');
  assert.ok(!landing.querySelector('main .hero').classList.contains('text-only'));
  assert.deepEqual(profileFrames(DRAFTS).slice(0, 2), [['Story', 8], ['At a glance', 4]]);
  assert.equal(loadPage(DRAFTS, '/profile/').querySelectorAll('main [data-placeholder="story"]').length, 1);
  assert.deepEqual(doorsOf(DRAFTS), [...PROFILE_AND_PROJECTS, BLOG]);
  assert.ok(!loadPage(DRAFTS, '/profile/').querySelector('dl.glance').classList.contains('wide'));
});

test('the launch checks find what the drafts build shows, so they are not blind', () => {
  const content = join(REPO_ROOT, FIXTURE_ROOT, 'drafts', 'content');
  const names = placeholderHits(DRAFTS).map((hit) => hit.split(': ').pop());
  for (const name of ['photo', 'story', 'fixture-research']) assert.ok(names.includes(name), `a placeholder named ${name} is found`);
  assert.ok(titleHits(DRAFTS, draftTitles(content)).length > 0, 'a draft title is found');
});

test('a first published post makes Blog appear in the top bar of every page and as a third door', () => {
  assert.deepEqual(doorsOf(FIRST_POST), [...PROFILE_AND_PROJECTS, BLOG]);
  assert.match(loadPage(FIRST_POST, '/').querySelector('main .doors').getAttribute('style'), /--doors:\s*3\b/);
  for (const file of allHtmlFiles(FIRST_POST)) assert.ok(parseNav(file).includes('Blog'), `${file} has a Blog link in its top bar`);
  assert.ok(navOf(FIRST_POST, '/profile/').some(([label, href]) => label === 'Blog' && href === '/blog/'));
  assert.ok(mainLinks(FIRST_POST, '/404.html').includes('/blog/'), 'the 404 page leads to the blog');
});

test('a first published post has its own page, a tag page and a place in the list, and everything else stays hidden', () => {
  assert.deepEqual(publishedPostPages(FIRST_POST), [`blog/${PUBLISHED_POST.slug}/index.html`]);
  assert.equal(tidy(loadPage(FIRST_POST, `/blog/${PUBLISHED_POST.slug}/`).querySelector('main h1').text), PUBLISHED_POST.title);
  assert.ok(loadPage(FIRST_POST, `/blog/tags/${PUBLISHED_POST.tagSlug}/`).querySelector('main h1'), 'the tag page exists');
  assert.deepEqual(
    loadPage(FIRST_POST, '/blog/').querySelectorAll('main .posts .post .post-title').map((title) => tidy(title.text)),
    [PUBLISHED_POST.title],
  );
  assert.deepEqual(placeholderHits(FIRST_POST), []);
  assert.deepEqual(brokenLinks(FIRST_POST), []);
  assert.equal(loadPage(FIRST_POST, '/').querySelector('main .photo'), null, 'still no photo slot');
  assert.deepEqual(profileFrames(FIRST_POST).slice(0, 1), [['At a glance', 12]], 'still no Story frame');
});

test('a photo file makes the photo slot appear with the image, and nothing else changes', () => {
  const page = loadPage(WITH_PHOTO, '/');
  const slot = page.querySelector('main .photo');
  const image = slot.querySelector('img');
  assert.equal(image.getAttribute('src'), '/images/photo.jpg');
  assert.equal(image.getAttribute('alt'), 'Portrait of Anant Vemuri');
  assert.equal(slot.getAttribute('data-placeholder'), undefined);
  assert.ok(!page.querySelector('main .hero').classList.contains('text-only'));
  assert.deepEqual(doorsOf(WITH_PHOTO), PROFILE_AND_PROJECTS, 'the photo does not bring the blog');
  assert.deepEqual(placeholderHits(WITH_PHOTO), []);
});

test('the photo of the photo fixture is copied into the build unchanged and carries no metadata', () => {
  const built = join(REPO_ROOT, WITH_PHOTO, 'images', 'photo.jpg');
  assert.ok(existsSync(built), 'the photo is in the build');
  const bytes = readFileSync(built);
  assert.ok(bytes.equals(FIXTURE_PHOTO));
  assert.ok(isJpeg(bytes));
  assert.deepEqual(jpegMetadataKinds(bytes), []);
});

test('a written story makes the Story frame appear beside At a glance', () => {
  assert.deepEqual(profileFrames(WRITTEN).slice(0, 3), [['Story', 8], ['At a glance', 4], ['Experience', 12]]);
  const page = loadPage(WRITTEN, '/profile/');
  const story = page.querySelectorAll('main .frame').find((frame) => tidy(frame.querySelector('h2').text) === 'Story');
  assert.deepEqual(story.querySelectorAll('p').map((paragraph) => tidy(paragraph.text)), [WRITTEN_STORY]);
  assert.ok(!page.querySelector('dl.glance').classList.contains('wide'));
  assert.deepEqual(placeholderHits(WRITTEN), []);
});

/**
 * Read the top-bar labels of a built page file.
 * @param {string} file - an absolute path to a built HTML file.
 * @returns {string[]} the labels of the links in the top bar, in order.
 */
function parseNav(file) {
  return parse(readFileSync(file, 'utf8')).querySelectorAll('header nav a').map((link) => tidy(link.text));
}
