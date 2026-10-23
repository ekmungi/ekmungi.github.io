// Unit tests for tests/repo-files.mjs: listing, reading and checking the repository's files with git, in throwaway repositories.
// Special characters are written as \u{...} escapes so that no invisible character sits in this file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isGitIgnored, isGitTracked, isTextBuffer, listRepoFiles, readTextIfPresent } from '../repo-files.mjs';

test('isTextBuffer accepts text and rejects data that holds a zero byte', () => {
  assert.equal(isTextBuffer(Buffer.from('plain text, with accents: \u{e9}')), true);
  assert.equal(isTextBuffer(Buffer.from([0x89, 0x50, 0x00, 0x47])), false);
  assert.equal(isTextBuffer(Buffer.alloc(0)), true);
});

/**
 * Make a throwaway git repository holding a few files, run a check against it and delete it afterwards.
 * @param {(root: string) => void} check - the assertions to run; receives the repository folder.
 * @returns {void}
 */
function withTempRepo(check) {
  const root = mkdtempSync(join(tmpdir(), 'repo-files-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' });
    writeFileSync(join(root, '.gitignore'), 'private/\n');
    writeFileSync(join(root, 'a.txt'), 'plain\n');
    mkdirSync(join(root, 'sub'));
    writeFileSync(join(root, 'sub', 'b.md'), 'more\n');
    mkdirSync(join(root, 'private'));
    writeFileSync(join(root, 'private', 'secret.txt'), 'hidden\n');
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('listRepoFiles lists tracked and untracked files but not ignored ones', () => {
  withTempRepo((root) => {
    assert.deepEqual(listRepoFiles(root), ['.gitignore', 'a.txt', 'sub/b.md']);
  });
});

test('isGitIgnored is true for an ignored path and false for a normal one', () => {
  withTempRepo((root) => {
    assert.equal(isGitIgnored(root, 'private/secret.txt'), true);
    assert.equal(isGitIgnored(root, 'a.txt'), false);
  });
});

test('isGitTracked is false until a file is added to the index', () => {
  withTempRepo((root) => {
    assert.equal(isGitTracked(root, 'a.txt'), false);
    execFileSync('git', ['add', 'a.txt'], { cwd: root, stdio: 'ignore' });
    assert.equal(isGitTracked(root, 'a.txt'), true);
  });
});

test('readTextIfPresent returns the text of a text file and null for a missing or binary file', () => {
  withTempRepo((root) => {
    writeFileSync(join(root, 'bin.dat'), Buffer.from([1, 0, 2]));
    assert.equal(readTextIfPresent(root, 'a.txt'), 'plain\n');
    assert.equal(readTextIfPresent(root, 'missing.txt'), null);
    assert.equal(readTextIfPresent(root, 'bin.dat'), null);
  });
});
