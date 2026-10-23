// Site test for repository hygiene: no stray control characters in any text file, and no invisible characters in source files (a "\b" typed as a backspace once hid inside a pattern).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPO_ROOT } from '../helpers.mjs';
import { listRepoFiles, readTextIfPresent } from '../repo-files.mjs';
import { controlCharacters, invisibleCharacters, isCodeFile } from '../repo-hygiene.mjs';

/**
 * Collect the problems one scan finds across the repository's text files.
 * @param {(text: string, path: string) => { line: number, codePoint: number }[]} scan - the check to run on one file.
 * @returns {string[]} one entry per problem: "<file>:<line> U+<code point>".
 */
function problemsFound(scan) {
  return listRepoFiles(REPO_ROOT).flatMap((path) => {
    const text = readTextIfPresent(REPO_ROOT, path);
    if (text === null) return [];
    return scan(text, path).map(({ line, codePoint }) => `${path}:${line} U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
  });
}

test('no text file holds a control character other than tab, line feed and carriage return', () => {
  const problems = problemsFound((text) => controlCharacters(text));
  assert.equal(problems.length, 0, `Control characters found (a "\\b" typed into a pattern becomes a backspace):\n${problems.join('\n')}`);
});

test('no source file holds an invisible character (write it as a \\u{...} escape instead)', () => {
  const problems = problemsFound((text, path) => (isCodeFile(path) ? invisibleCharacters(text) : []));
  assert.equal(problems.length, 0, `Invisible characters found in source files:\n${problems.join('\n')}`);
});
