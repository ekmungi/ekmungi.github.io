// Local tests for the privacy rule, run by npm test only because they read the two git-ignored lists in private/:
// no personal identifier in any built page, repository file or file name, and no avoided wording in any built page. Messages give line numbers only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { allHtmlFiles, REPO_ROOT } from '../helpers.mjs';
import { findForbiddenLines, findWordingLines, pathHits, scanViews } from '../privacy-scan.mjs';
import { isGitIgnored, isGitTracked, listRepoFiles, readTextIfPresent } from '../repo-files.mjs';
import { AVOIDED_WORDING_FILE, FORBIDDEN_TERMS_FILE, loadAvoidedWording, loadForbiddenTerms, missingTermsHelp, missingWordingHelp } from '../private-lists.mjs';

// The two build folders: the public site, and the test build that also shows drafts.
const BUILD_FOLDERS = ['dist', 'dist-test'];

/**
 * Describe where entries of a list were found without writing any entry.
 * @param {string} where - the file that was scanned, relative to the repository root.
 * @param {number[]} lines - the line numbers in the list that matched.
 * @returns {string} for example "dist/index.html (list lines 3, 7)".
 */
function describeHit(where, lines) {
  return `${where} (list line${lines.length === 1 ? '' : 's'} ${lines.join(', ')})`;
}

/**
 * Scan every built page of both builds with one matcher.
 * @param {(text: string) => number[]} findLines - returns the matching list line numbers for a text.
 * @returns {string[]} one description per page with a hit.
 */
function builtPageHits(findLines) {
  const hits = [];
  for (const folder of BUILD_FOLDERS) {
    for (const file of allHtmlFiles(folder)) {
      const lines = findLines(scanViews(readFileSync(file, 'utf8')).join('\n'));
      if (lines.length > 0) hits.push(describeHit(relative(REPO_ROOT, file).replaceAll('\\', '/'), lines));
    }
  }
  return hits;
}

test('each private list exists, is ignored by git and is not tracked', () => {
  for (const [file, help, load] of [
    [FORBIDDEN_TERMS_FILE, missingTermsHelp, loadForbiddenTerms],
    [AVOIDED_WORDING_FILE, missingWordingHelp, loadAvoidedWording],
  ]) {
    assert.ok(existsSync(resolve(REPO_ROOT, file)), help());
    assert.ok(isGitIgnored(REPO_ROOT, file), `${file} must be listed in .gitignore, otherwise the list could be committed.`);
    assert.ok(!isGitTracked(REPO_ROOT, file), `${file} is tracked by git. Remove it from the index with "git rm --cached".`);
    // The loader fails with its own message when the file is empty, in the wrong encoding or holds an entry that cannot match itself.
    assert.ok(load(REPO_ROOT).length > 0);
  }
});

test('no forbidden term appears in any built page', () => {
  const terms = loadForbiddenTerms(REPO_ROOT);
  const hits = builtPageHits((text) => findForbiddenLines(text, terms));
  assert.equal(hits.length, 0, `Personal terms found in built pages:\n${hits.join('\n')}`);
});

test('no forbidden term appears in any file git tracks or would track', () => {
  const terms = loadForbiddenTerms(REPO_ROOT);
  const hits = [];
  for (const path of listRepoFiles(REPO_ROOT)) {
    const text = readTextIfPresent(REPO_ROOT, path);
    if (text === null) continue;
    // The same views as for a built page: a source file (.astro, .md) can hold an entity-encoded term that only the browser would decode.
    const lines = findForbiddenLines(scanViews(text).join('\n'), terms);
    if (lines.length > 0) hits.push(describeHit(path, lines));
  }
  assert.equal(hits.length, 0, `Personal terms found in repository files:\n${hits.join('\n')}`);
});

test('no forbidden term appears in the path of any repository file or built page', () => {
  const terms = loadForbiddenTerms(REPO_ROOT);
  const builtPaths = BUILD_FOLDERS.flatMap((folder) => allHtmlFiles(folder).map((file) => relative(REPO_ROOT, file).replaceAll('\\', '/')));
  const hits = pathHits([...listRepoFiles(REPO_ROOT), ...builtPaths], terms).map(({ path, lines }) => describeHit(path, lines));
  assert.equal(hits.length, 0, `Personal terms found in file names:\n${hits.join('\n')}`);
});

test('no avoided wording in built pages', () => {
  const phrases = loadAvoidedWording(REPO_ROOT);
  const hits = builtPageHits((text) => findWordingLines(text, phrases));
  assert.equal(hits.length, 0, `Avoided wording found in built pages:\n${hits.join('\n')}`);
});
