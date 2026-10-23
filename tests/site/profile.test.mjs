// Site tests for the profile page (/profile/) and the research theme pages, on the production build in dist/ and, for the unfinished story, on the drafts build in dist-test/.
// The frame layout is the agreed design (R10) and is written out here; everything the frames list is derived from src/content/profile and
// src/content/research, so the tests keep passing as the story is written and papers or themes are added.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileEntry, storyIsWritten, themesInOrder } from '../content-data.mjs';
import { loadPage, tidy } from '../helpers.mjs';

const PROFILE = profileEntry();
const THEMES = themesInOrder();

// The Story frame appears in a production build once the story is written. Until then At a glance takes the whole row.
const STORY_WRITTEN = storyIsWritten();

// The frames of the profile page in the order and with the column spans agreed in R10 (and, while the story is unwritten, At a glance on the full row).
const FRAMES = [
  ...(STORY_WRITTEN ? [['Story', 8], ['At a glance', 4]] : [['At a glance', 12]]),
  ['Experience', 12],
  ['Research', 12],
  ['Publications and patents', 7],
  ['Mentoring and community', 5],
];

// The labels of the At a glance frame, in order, and the profile field each one shows.
const GLANCE = [
  ['Now', 'now'],
  ['Based in', 'basedIn'],
  ['Experience', 'experience'],
  ['Education', 'education'],
  ['Languages', 'languages'],
];

// Every profile page, for checks that apply to all of them.
const PROFILE_PAGES = ['/profile/', ...THEMES.map((theme) => `/profile/research/${theme.id}/`)];

/** The column span of a frame, read from its "s<number>" class; null when it has none. */
const spanOf = (frame) => {
  const match = frame.classList.value.map((name) => /^s(\d+)$/.exec(name)).find(Boolean);
  return match ? Number(match[1]) : null;
};

/** The frames inside <main> of a built page. */
const framesOf = (route, outDir = 'dist') => loadPage(outDir, route).querySelectorAll('main .frame');

/** The frame of /profile/ with the given heading. */
const frame = (heading, outDir = 'dist') => framesOf('/profile/', outDir).find((candidate) => tidy(candidate.querySelector('h2').text) === heading);

/**
 * Check a list of papers or publications against its entries: the same titles in order, a link exactly where an address is given,
 * and a lang attribute on the title where the entry names its language.
 * @param {import('node-html-parser').HTMLElement[]} items - the <li> elements.
 * @param {{ title: string, url?: string, lang?: string, translation?: string }[]} entries - the entries from the content file.
 * @param {string} where - names the list in failure messages.
 * @returns {void}
 */
function checkPaperList(items, entries, where) {
  assert.equal(items.length, entries.length, `${where}: one item per entry`);
  items.forEach((item, index) => {
    const { title, url, lang, translation } = entries[index];
    assert.equal(tidy(item.text), tidy(translation ? `${title} [${translation}]` : title), `${where} item ${index + 1}`);
    assert.equal(item.querySelector('a')?.getAttribute('href') ?? null, url ?? null, `${where} item ${index + 1}: a link only where an address is given`);
    if (lang) assert.equal(item.querySelector(`[lang="${lang}"]`) && tidy(item.querySelector(`[lang="${lang}"]`).text), tidy(title), `${where} item ${index + 1}: the title carries lang="${lang}"`);
  });
}

test('profile frames appear in the R10 order with the R10 spans', () => {
  assert.deepEqual(
    framesOf('/profile/').map((candidate) => [tidy(candidate.querySelector('h2').text), spanOf(candidate)]),
    FRAMES,
  );
});

test('profile has one h1 and no side menu', () => {
  const main = loadPage('dist', '/profile/').querySelector('main');
  assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), ['Profile']);
  assert.equal(main.querySelectorAll('nav').length, 0, 'no <nav> inside <main>');
});

test('the production build has a Story frame only once the story is written, and never a placeholder', () => {
  const story = frame('Story');
  assert.equal(loadPage('dist', '/profile/').querySelectorAll('[data-placeholder]').length, 0, 'no placeholder on the page');
  if (STORY_WRITTEN) {
    assert.ok(story.querySelectorAll('p').length >= 1, 'the story has text');
  } else {
    assert.equal(story, undefined, 'no Story frame while the story is unwritten');
  }
});

test('the drafts build shows the Story frame beside At a glance even while the story is a placeholder, so the author sees what is missing', () => {
  const frames = framesOf('/profile/', 'dist-test').map((candidate) => [tidy(candidate.querySelector('h2').text), spanOf(candidate)]);
  assert.deepEqual(frames.slice(0, 2), [['Story', 8], ['At a glance', 4]]);
  const paragraphs = frame('Story', 'dist-test').querySelectorAll('p');
  if (STORY_WRITTEN) {
    assert.equal(frame('Story', 'dist-test').querySelectorAll('[data-placeholder]').length, 0, 'a written story has no placeholder');
  } else {
    assert.equal(paragraphs.length, 1, 'only the note');
    assert.equal(paragraphs[0].getAttribute('data-placeholder'), 'story');
  }
});

test('at a glance shows the five labelled facts of the profile file', () => {
  const glance = frame('At a glance');
  assert.deepEqual(glance.querySelectorAll('dt').map((dt) => tidy(dt.text)), GLANCE.map(([label]) => label));
  assert.deepEqual(glance.querySelectorAll('dd').map((dd) => tidy(dd.text)), GLANCE.map(([, field]) => tidy(PROFILE.data.glance[field])));
});

test('at a glance lays its facts out across the row when it has the full width, and as label and value pairs when it sits beside the story', () => {
  const list = frame('At a glance').querySelector('dl.glance');
  assert.equal(list.classList.contains('wide'), !STORY_WRITTEN);
  assert.equal(frame('At a glance', 'dist-test').querySelector('dl.glance').classList.contains('wide'), false);
  assert.equal(list.querySelectorAll('dt').length, GLANCE.length, 'every fact is there');
});

test('the experience timeline shows every position of the profile file, newest first, one line each', () => {
  const items = frame('Experience').querySelectorAll('ol.timeline li');
  assert.deepEqual(
    items.map((item) => [tidy(item.querySelector('.when').text), tidy(item.querySelector('b').text), tidy(item.querySelector('.org').text), tidy(item.querySelector('p').text)]),
    PROFILE.data.experience.map(({ when, title, org, line }) => [tidy(when), tidy(title), tidy(org), tidy(line)]),
  );
});

test('the experience frame lists the degrees under an Education heading', () => {
  const experience = frame('Experience');
  assert.ok(experience.querySelectorAll('h3').some((h3) => tidy(h3.text) === 'Education'), 'an Education heading');
  assert.deepEqual(experience.querySelectorAll('ul.education li').map((li) => tidy(li.text)), PROFILE.data.education.map(tidy));
});

test('the research frame has one tile per theme, in theme order, each showing place and period and linking to a built page', () => {
  const tiles = frame('Research').querySelectorAll('a.tile');
  assert.deepEqual(
    tiles.map((tile) => [tile.getAttribute('href'), tidy(tile.querySelector('.tile-title').text), tidy(tile.querySelector('.tile-meta').text)]),
    THEMES.map(({ id, data }) => [`/profile/research/${id}/`, tidy(data.title), `${tidy(data.place)} · ${tidy(data.period)}`]),
  );
  for (const tile of tiles) assert.ok(loadPage('dist', tile.getAttribute('href')).querySelector('h1'), `${tile.getAttribute('href')} is built`);
});

test('theme pages show title, place and period, the problem and what was done in one frame, and no side menu', () => {
  for (const { id, data } of THEMES) {
    const main = loadPage('dist', `/profile/research/${id}/`).querySelector('main');
    assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), [tidy(data.title)], id);
    assert.equal(tidy(main.querySelector('.lede').text), `${tidy(data.place)} · ${tidy(data.period)}`, id);
    const [text] = main.querySelectorAll('.frame');
    assert.deepEqual(text.querySelectorAll('h2').map((h2) => tidy(h2.text)), ['The problem', 'What was done'], id);
    assert.ok(text.querySelectorAll('p').length >= 2, `${id} has text under both headings`);
    assert.equal(main.querySelectorAll('nav').length, 0, `${id} has no <nav> inside <main>`);
  }
});

test('a theme lists its papers beside the text, linked only where an address is given, and has no papers frame without papers', () => {
  for (const { id, data } of THEMES) {
    const frames = framesOf(`/profile/research/${id}/`);
    if (data.papers.length === 0) {
      // A section that cannot be sourced is left out, not stubbed.
      assert.deepEqual(frames.map(spanOf), [12], `${id} has only its text frame`);
      continue;
    }
    assert.deepEqual(frames.map(spanOf), [8, 4], id);
    assert.equal(tidy(frames[1].querySelector('h2').text), 'Papers', id);
    checkPaperList(frames[1].querySelectorAll('li'), data.papers, id);
  }
});

test('the publications list holds every entry of the profile file, linked only where an address is given', () => {
  checkPaperList(frame('Publications and patents').querySelectorAll('ul.publications li'), PROFILE.data.publications, 'publications');
});

test('the patents and the mentoring items of the profile file are listed', () => {
  const publications = frame('Publications and patents');
  assert.ok(publications.querySelectorAll('h3').some((h3) => tidy(h3.text) === 'Patents'), 'a Patents heading');
  assert.deepEqual(publications.querySelectorAll('ul.patents li').map((li) => tidy(li.text)), PROFILE.data.patents.map(tidy));
  assert.deepEqual(frame('Mentoring and community').querySelectorAll('li').map((li) => tidy(li.text)), PROFILE.data.mentoring.map(tidy));
});

test('no profile page describes the mini review as mentoring or uses "own" or "ownership" for his responsibilities', () => {
  for (const route of PROFILE_PAGES) {
    const text = tidy(loadPage('dist', route).querySelector('main').text);
    assert.ok(!/mini review|guided the writing/i.test(text), `${route} does not describe the mini review as mentoring`);
    assert.ok(!/\bown(ership)?\b/i.test(text), `${route} avoids "own" and "ownership"`);
  }
});

test('no profile page carries a personal contact detail, a birth date or a mail link', () => {
  for (const route of PROFILE_PAGES) {
    const page = loadPage('dist', route);
    const text = tidy(page.querySelector('main').text);
    assert.equal(page.querySelectorAll('a').filter((a) => /^(mailto|tel):/i.test(a.getAttribute('href') ?? '')).length, 0, `${route} has no mailto or tel link`);
    assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text), `${route} shows no mail address`);
    assert.ok(!/\+\d{1,3}[\s\d()-]{8,}/.test(text), `${route} shows no phone number`);
    assert.ok(!/date of birth|\bborn\b|\bDoB\b/i.test(text), `${route} shows no birth date`);
  }
});

test('the profile pages work without JavaScript: they ship no script', () => {
  for (const route of PROFILE_PAGES) {
    assert.equal(loadPage('dist', route).querySelectorAll('script').length, 0, route);
  }
});
