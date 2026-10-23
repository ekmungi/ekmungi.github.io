// Unit tests for tests/private-lists.mjs: the strict loader shared by the two local lists. Every term and phrase used here is invented,
// and every list is written into a throwaway folder outside the repository, so these tests never read a real private file.
// Special characters are written as \u{...} escapes so that no invisible character sits in this file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AVOIDED_WORDING_FILE, FORBIDDEN_TERMS_FILE, loadAvoidedWording, loadForbiddenTerms } from '../private-lists.mjs';

/**
 * Write a list file in a throwaway folder outside the repository, run a check against it and delete the folder.
 * @param {string} file - the list's path relative to the folder, for example "private/forbidden-terms.txt".
 * @param {Buffer | string | null} content - what to write; null writes no file at all.
 * @param {(root: string) => void} check - the assertions to run; receives the folder that acts as the repository root.
 * @returns {void}
 */
function withListFile(file, content, check) {
  const root = mkdtempSync(join(tmpdir(), 'private-list-'));
  try {
    if (content !== null) {
      mkdirSync(join(root, 'private'));
      writeFileSync(join(root, file), content);
    }
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// The two lists, each with its loader, a valid invented content and a matching parsed result.
const LISTS = [
  {
    file: FORBIDDEN_TERMS_FILE,
    load: loadForbiddenTerms,
    valid: 'Examplestreet 12\n# note\nsomeone@example.test\n',
    parsed: [
      { term: 'Examplestreet 12', line: 1 },
      { term: 'someone@example.test', line: 3 },
    ],
  },
  {
    file: AVOIDED_WORDING_FILE,
    load: loadAvoidedWording,
    valid: '# note\npurple elephant\nquokk*\n',
    parsed: [
      { term: 'purple elephant', line: 2 },
      { term: 'quokk*', line: 3 },
    ],
  },
];

test('the two lists live in the git-ignored private folder', () => {
  assert.equal(FORBIDDEN_TERMS_FILE, 'private/forbidden-terms.txt');
  assert.equal(AVOIDED_WORDING_FILE, 'private/avoided-wording.txt');
});

for (const { file, load, valid, parsed } of LISTS) {
  test(`${file}: a valid UTF-8 file gives its entries with their line numbers`, () => {
    withListFile(file, valid, (root) => assert.deepEqual(load(root), parsed));
  });

  test(`${file}: a missing file fails loudly and says how to create it`, () => {
    withListFile(file, null, (root) => {
      assert.throws(() => load(root), (error) => error.message.startsWith(`${file} is missing. Create it locally`));
    });
  });

  test(`${file}: an empty file, or one with only blank and comment lines, fails loudly`, () => {
    for (const content of ['', '\n\n', '# only a comment\n   \n']) {
      withListFile(file, content, (root) => assert.throws(() => load(root), /holds no (term|phrase)/));
    }
  });

  test(`${file}: a UTF-16 file, with or without a byte-order mark, fails loudly without quoting an entry`, () => {
    const body = Buffer.from(valid, 'utf16le');
    for (const content of [Buffer.concat([Buffer.from([0xff, 0xfe]), body]), body]) {
      withListFile(file, content, (root) => {
        assert.throws(
          () => load(root),
          (error) => /not valid UTF-8/.test(error.message) && !/Examplestreet|someone|purple|quokk/.test(error.message),
        );
      });
    }
  });

  test(`${file}: a replacement character fails loudly`, () => {
    withListFile(file, `${valid}\u{fffd}\n`, (root) => assert.throws(() => load(root), /not valid UTF-8/));
  });
}

test('a term that cannot match itself fails loudly, naming only its line number', () => {
  withListFile(FORBIDDEN_TERMS_FILE, 'Examplestreet 12\n\u{ad}\u{200b}\nsomeone@example.test\n', (root) => {
    assert.throws(
      () => loadForbiddenTerms(root),
      (error) => /cannot match itself/.test(error.message) && /line 2\b/.test(error.message) && !/Examplestreet|someone/.test(error.message),
    );
  });
});

test('a phrase that cannot match itself (a lone "*" or invisible characters) fails loudly, naming only its line numbers', () => {
  withListFile(AVOIDED_WORDING_FILE, 'purple elephant\n*\n\u{200b}\u{ad}\nquokk*\n', (root) => {
    assert.throws(
      () => loadAvoidedWording(root),
      (error) => /cannot match itself/.test(error.message) && /lines? 2, 3\b/.test(error.message) && !/purple|quokk/.test(error.message),
    );
  });
});
