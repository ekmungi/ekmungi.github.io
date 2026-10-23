// Unit tests for README.md and CHANGELOG.md: they carry the instructions the project relies on, name no private repository, and agree with package.json on the version.
// The check of their wording against the local phrase list needs a git-ignored file, so it lives in tests/local/docs-wording.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';

const readme = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
const changelog = readFileSync(resolve(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'));

test('README explains how to add content, preview, test and keep personal data out', () => {
  for (const phrase of [
    'src/content/posts',
    'src/content/projects',
    'YYYY-MM-DD',
    'npm run dev',
    'npm test',
    'npm run check:launch',
    'private/forbidden-terms.txt',
    'private/avoided-wording.txt',
    'SITE.publicRepos',
    'public/images/photo.jpg',
    'public/images/posts/',
    'metadata',
    'Dependabot',
  ]) {
    assert.ok(readme.includes(phrase), `README mentions ${phrase}`);
  }
});

test('README explains that unfinished parts stay hidden and appear on their own when their content exists', () => {
  assert.match(readme, /^## Unfinished parts stay hidden/m);
  const section = readme.split(/^## /m).find((part) => part.startsWith('Unfinished parts stay hidden')) ?? '';
  for (const phrase of ['public/images/photo.jpg', 'src/content/profile/profile.md', 'first published post', 'data-placeholder', 'npm run dev']) {
    assert.ok(section.includes(phrase), `the section mentions ${phrase}`);
  }
});

test('README describes the launch gate as a check that nothing unfinished is visible, and no longer demands a photo, a post or a story', () => {
  assert.match(readme, /nothing unfinished is visible/);
  assert.doesNotMatch(readme, /at least one published post/);
  assert.doesNotMatch(readme, /It fails until all of that is in place/);
});

test('README says that a draft is not private, because the repository is public', () => {
  assert.match(readme, /A draft is not private\. This repository is public, so anyone can read a committed draft on GitHub\./);
  assert.match(readme, /npm run test:ci/);
});

test('README names no private repository', () => {
  assert.doesNotMatch(readme, /jeeves|smart[ -]?memory|spyglass/i);
});

test('README and CHANGELOG say only that private lists exist outside the repository, never what is on them', () => {
  for (const [name, text] of [
    ['README', readme],
    ['CHANGELOG', changelog],
  ]) {
    assert.match(text, /private lists kept outside the repository/, `${name} says the build is checked against private lists`);
  }
});

test('CHANGELOG follows Keep a Changelog and its newest entry is the package version', () => {
  assert.match(changelog, /^# Changelog/);
  assert.match(changelog, /keepachangelog\.com/);
  assert.match(changelog, /^## \[0\.1\.0\] - 2026-10-21/m);
  assert.match(changelog, /Astro rebuild/);
  assert.match(changelog, /^### Added/m);
  assert.match(changelog, /^## \[0\.2\.0\] - 2026-10-23/m);
  const newest = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  assert.ok(newest, 'the changelog has a versioned entry');
  assert.equal(newest[1], pkg.version);
});

test('the 0.2.0 entry lists the change under Changed, above the 0.1.0 entry', () => {
  const entry = changelog.split(/^## /m).find((part) => part.startsWith('[0.2.0]')) ?? '';
  assert.match(entry, /^### Changed/m);
  assert.match(entry, /[Uu]nfinished sections stay hidden in published pages/);
  assert.match(entry, /launch gate checks that nothing unfinished is visible/);
  assert.ok(changelog.indexOf('[0.2.0]') < changelog.indexOf('[0.1.0]'), 'the newest version comes first');
});
