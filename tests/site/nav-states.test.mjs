// Site tests for the top bar and frame markup on a page that is not the landing page (the privacy page is the first one).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, tidy } from '../helpers.mjs';
import { blogIsPublished, themesInOrder } from '../content-data.mjs';

// The links the design agreed for every page except the landing page (R13), written out as the expected result. The Blog link is
// part of them only once a post is published.
const FULL_NAV = [
  ['Home', '/', 'Back to the landing page'],
  ['Profile', '/profile/', 'Who I am: work, research, publications and education'],
  ['Projects', '/projects/', 'Research experiments and the software I build'],
  ...(blogIsPublished() ? [['Blog', '/blog/', 'What I write about AI in healthcare']] : []),
];

test('on the privacy page the top bar shows Home first, then Profile, Projects and, once a post is published, Blog', () => {
  const page = loadPage('dist', '/privacy.html');
  const links = page.querySelectorAll('header nav a');
  assert.deepEqual(
    links.map((link) => [tidy(link.text), link.getAttribute('href')]),
    FULL_NAV.map(([label, href]) => [label, href]),
  );
});

test('on the privacy page every link, Home included, has its hint wired by aria-describedby', () => {
  const page = loadPage('dist', '/privacy.html');
  const links = page.querySelectorAll('header nav a');
  assert.equal(links.length, FULL_NAV.length);
  links.forEach((link, index) => {
    const id = link.getAttribute('aria-describedby');
    assert.ok(id, `${FULL_NAV[index][0]} has aria-describedby`);
    const tip = page.querySelector(`#${id}`);
    assert.ok(tip && tip.classList.contains('tip'), `#${id} is a hint`);
    assert.equal(tidy(tip.text), FULL_NAV[index][2]);
  });
});

test('the name in the top bar of the privacy page links to the landing page', () => {
  const brand = loadPage('dist', '/privacy.html').querySelector('header a.brand');
  assert.ok(brand);
  assert.equal(brand.getAttribute('href'), '/');
  assert.equal(tidy(brand.text), 'Anant Vemuri');
});

test('a page outside the four sections marks no link as the current page', () => {
  for (const route of ['/privacy.html', '/']) {
    const page = loadPage('dist', route);
    assert.equal(page.querySelectorAll('[aria-current]').length, 0, `${route} has no aria-current`);
  }
});

test('the privacy page puts all of its text in one 12-column frame without adding a title of its own', () => {
  const main = loadPage('dist', '/privacy.html').querySelector('main');
  const frames = main.querySelectorAll('.frame');
  assert.equal(frames.length, 1, 'one frame');
  const [frame] = frames;
  assert.equal(frame.tagName, 'SECTION');
  assert.deepEqual(frame.getAttribute('class').split(/\s+/).sort(), ['frame', 's12']);
  // Frame writes an <h2> only when it is given a title; the policy's own headings are its only headings.
  assert.deepEqual(
    frame.querySelectorAll('h2').map((heading) => tidy(heading.text)),
    ['Privacy policy for Claude MCP Connect - Google Workspace'],
  );
  // <main> holds one .prose column, and that holds the h1 (the front-matter title) and then the frame with the whole markdown body.
  assert.deepEqual(main.children.map((child) => child.tagName), ['DIV'], '<main> has one element');
  assert.deepEqual(
    main.children[0].children.map((child) => child.tagName),
    ['H1', 'SECTION'],
    'the column is the h1 followed by the frame',
  );
});

test('the privacy page text sits in a reading-width column', () => {
  const main = loadPage('dist', '/privacy.html').querySelector('main');
  assert.ok(main.querySelector('.prose .frame'), 'the frame is inside the .prose column');
});

// The four research theme pages are subpages of the Profile section (Ruling 18).
const THEME_SLUGS = themesInOrder().map(({ id }) => id);

/**
 * List the top-bar links of a built page that carry aria-current, with its value.
 * @param {string} route - the site route to load from dist/.
 * @returns {string[][]} one [label, value] pair per marked link.
 */
function markedLinks(route) {
  return loadPage('dist', route)
    .querySelectorAll('header nav a[aria-current]')
    .map((link) => [tidy(link.text), link.getAttribute('aria-current')]);
}

test('on the profile page only the Profile link is marked, and its aria-current is "page"', () => {
  assert.deepEqual(markedLinks('/profile/'), [['Profile', 'page']]);
  assert.equal(loadPage('dist', '/profile/').querySelectorAll('[aria-current]').length, 1, 'nothing else on the page is marked');
});

test('on a research theme page only the Profile link is marked, and its aria-current is "true"', () => {
  for (const slug of THEME_SLUGS) {
    const route = `/profile/research/${slug}/`;
    assert.deepEqual(markedLinks(route), [['Profile', 'true']], route);
    assert.equal(loadPage('dist', route).querySelectorAll('[aria-current]').length, 1, `${route}: nothing else is marked`);
  }
});

test('the privacy page marks no top-bar link as current', () => {
  assert.deepEqual(markedLinks('/privacy.html'), []);
});
