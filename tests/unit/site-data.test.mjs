// Unit tests for src/data/site.ts: the site facts, the agreed nav, the shape of the public repository allow-list, navFor and the aria-current helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE, navFor, isCurrentNav, navCurrent } from '../../src/data/site.ts';
import { readEntries } from '../content-data.mjs';

test('SITE carries the name, role and profile links', () => {
  assert.equal(SITE.name, 'Anant Vemuri');
  assert.ok(SITE.role.length > 0);
  assert.match(SITE.links.linkedin, /^https:\/\/www\.linkedin\.com\/in\/[a-z0-9-]+$/);
  assert.equal(SITE.links.github, 'https://github.com/ekmungi');
});

test('nav lists Home, Profile, Projects, Blog in order with the agreed addresses and hints', () => {
  assert.deepEqual(
    SITE.nav.map(({ label, href, hint }) => [label, href, hint]),
    [
      ['Home', '/', 'Back to the landing page'],
      ['Profile', '/profile/', 'Who I am: work, research, publications and education'],
      ['Projects', '/projects/', 'Research experiments and the software I build'],
      ['Blog', '/blog/', 'What I write about AI in healthcare'],
    ],
  );
});

test('publicRepos holds the site\'s own repository and only plain, distinct repository names', () => {
  assert.ok(SITE.publicRepos.includes('ekmungi.github.io'), 'the site\'s own repository is public');
  assert.equal(new Set(SITE.publicRepos.map((name) => name.toLowerCase())).size, SITE.publicRepos.length, 'no name is listed twice');
  for (const name of SITE.publicRepos) assert.match(name, /^[A-Za-z0-9._-]+$/, `"${name}" is a bare repository name`);
});

test('publicRepos never lists the repository of a project marked private', () => {
  const privateSlugs = readEntries('projects').filter(({ data }) => data.private).map(({ id }) => id.toLowerCase());
  for (const name of SITE.publicRepos) assert.ok(!privateSlugs.includes(name.toLowerCase()), `${name} belongs to a private project`);
});

test('navFor leaves Home out on the landing page only', () => {
  assert.deepEqual(navFor('home', true).map((item) => item.label), ['Profile', 'Projects', 'Blog']);
  for (const page of ['profile', 'projects', 'blog', 'other']) {
    assert.deepEqual(navFor(page, true).map((item) => item.label), ['Home', 'Profile', 'Projects', 'Blog'], page);
  }
});

test('navFor leaves Blog out until a post is published, and says so on every page', () => {
  assert.deepEqual(navFor('home', false).map((item) => item.label), ['Profile', 'Projects']);
  for (const page of ['profile', 'projects', 'blog', 'other']) {
    assert.deepEqual(navFor(page, false).map((item) => item.label), ['Home', 'Profile', 'Projects'], page);
  }
});

test('navFor shows no Blog link when the caller says nothing about posts: unfinished parts stay hidden by default', () => {
  assert.deepEqual(navFor('home').map((item) => item.label), ['Profile', 'Projects']);
});

test('only the Blog nav item waits for a published post', () => {
  assert.deepEqual(SITE.nav.filter((item) => item.needsPosts).map((item) => item.label), ['Blog']);
});

test('navFor does not change SITE.nav', () => {
  const before = SITE.nav.length;
  navFor('home', false);
  navFor('home', true);
  assert.equal(SITE.nav.length, before);
});

test('isCurrentNav marks a link only for the section its page belongs to', () => {
  const marked = (page) => SITE.nav.filter((item) => isCurrentNav(item.label, page)).map((item) => item.label);
  assert.deepEqual(marked('profile'), ['Profile']);
  assert.deepEqual(marked('projects'), ['Projects']);
  assert.deepEqual(marked('blog'), ['Blog']);
  assert.deepEqual(marked('home'), ['Home']);
});

test('isCurrentNav marks no link for a page outside the four sections', () => {
  assert.deepEqual(SITE.nav.filter((item) => isCurrentNav(item.label, 'other')), []);
});

test('the Home link is never both shown and marked: it is hidden on the landing page, which is the only page it would mark', () => {
  for (const page of ['home', 'profile', 'projects', 'blog', 'other']) {
    const shownAndMarked = navFor(page, true).filter((item) => isCurrentNav(item.label, page)).map((item) => item.label);
    assert.ok(!shownAndMarked.includes('Home'), page);
  }
});

test('navCurrent gives "page" on a section\'s own page and "true" on a subpage of that section', () => {
  const profile = SITE.nav.find((item) => item.label === 'Profile');
  assert.equal(navCurrent(profile.label, 'profile'), 'page');
  assert.equal(navCurrent(profile.label, 'profile', false), 'page');
  assert.equal(navCurrent(profile.label, 'profile', true), 'true');
});

test('navCurrent gives nothing for a link outside the page\'s section, whether the page is a subpage or not', () => {
  const others = SITE.nav.filter((item) => item.label !== 'Profile');
  for (const item of others) {
    assert.equal(navCurrent(item.label, 'profile'), undefined, item.label);
    assert.equal(navCurrent(item.label, 'profile', true), undefined, item.label);
  }
});

test('navCurrent gives nothing on a page outside the four sections', () => {
  for (const item of SITE.nav) assert.equal(navCurrent(item.label, 'other'), undefined, item.label);
});
