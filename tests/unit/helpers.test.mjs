// Unit tests for tests/helpers.mjs: route-to-file mapping, missing-page errors, HTML file listing and whitespace tidying.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute, sep } from 'node:path';
import { loadPage, allHtmlFiles, tidy, REPO_ROOT } from '../helpers.mjs';

/**
 * Create a throwaway output folder holding the given files.
 * @param {Record<string, string>} files - map of relative file path to file content.
 * @returns {string} absolute path of the new folder; the caller removes it.
 */
function makeOutDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'helpers-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const target = join(dir, rel);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, content);
  }
  return dir;
}

const page = (title) => `<!doctype html><html><head><title>${title}</title></head><body></body></html>`;

test('loadPage maps "/" to index.html', () => {
  const dir = makeOutDir({ 'index.html': page('Home') });
  try {
    assert.equal(loadPage(dir, '/').querySelector('title').text, 'Home');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPage maps a trailing-slash route to <route>index.html', () => {
  const dir = makeOutDir({ 'profile/index.html': page('Profile'), 'blog/tags/ai/index.html': page('AI') });
  try {
    assert.equal(loadPage(dir, '/profile/').querySelector('title').text, 'Profile');
    assert.equal(loadPage(dir, '/blog/tags/ai/').querySelector('title').text, 'AI');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPage maps a .html route to that file', () => {
  const dir = makeOutDir({ 'privacy.html': page('Privacy') });
  try {
    assert.equal(loadPage(dir, '/privacy.html').querySelector('title').text, 'Privacy');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPage throws an error naming the missing file', () => {
  const dir = makeOutDir({ 'index.html': page('Home') });
  try {
    assert.throws(() => loadPage(dir, '/profile/'), (error) => {
      assert.match(error.message, /profile[\\/]index\.html/);
      return true;
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPage rejects a route that is not one of the three supported shapes', () => {
  const dir = makeOutDir({ 'profile/index.html': page('Profile') });
  try {
    assert.throws(() => loadPage(dir, '/profile'), /route/i);
    assert.throws(() => loadPage(dir, 'profile/'), /route/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPage resolves a relative outDir against the repo root, not the working directory', () => {
  const dir = makeOutDir({ 'index.html': page('Rooted') });
  const startDir = process.cwd();
  try {
    const fromRoot = relative(REPO_ROOT, dir);
    // On a different drive the relative path is absolute, which cannot prove anything.
    if (isAbsolute(fromRoot)) return;
    process.chdir(tmpdir());
    assert.equal(loadPage(fromRoot, '/').querySelector('title').text, 'Rooted');
  } finally {
    process.chdir(startDir);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('allHtmlFiles lists every .html file under the folder as absolute paths and nothing else', () => {
  const dir = makeOutDir({
    'index.html': page('Home'),
    'profile/index.html': page('Profile'),
    'blog/tags/ai/index.html': page('AI'),
    'privacy.html': page('Privacy'),
    'styles/site.css': 'body{}',
    'notes.txt': 'not a page',
  });
  try {
    const files = allHtmlFiles(dir);
    assert.ok(files.every(isAbsolute), 'every path is absolute');
    const rel = files.map((f) => relative(dir, f).split(sep).join('/')).sort();
    assert.deepEqual(rel, ['blog/tags/ai/index.html', 'index.html', 'privacy.html', 'profile/index.html']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('allHtmlFiles throws an error naming a missing folder', () => {
  const missing = join(tmpdir(), 'helpers-test-does-not-exist');
  assert.throws(() => allHtmlFiles(missing), (error) => {
    assert.ok(error.message.includes('helpers-test-does-not-exist'));
    return true;
  });
});

test('tidy collapses every run of whitespace to one space and trims both ends', () => {
  assert.equal(tidy('  Privacy \n\t policy  '), 'Privacy policy');
  assert.equal(tidy('one'), 'one');
  assert.equal(tidy(' \n '), '');
});
