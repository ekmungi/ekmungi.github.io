// Test helper for repository hygiene: finds control characters and invisible characters in source text, with their line numbers.
// Special characters are written as \u{...} escapes so that no invisible character sits in this file.

// Control characters other than tab, line feed and carriage return: the C0 range, the delete character and the C1 range.
const CONTROL = /[\u{0}-\u{8}\u{b}\u{c}\u{e}-\u{1f}\u{7f}-\u{9f}]/u;

// Characters that take no visible space: format characters (soft hyphen, zero-width, byte-order mark), line and paragraph separators and every space other than the plain one.
const INVISIBLE = /[\p{Cf}\p{Zl}\p{Zp}\p{Zs}]/u;

// Files whose text is code or data, where an invisible character is never intended.
const CODE_FILE = /\.(mjs|js|ts|astro|css|json|ya?ml)$/;

/**
 * Find the characters of a text that match a pattern, with the line each is on.
 * @param {string} text - the text to scan.
 * @param {(character: string) => boolean} isFlagged - decides whether one character is a problem.
 * @returns {{ line: number, codePoint: number }[]} each flagged character in order of appearance, with its 1-based line number.
 */
function flagged(text, isFlagged) {
  return text.split('\n').flatMap((lineText, index) =>
    [...lineText].filter(isFlagged).map((character) => ({ line: index + 1, codePoint: character.codePointAt(0) })),
  );
}

/**
 * Find control characters (anything below U+0020, the delete character and the C1 range, except tab, line feed and carriage return).
 * @param {string} text - the text to scan.
 * @returns {{ line: number, codePoint: number }[]} each one with its line number.
 */
export function controlCharacters(text) {
  return flagged(text, (character) => CONTROL.test(character));
}

/**
 * Find invisible characters: any space other than the plain space, any format character, and line or paragraph separators.
 * @param {string} text - the text to scan.
 * @returns {{ line: number, codePoint: number }[]} each one with its line number.
 */
export function invisibleCharacters(text) {
  return flagged(text, (character) => character !== ' ' && INVISIBLE.test(character));
}

/**
 * Tell whether a path is a source or data file, where invisible characters are not allowed.
 * @param {string} path - a repository path.
 * @returns {boolean} true for .mjs, .js, .ts, .astro, .css, .json, .yml and .yaml files.
 */
export function isCodeFile(path) {
  return CODE_FILE.test(path);
}
