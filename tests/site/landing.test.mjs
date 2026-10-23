// Site tests for the landing page (/) on the production build in dist/: content, the doors, the photo slot and how the door hints show.
// Which parts are ready (a published post, the photo file) is read from the content, so the tests keep passing as those parts arrive;
// fixed states are tested on fixture builds in fixture-hidden.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blogIsPublished, photoExists } from '../content-data.mjs';
import { loadPage, tidy } from '../helpers.mjs';
import { builtCss, flatRules } from '../css-helpers.mjs';
import { SITE } from '../../src/data/site.ts';

// What the design agreed for the doors and their hints (R13, R14), written out here on purpose: the doors reuse the top-bar hints, and the
// expected result must not be read back from the code under test. The Blog door waits for a first published post.
const DOORS = [
  ['Profile', '/profile/', 'Who I am: work, research, publications and education'],
  ['Projects', '/projects/', 'Research experiments and the software I build'],
  ...(blogIsPublished() ? [['Blog', '/blog/', 'What I write about AI in healthcare']] : []),
];

// The small links under the doors, as the site data sets them: LinkedIn and GitHub always, Google Scholar once its address is set.
const ELSEWHERE = [
  ['LinkedIn', SITE.links.linkedin],
  ['GitHub', SITE.links.github],
  ...(SITE.links.scholar ? [['Google Scholar', SITE.links.scholar]] : []),
];

/**
 * Collect every style rule that applies to the landing page: the built .css files plus any <style> the build inlined into the page.
 * Astro's scoping attributes ([data-astro-cid-...]) are removed from the selectors so a test can write plain ".door .hint".
 * @param {import('node-html-parser').HTMLElement} page - the parsed landing page.
 * @returns {{ selector: string, body: string, context: string[] }[]} the flattened rules, in stylesheet order.
 */
function landingRules(page) {
  const inline = page.querySelectorAll('style').map((style) => style.text).join('\n');
  return flatRules(`${builtCss('dist')}\n${inline}`).map((rule) => ({
    ...rule,
    selector: rule.selector.replace(/\[[^\]]*\]/g, ''),
  }));
}

/** The selector parts of a rule, trimmed: "a, b" gives ["a", "b"]. */
const parts = (rule) => rule.selector.split(',').map((part) => part.trim());

/** True when a rule's body turns a hint's opacity to the given value. */
const setsOpacity = (rule, value) => new RegExp(`opacity\\s*:\\s*${value}(?![\\d.])`).test(rule.body);

test('landing shows a door link for Profile and Projects, and for Blog once a post is published', () => {
  const doors = loadPage('dist', '/').querySelectorAll('main .door');
  assert.equal(doors.length, DOORS.length);
  assert.deepEqual(
    doors.map((door) => door.getAttribute('href')),
    DOORS.map(([, href]) => href),
  );
  assert.deepEqual(
    doors.map((door) => tidy(door.querySelector('.door-title').text)),
    DOORS.map(([label]) => label),
  );
});

test('the doors are laid out in as many equal columns as there are doors, and stack below 860 px', () => {
  const page = loadPage('dist', '/');
  const row = page.querySelector('main .doors');
  assert.match(row.getAttribute('style') ?? '', new RegExp(`--doors:\\s*${DOORS.length}\\b`), 'the row says how many doors it holds');
  const rules = landingRules(page);
  const base = rules.find((r) => r.context.length === 0 && parts(r).includes('.doors'));
  assert.ok(base, 'there is a base .doors rule');
  assert.match(base.body, /grid-template-columns\s*:\s*repeat\(\s*var\(--doors[^)]*\)\s*,\s*minmax\(0,\s*1fr\)\s*\)/, 'equal columns, one per door');
  const narrow = rules.find((r) => r.context.some((c) => /max-width:\s*860px/.test(c)) && parts(r).includes('.doors'));
  assert.ok(narrow && /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)(?!\s+\d)/.test(narrow.body), 'one column on a narrow screen');
});

test('each door has a hint, the same one the top bar shows, wired to the link', () => {
  const page = loadPage('dist', '/');
  const doors = page.querySelectorAll('main .door');
  assert.equal(doors.length, DOORS.length);
  doors.forEach((door, index) => {
    const [label, href, hint] = DOORS[index];
    assert.equal(door.getAttribute('href'), href);
    const hintElement = door.querySelector('.hint');
    assert.ok(hintElement, `${label} door has a hint`);
    assert.equal(tidy(hintElement.text), hint);
    // The link is named by its title and described by its hint, so a screen reader does not read the hint twice.
    assert.equal(door.getAttribute('aria-describedby'), hintElement.getAttribute('id'));
    assert.equal(door.getAttribute('aria-labelledby'), door.querySelector('.door-title').getAttribute('id'));
  });
});

test('landing shows the name, the role and the two background paragraphs', () => {
  const main = loadPage('dist', '/').querySelector('main');
  assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), [SITE.name]);
  assert.equal(tidy(main.querySelector('.role').text), SITE.role);
  assert.ok(tidy(main.querySelector('.intro').text).length > 0, 'the introduction is there');
  assert.ok(tidy(main.querySelector('.background').text).length > 0, 'the background line is there');
});

test('landing shows the small links under the doors that the site data sets', () => {
  const links = loadPage('dist', '/').querySelectorAll('main .elsewhere a');
  assert.deepEqual(links.map((link) => [tidy(link.text), link.getAttribute('href')]), ELSEWHERE);
});

test('the page links to Google Scholar exactly once when its address is set, and not at all while it is unset', () => {
  const page = loadPage('dist', '/');
  const scholar = page.querySelectorAll('a').filter((link) => /scholar/i.test(`${link.text} ${link.getAttribute('href')}`));
  assert.deepEqual(scholar.map((link) => link.getAttribute('href')), SITE.links.scholar ? [SITE.links.scholar] : []);
});

test('landing has no project or post listings', () => {
  const main = loadPage('dist', '/').querySelector('main');
  assert.equal(main.querySelectorAll('.tile').length, 0);
  assert.equal(main.querySelectorAll('.post').length, 0);
});

test('landing works without JavaScript: the page ships no script', () => {
  assert.equal(loadPage('dist', '/').querySelectorAll('script').length, 0);
});

test('the photo slot shows the photo when its file exists, and is left out altogether when it does not', () => {
  const page = loadPage('dist', '/');
  const slot = page.querySelector('main .photo');
  const hero = page.querySelector('main .hero');
  assert.equal(page.querySelectorAll('[data-placeholder]').length, 0, 'a production page never shows a placeholder');
  if (photoExists()) {
    assert.equal(slot.querySelector('img').getAttribute('src'), '/images/photo.jpg');
    assert.equal(slot.getAttribute('data-placeholder'), undefined);
    assert.ok(!hero.classList.contains('text-only'), 'the hero keeps its photo column');
  } else {
    assert.equal(slot, null, 'no photo slot while the file is missing');
    assert.equal(page.querySelectorAll('main img').length, 0, 'no image is requested while the file is missing');
    assert.ok(hero.classList.contains('text-only'), 'the hero is marked as text only');
    assert.equal(hero.children.length, 1, 'the hero holds the text block alone, so there is no empty column');
    assert.equal(tidy(hero.querySelector('h1').text), SITE.name);
  }
});

test('a text-only hero is a single full-width column', () => {
  const rules = landingRules(loadPage('dist', '/'));
  const base = rules.find((r) => r.context.length === 0 && parts(r).includes('.hero'));
  assert.match(base.body, /grid-template-columns\s*:\s*260px\s+minmax\(0,\s*1fr\)/, 'the hero with a photo has the 260 px photo column');
  const textOnly = rules.find((r) => r.context.length === 0 && parts(r).includes('.hero.text-only'));
  assert.ok(textOnly, 'there is a .hero.text-only rule');
  assert.match(textOnly.body, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)(?!\s+\d)/, 'one column, no room kept for a photo');
});

test('the photo slot is 4:5 and 260 px wide', () => {
  const page = loadPage('dist', '/');
  const rule = landingRules(page).find((r) => r.context.length === 0 && parts(r).includes('.photo'));
  assert.ok(rule, 'there is a base .photo rule');
  assert.match(rule.body, /aspect-ratio\s*:\s*4\s*\/\s*5/);
  assert.match(rule.body, /width\s*:\s*260px/);
});

test('door hints show on hover and keyboard focus, and stay shown on touch screens', () => {
  const rules = landingRules(loadPage('dist', '/'));
  const hintRules = rules.filter((r) => parts(r).some((part) => /\.hint$/.test(part)));

  // Hidden by default so that a device with a pointer shows a hint only on hover or focus.
  const base = hintRules.find((r) => r.context.length === 0 && parts(r).includes('.door .hint'));
  assert.ok(base, 'there is a base ".door .hint" rule');
  assert.ok(setsOpacity(base, '0'), 'the base rule hides the hint');

  const hover = hintRules.find((r) => r.context.length === 0 && parts(r).some((p) => /:hover\b/.test(p)));
  assert.ok(hover && setsOpacity(hover, '1'), 'hovering a door shows its hint');
  const focus = hintRules.find((r) => r.context.length === 0 && parts(r).some((p) => /:focus/.test(p)));
  assert.ok(focus && setsOpacity(focus, '1'), 'keyboard focus on a door shows its hint');

  // On a device with no hover the hint is shown all the time, and the rule comes after the base rule so it wins.
  const touch = hintRules.find(
    (r) => r.context.some((c) => /\(\s*hover\s*:\s*none\s*\)/.test(c)) && parts(r).includes('.door .hint'),
  );
  assert.ok(touch, 'there is a ".door .hint" rule under (hover: none)');
  assert.ok(setsOpacity(touch, '1'), 'under (hover: none) the hint is shown');
  assert.ok(rules.indexOf(touch) > rules.indexOf(base), 'the (hover: none) rule comes after the base rule');
});
