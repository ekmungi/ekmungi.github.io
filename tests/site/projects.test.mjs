// Site tests for the projects page (/projects/) and the project pages on the real builds. The production build (dist/) shows the published
// projects and the test build (dist-test/) shows drafts too. What each build must show is derived from the project files, so the tests keep
// passing as projects are added or published; fixed states are tested on fixture builds in fixture-projects.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDraft, readEntries, shownDay, sortByTitle, statusOf } from '../content-data.mjs';
import { allHtmlFiles, loadPage, tidy } from '../helpers.mjs';
import { badRepoMentions, repoMentions } from '../repo-scan.mjs';
import { SITE } from '../../src/data/site.ts';

const ALL_PROJECTS = readEntries('projects');

// Each build with the projects it must show.
const BUILDS = [
  { outDir: 'dist', projects: ALL_PROJECTS.filter((project) => !isDraft(project)) },
  { outDir: 'dist-test', projects: ALL_PROJECTS },
];

/** The column span of a frame, read from its "s<number>" class; null when it has none. */
const spanOf = (frame) => {
  const match = frame.classList.value.map((name) => /^s(\d+)$/.exec(name)).find(Boolean);
  return match ? Number(match[1]) : null;
};

/** The [heading, span] pairs of the frames inside <main> of a built page, in page order. */
const framesOf = (outDir, route) => loadPage(outDir, route).querySelectorAll('main .frame').map((frame) => [tidy(frame.querySelector('h2')?.text ?? ''), spanOf(frame)]);

/** The tiles under one frame heading as [address, title, summary, status]; empty when the frame is missing. */
const tilesUnder = (outDir, heading) =>
  (loadPage(outDir, '/projects/').querySelectorAll('main .frame').find((frame) => tidy(frame.querySelector('h2')?.text ?? '') === heading)?.querySelectorAll('a.tile') ?? []).map((tile) => [
    tile.getAttribute('href'),
    tidy(tile.querySelector('.tile-title').text),
    tidy(tile.querySelector('.tile-meta').text),
    tidy(tile.querySelector('.tile-badge').text),
  ]);

/** The tiles a list of projects must give, A to Z, as [address, title, summary, status]. */
const expectedTiles = (projects) => sortByTitle(projects).map(({ id, data }) => [`/projects/${id}/`, data.title, tidy(data.summary), statusOf(data)]);

/** The projects of one kind. */
const ofKind = (projects, kind) => projects.filter(({ data }) => data.kind === kind);

/** The marked top-bar links of a page as [label, value]. */
const markedNav = (page) => page.querySelectorAll('header nav a[aria-current]').map((link) => [tidy(link.text), link.getAttribute('aria-current')]);

test('the projects page has its title, a single h1 and no side menu', () => {
  for (const { outDir } of BUILDS) {
    const page = loadPage(outDir, '/projects/');
    const main = page.querySelector('main');
    assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), ['Projects'], outDir);
    assert.equal(main.querySelectorAll('nav').length, 0, `${outDir}: no <nav> inside <main>`);
    assert.equal(page.querySelector('title').text, 'Projects | Anant Vemuri', outDir);
  }
});

test('the projects page has a Research projects frame only while a research project is shown, then the Software projects frame', () => {
  for (const { outDir, projects } of BUILDS) {
    const expected = [...(ofKind(projects, 'research').length > 0 ? [['Research projects', 12]] : []), ['Software projects', 12]];
    assert.deepEqual(framesOf(outDir, '/projects/'), expected, outDir);
  }
});

test('each frame lists its projects A to Z, each with its title, summary and status line', () => {
  for (const { outDir, projects } of BUILDS) {
    assert.deepEqual(tilesUnder(outDir, 'Research projects'), expectedTiles(ofKind(projects, 'research')), `${outDir} research`);
    assert.deepEqual(tilesUnder(outDir, 'Software projects'), expectedTiles(ofKind(projects, 'software')), `${outDir} software`);
  }
});

test('a project page exists only in a build that shows the project', () => {
  for (const { outDir, projects } of BUILDS) {
    const shown = new Set(projects.map(({ id }) => id));
    for (const { id } of ALL_PROJECTS) {
      if (shown.has(id)) assert.ok(loadPage(outDir, `/projects/${id}/`).querySelector('h1'), `${outDir} ${id}`);
      else assert.throws(() => loadPage(outDir, `/projects/${id}/`), /not found/, `${outDir} ${id}`);
    }
  }
});

test('a project page shows its title, kind and status, and links in its head only to its repository and notebook', () => {
  for (const { outDir, projects } of BUILDS) {
    for (const { id, data } of projects) {
      const main = loadPage(outDir, `/projects/${id}/`).querySelector('main');
      assert.deepEqual(main.querySelectorAll('h1').map((h1) => tidy(h1.text)), [data.title], id);
      assert.equal(tidy(main.querySelector('.lede').text), `${data.kind === 'research' ? 'Research project' : 'Software project'} · ${statusOf(data)}`, id);
      const links = main.querySelectorAll('.head .links a').map((link) => [tidy(link.text), link.getAttribute('href')]);
      const expected = [...(data.repo ? [['View the code on GitHub', data.repo]] : []), ...(data.colab ? [['Open the notebook in Google Colab', data.colab]] : [])];
      assert.deepEqual(links, expected, id);
      assert.equal(main.querySelectorAll('nav').length, 0, `${id}: no <nav> inside <main>`);
    }
  }
});

test('a private project links nowhere outside the site and does not mention GitHub', () => {
  for (const { outDir, projects } of BUILDS) {
    for (const { id, data } of projects.filter((project) => project.data.private)) {
      const main = loadPage(outDir, `/projects/${id}/`).querySelector('main');
      assert.equal(tidy(main.querySelector('.lede').text).endsWith('· Code private'), true, id);
      assert.equal(main.querySelectorAll('a[href^="http"], a[href^="//"]').length, 0, `${id} (${data.title}) has no outside link`);
      assert.ok(!/github/i.test(tidy(main.text)), `${id} does not mention GitHub`);
    }
  }
});

test('a project page has its text frame, and beside it an Updates frame with the dated updates newest first when it has any', () => {
  for (const { outDir, projects } of BUILDS) {
    for (const { id, data } of projects) {
      const route = `/projects/${id}/`;
      const updates = [...(data.updates ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      assert.deepEqual(framesOf(outDir, route), updates.length > 0 ? [['', 8], ['Updates', 4]] : [['', 12]], `${outDir} ${route}`);
      const items = loadPage(outDir, route).querySelectorAll('main ul.updates li');
      assert.deepEqual(
        items.map((item) => [item.querySelector('time').getAttribute('datetime'), tidy(item.querySelector('time').text), tidy(item.querySelector('span').text)]),
        updates.map(({ date, text }) => [String(date), shownDay(String(date)), tidy(text)]),
        `${outDir} ${route}`,
      );
    }
  }
});

test('every project tile links to an existing page that carries the same title', () => {
  for (const { outDir } of BUILDS) {
    for (const tile of loadPage(outDir, '/projects/').querySelectorAll('main a.tile')) {
      const href = tile.getAttribute('href');
      assert.match(href, /^\/projects\/[a-z0-9-]+\/$/, 'an address inside /projects/');
      // loadPage throws, naming the missing file, when the page was not built.
      assert.equal(tidy(loadPage(outDir, href).querySelector('main h1').text), tidy(tile.querySelector('.tile-title').text), `${outDir} ${href}`);
    }
  }
});

test('on the projects page only the Projects link is marked "page", and on a project page only the Projects link is marked "true"', () => {
  for (const { outDir, projects } of BUILDS) {
    const index = loadPage(outDir, '/projects/');
    assert.deepEqual(markedNav(index), [['Projects', 'page']], outDir);
    assert.equal(index.querySelectorAll('[aria-current]').length, 1, `${outDir}: nothing else is marked`);
    for (const { id } of projects) {
      const page = loadPage(outDir, `/projects/${id}/`);
      assert.deepEqual(markedNav(page), [['Projects', 'true']], `${outDir} ${id}`);
      assert.equal(page.querySelectorAll('[aria-current]').length, 1, `${outDir} ${id}: nothing else is marked`);
    }
  }
});

test('the projects pages work without JavaScript: they ship no script', () => {
  for (const { outDir, projects } of BUILDS) {
    for (const route of ['/projects/', ...projects.map(({ id }) => `/projects/${id}/`)]) {
      assert.equal(loadPage(outDir, route).querySelectorAll('script').length, 0, `${outDir} ${route}`);
    }
  }
});

test('every github.com/ekmungi link in dist and dist-test is on the public allow-list, and every project repository is seen', () => {
  // Ruling 11: a link typed in a Markdown body bypasses the content schema, so every built page is scanned, hrefs and visible text alike.
  for (const { outDir, projects } of BUILDS) {
    const seen = new Set();
    const files = allHtmlFiles(outDir);
    assert.ok(files.length > 5, `${outDir}: the scan read ${files.length} files`);
    for (const file of files) {
      const html = readFileSync(file, 'utf8');
      assert.deepEqual(badRepoMentions(html, SITE.publicRepos), [], `${file} names a repository that is not on the public allow-list`);
      repoMentions(html).forEach((name) => seen.add(name));
    }
    // The scan does see the project links: every repository a shown project links to was found.
    const linked = projects.filter(({ data }) => data.repo).map(({ data }) => data.repo.replace(/\/$/, '').split('/').pop().toLowerCase());
    assert.deepEqual(linked.filter((name) => !seen.has(name)), [], `${outDir}: every project repository was found by the scan`);
  }
});
