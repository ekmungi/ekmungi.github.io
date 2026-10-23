// Unit tests for tests/repo-hygiene.mjs: finding control characters and invisible characters in source text.
// Special characters are written as \u{...} escapes so that no invisible character sits in this file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlCharacters, invisibleCharacters, isCodeFile } from '../repo-hygiene.mjs';

test('controlCharacters finds a backspace, a zero byte and a delete character, with line and code point', () => {
  assert.deepEqual(controlCharacters('ok\nbad\u{8}here\nmore\u{0}\nlast\u{7f}'), [
    { line: 2, codePoint: 0x08 },
    { line: 3, codePoint: 0x00 },
    { line: 4, codePoint: 0x7f },
  ]);
});

test('controlCharacters allows tab, line feed and carriage return and finds nothing in ordinary text', () => {
  assert.deepEqual(controlCharacters('a\tb\r\nc\n'), []);
  assert.deepEqual(controlCharacters('caf\u{e9} \u{b7} \u{a9}'), []);
});

test('invisibleCharacters finds no-break and other special spaces, soft hyphens, zero-width characters, byte-order marks and line separators', () => {
  const text = 'a\u{a0}b\u{ad}c\u{200b}d\u{feff}e\u{180e}f\u{2028}g\u{2003}h';
  assert.deepEqual(
    invisibleCharacters(text).map((found) => found.codePoint),
    [0xa0, 0xad, 0x200b, 0xfeff, 0x180e, 0x2028, 0x2003],
  );
});

test('invisibleCharacters reports the line of each one and leaves plain spaces and visible characters alone', () => {
  assert.deepEqual(invisibleCharacters('plain text, caf\u{e9}\nsecond\u{a0}line'), [{ line: 2, codePoint: 0xa0 }]);
  assert.deepEqual(invisibleCharacters('just a normal line\twith a tab'), []);
});

test('isCodeFile is true for source, style, workflow and data files and false for prose', () => {
  for (const path of ['tests/a.mjs', 'src/x.ts', 'src/p.astro', 'src/s.css', '.github/workflows/deploy.yml', 'package.json']) {
    assert.equal(isCodeFile(path), true, path);
  }
  for (const path of ['README.md', 'src/content/posts/a.md', 'notes.txt']) {
    assert.equal(isCodeFile(path), false, path);
  }
});
