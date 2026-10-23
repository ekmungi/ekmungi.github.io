// Site tests for the projects pages on the fixture builds (npm run build:fixtures): the page with no research project published, and a known
// set of draft projects whose frames, order, status lines, notebook link and dated updates are written out here as the expected result.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, tidy } from '../helpers.mjs';
import { fixtureOut } from '../fixture-build.mjs';
import { DRAFT_EXPERIMENT, DRAFT_SOFTWARE } from '../fixtures/definitions.mjs';

const UNPUBLISHED = fixtureOut('unpublished');
const DRAFTS = fixtureOut('drafts');

/** The column span of a frame, read from its "s<number>" class; null when it has none. */
const spanOf = (frame) => {
  const match = frame.classList.value.map((name) => /^s(\d+)$/.exec(name)).find(Boolean);
  return match ? Number(match[1]) : null;
};

/** The [heading, span] pairs of the frames inside <main> of a built page, in page order. */
const framesOf = (outDir, route) => loadPage(outDir, route).querySelectorAll('main .frame').map((frame) => [tidy(frame.querySelector('h2')?.text ?? ''), spanOf(frame)]);

/** The tiles of the frame with the given heading, as [address, title, status]. */
const tilesUnder = (outDir, heading) =>
  loadPage(outDir, '/projects/')
    .querySelectorAll('main .frame')
    .find((frame) => tidy(frame.querySelector('h2')?.text ?? '') === heading)
    .querySelectorAll('a.tile')
    .map((tile) => [tile.getAttribute('href'), tidy(tile.querySelector('.tile-title').text), tidy(tile.querySelector('.tile-badge').text)]);

test('with no research project published, the projects page has only the Software projects frame and no Colab text', () => {
  assert.deepEqual(framesOf(UNPUBLISHED, '/projects/'), [['Software projects', 12]]);
  assert.ok(!/colab/i.test(tidy(loadPage(UNPUBLISHED, '/projects/').querySelector('main').text)), 'no Colab text from an empty research frame');
  assert.throws(() => loadPage(UNPUBLISHED, '/projects/fixture-draft-research/'), /not found/, 'a draft project has no page');
});

test('with a research project shown, its frame comes first, and each frame lists its projects A to Z ignoring case', () => {
  assert.deepEqual(framesOf(DRAFTS, '/projects/'), [
    ['Research projects', 12],
    ['Software projects', 12],
  ]);
  assert.deepEqual(tilesUnder(DRAFTS, 'Research projects'), [[`/projects/${DRAFT_EXPERIMENT.slug}/`, DRAFT_EXPERIMENT.title, 'Planned']]);
  assert.deepEqual(
    tilesUnder(DRAFTS, 'Software projects'),
    DRAFT_SOFTWARE.map(({ slug, title, status }) => [`/projects/${slug}/`, title, status]),
  );
});

test('a research project page shows its notebook link, its marked placeholder and its updates newest first beside the text', () => {
  const route = `/projects/${DRAFT_EXPERIMENT.slug}/`;
  const main = loadPage(DRAFTS, route).querySelector('main');
  assert.equal(tidy(main.querySelector('h1').text), DRAFT_EXPERIMENT.title);
  assert.equal(tidy(main.querySelector('.lede').text), 'Research project · Planned');
  const links = main.querySelectorAll('.links a');
  assert.deepEqual(links.map((link) => tidy(link.text)), ['Open the notebook in Google Colab']);
  assert.equal(new URL(links[0].getAttribute('href')).hostname, 'colab.research.google.com');
  assert.deepEqual(framesOf(DRAFTS, route), [['', 8], ['Updates', 4]]);
  assert.equal(main.querySelectorAll('.frame p[data-placeholder]').length, 1, 'the unwritten text is marked as a placeholder');
  const items = main.querySelectorAll('.frame ul.updates li');
  assert.deepEqual(
    items.map((item) => [item.querySelector('time').getAttribute('datetime'), tidy(item.querySelector('time').text), tidy(item.querySelector('span').text)]),
    DRAFT_EXPERIMENT.updates,
  );
});

test('a private project page says "Code private" and links nowhere outside the site', () => {
  const main = loadPage(DRAFTS, `/projects/${DRAFT_SOFTWARE[0].slug}/`).querySelector('main');
  assert.equal(tidy(main.querySelector('.lede').text), 'Software project · Code private');
  assert.equal(main.querySelectorAll('a[href^="http"], a[href^="//"]').length, 0);
});
