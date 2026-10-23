// Site tests for the page shell (top bar, footer, fonts, link styles and breakpoints) on the production build in dist/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { parse } from 'node-html-parser';
import { blogIsPublished } from '../content-data.mjs';
import { allHtmlFiles, loadPage, tidy, REPO_ROOT } from '../helpers.mjs';
import { builtCss, filesUnder, flatRules, navListWraps, tipProblems } from '../css-helpers.mjs';

// The one-line hints the design agreed for each top-bar link (requirement R14), written out here on
// purpose: they are the expected result, so they must not be read back from the code under test.
const HINTS = {
  '/profile/': 'Who I am: work, research, publications and education',
  '/projects/': 'Research experiments and the software I build',
  '/blog/': 'What I write about AI in healthcare',
};

// The Blog link waits for a first published post, so the links the top bar must show are read from the post files.
const BLOG_LIVE = blogIsPublished();

test('home page has no Home link in the top bar, and a Blog link only once a post is published', () => {
  const page = loadPage('dist', '/');
  const labels = page.querySelectorAll('header nav a').map((link) => tidy(link.text));
  assert.deepEqual(labels, ['Profile', 'Projects', ...(BLOG_LIVE ? ['Blog'] : [])]);
  const hrefs = page.querySelectorAll('header nav a').map((link) => link.getAttribute('href'));
  assert.deepEqual(hrefs, ['/profile/', '/projects/', ...(BLOG_LIVE ? ['/blog/'] : [])]);
});

test('every page of the production build shows the same sections in its top bar: Home, Profile, Projects, and Blog only once a post is published', () => {
  for (const file of allHtmlFiles('dist')) {
    const page = parse(readFileSync(file, 'utf8'));
    const labels = page.querySelectorAll('header nav a').map((link) => tidy(link.text));
    // The landing page leaves Home out, because it is already there.
    const isLanding = file.endsWith(`${sep}dist${sep}index.html`);
    assert.deepEqual(labels, [...(isLanding ? [] : ['Home']), 'Profile', 'Projects', ...(BLOG_LIVE ? ['Blog'] : [])], file);
  }
});

test('the name in the top bar links to the landing page', () => {
  const page = loadPage('dist', '/');
  const brand = page.querySelector('header a.brand');
  assert.ok(brand, 'header has a name link');
  assert.equal(tidy(brand.text), 'Anant Vemuri');
  assert.equal(brand.getAttribute('href'), '/');
});

test('every nav link has a hint wired by aria-describedby', () => {
  const page = loadPage('dist', '/');
  const links = page.querySelectorAll('header nav a');
  assert.ok(links.length > 0, 'the top bar has nav links');
  const ids = new Set();
  for (const link of links) {
    const href = link.getAttribute('href');
    const id = link.getAttribute('aria-describedby');
    assert.ok(id, `link ${href} has aria-describedby`);
    assert.ok(!ids.has(id), `hint id ${id} is used once`);
    ids.add(id);
    const tip = page.querySelector(`#${id}`);
    assert.ok(tip, `hint element #${id} exists`);
    assert.equal(tip.tagName, 'SPAN');
    assert.ok(tip.classList.contains('tip'), `#${id} has class tip`);
    assert.equal(tidy(tip.text), HINTS[href], `hint text for ${href}`);
  }
});

test('footer holds only the copyright and the privacy link', () => {
  const page = loadPage('dist', '/');
  const footers = page.querySelectorAll('footer');
  assert.equal(footers.length, 1);
  const links = footers[0].querySelectorAll('a');
  assert.equal(links.length, 1);
  assert.equal(links[0].getAttribute('href'), '/privacy.html');
  assert.equal(tidy(footers[0].text), `© ${new Date().getFullYear()} Anant Vemuri Privacy policy`);
});

test('no page requests Google Fonts', () => {
  const dist = resolve(REPO_ROOT, 'dist');
  const html = allHtmlFiles('dist');
  const css = filesUnder(dist).filter((file) => file.endsWith('.css'));
  assert.ok(html.length > 0, 'the build has HTML pages');
  assert.ok(css.length > 0, 'the build has CSS files');
  for (const file of [...html, ...css]) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(text), `${file} names a Google Fonts host`);
  }
});

test('Fira Sans files are served from the site', () => {
  const dist = resolve(REPO_ROOT, 'dist');
  const fonts = filesUnder(dist).filter((file) => file.endsWith('.woff2'));
  assert.ok(fonts.length > 0, 'dist contains .woff2 files');
  for (const weight of [400, 500, 600]) {
    const pattern = new RegExp(`fira-sans-latin-${weight}-normal.*\\.woff2$`);
    assert.ok(fonts.some((file) => pattern.test(file)), `Fira Sans latin ${weight} is in dist`);
  }
});

test('top-bar hints are hidden by default and shown only on hover or keyboard focus', () => {
  const css = builtCss('dist');
  // Not vacuous: the hover and focus rules that reveal a hint exist in the built CSS.
  assert.match(css, /:hover\s+\.tip[^{]*\{[^}]*display:\s*block/, 'a :hover rule shows the hint');
  assert.match(css, /:focus-within\s+\.tip[^{]*\{[^}]*display:\s*block/, 'a :focus-within rule shows the hint');
  // The pin: the base .tip rule is display: none, and no rule in any media condition
  // (touch, no-hover, pointer: coarse, phone width, print...) shows a hint without hover or focus.
  assert.deepEqual(tipProblems(css), []);
});

test('the nav list wraps, so four links never push the page sideways on a narrow phone', () => {
  assert.equal(navListWraps(builtCss('dist')), true);
});

/**
 * Collect the style rules of the production build that sit under no media condition, with Astro's scoping attributes removed from the
 * selectors (other attribute selectors, such as [aria-current], are kept) and the selectors written without spaces around ">".
 * @returns {{ selector: string, body: string }[]} the rules, in stylesheet order, files first and then the styles inlined into pages.
 */
function baseRules() {
  const inline = allHtmlFiles('dist').flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]));
  return flatRules([builtCss('dist'), ...inline].join('\n'))
    .filter((rule) => rule.context.length === 0)
    .map((rule) => ({ ...rule, selector: rule.selector.replace(/\[data-astro-cid-[^\]]*\]/g, '').replace(/\s*>\s*/g, '>') }));
}

/** True when a rule's selector list holds the given selector. */
const selects = (rule, selector) => rule.selector.split(',').map((part) => part.trim()).includes(selector);

test('links inside running text are underlined without hover, so colour is not the only sign of a link (WCAG 1.4.1)', () => {
  const rules = baseRules();
  for (const selector of ['.frame p a', '.frame li a', '.post-body a', '.prose a']) {
    const rule = rules.find((candidate) => selects(candidate, selector) && /text-decoration(-line)?\s*:\s*underline/.test(candidate.body));
    assert.ok(rule, `a base rule underlines "${selector}"`);
  }
});

test('the current top-bar link is marked by weight and an underline as well as colour, and keeps them on hover', () => {
  const rules = baseRules();
  const current = rules.findLastIndex((rule) => selects(rule, '.nav>a[aria-current]'));
  assert.ok(current !== -1, 'a base rule styles the current top-bar link');
  assert.match(rules[current].body, /font-weight\s*:\s*[5-9]00/, 'a heavier weight');
  assert.match(rules[current].body, /text-decoration(-line)?\s*:\s*underline/, 'an underline');
  const hover = rules.findLastIndex((rule) => selects(rule, '.nav>a:hover'));
  assert.ok(hover < current, 'the hover rule comes first, so hovering the current link does not remove its underline');
});

test('width breakpoints ship as max-width, never as the range syntax Safari before 16.4 ignores', () => {
  // The stylesheet files and the styles the build inlines into each page are both read.
  const inline = allHtmlFiles('dist').flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]));
  const css = [builtCss('dist'), ...inline].join('\n');
  const conditions = [...css.matchAll(/@media([^{]*)\{/g)].map((match) => match[1].trim());
  assert.ok(conditions.some((condition) => /\(max-width:\s*860px\)/.test(condition)), 'the 860 px breakpoint is written as max-width');
  assert.deepEqual(conditions.filter((condition) => /\(\s*(min-|max-)?(width|height)\s*[<>=]/.test(condition)), [], 'no media condition uses range syntax');
});
