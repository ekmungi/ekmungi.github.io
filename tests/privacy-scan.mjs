// Test helper for the privacy checks: reads the list format and matches terms and phrases in text and in the views of a page, without ever returning one.
// Special characters are written as \u{...} escapes so that no invisible character sits in this file.
import { decodeFully } from '../src/lib/repo-guard.ts';
import { decodeEntities } from './repo-scan.mjs';

// Characters that take no space on screen, so text can hold them inside a word without a reader seeing them: the soft hyphen, the Mongolian
// vowel separator, zero-width space, joiners and direction marks, the word joiner and invisible operators, bidirectional controls and the
// zero-width no-break space.
const INVISIBLE = /[\u{ad}\u{180e}\u{200b}-\u{200f}\u{202a}-\u{202e}\u{2060}-\u{2064}\u{2066}-\u{2069}\u{feff}]/gu;

// The dash look-alikes (hyphen, non-breaking hyphen, figure dash, en and em dash, horizontal bar, minus sign) that are read as a plain hyphen.
const DASHES = /[\u{2010}-\u{2015}\u{2212}]/gu;

// A term with at least this many digits (and no letters) is also compared as a bare run of digits, so a phone number grouped differently is still found.
const MIN_SQUASH_DIGITS = 7;

// A run of digits that may be separated by the characters a phone number or date is written with. Letters end a run.
const DIGIT_RUN = /\d[\d\s().\-/+]*/g;

// How many times entities are decoded at most, for a page that encodes an entity inside an entity.
const MAX_DECODE_ROUNDS = 5;

/**
 * Read the term list.
 * @param {string} text - the content of the term file.
 * @returns {{ term: string, line: number }[]} each term, trimmed, with its 1-based line number; blank lines and lines starting with "#" are skipped.
 */
export function parseTerms(text) {
  return text
    .replace(/^\u{feff}/u, '')
    .split(/\r?\n/)
    .map((raw, index) => ({ term: raw.trim(), line: index + 1 }))
    .filter(({ term }) => term !== '' && !term.startsWith('#'));
}

/**
 * Put text in the form used for matching: compatibility forms folded (full-width letters, no-break and thin spaces), invisible characters
 * deleted, dash look-alikes written as a hyphen, lower case, and every run of whitespace turned into one space.
 * @param {string} text - any text.
 * @returns {string} the normalised text.
 */
export function normaliseText(text) {
  return text.normalize('NFKC').replace(INVISIBLE, '').replace(DASHES, '-').toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Escape the characters of a text that mean something in a regular expression.
 * @param {string} text - literal text.
 * @returns {string} the same text, safe to put inside a RegExp.
 */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tell whether one normalised term occurs in normalised text.
 * A term with a letter in it (a street name, an address) matches anywhere, even inside a longer word.
 * A term of digits and punctuation only (a postcode, a phone number, a date) must stand alone, so a postcode is not found inside a longer number or a file hash.
 * @param {string} haystack - normalised text.
 * @param {string} term - one normalised, non-empty term.
 * @returns {boolean} true when the term occurs.
 */
function occurs(haystack, term) {
  if (/\p{L}/u.test(term)) return haystack.includes(term);
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, 'u').test(haystack);
}

/**
 * Join the runs of digits in normalised text into bare digit strings, one per run, separated by "|" so a match cannot cross two runs.
 * "+49 40-123 4567" becomes "49401234567". Letters end a run, so numbers are never joined across words.
 * @param {string} haystack - normalised text.
 * @returns {string} the digit strings of all runs, joined with "|".
 */
function squashDigitRuns(haystack) {
  return (haystack.match(DIGIT_RUN) ?? []).map((run) => run.replace(/\D/g, '')).join('|');
}

/**
 * Find which terms occur in a text, without returning any term.
 * A term that is empty once normalised matches nothing (an empty term would otherwise match every text).
 * A term with no letters and seven or more digits (a phone number) is also looked for in the bare digit runs of the text, so a different
 * grouping of the same number is found. A term with letters keeps exact matching only.
 * @param {string} text - the text to scan.
 * @param {{ term: string, line: number }[]} terms - the parsed term list.
 * @returns {number[]} the line numbers (in the term file) of the terms that occur, ascending, each once. Only numbers are returned, so a failure message built from them cannot leak a term.
 */
export function findForbiddenLines(text, terms) {
  const haystack = normaliseText(text);
  let squashed = null;
  return terms
    .filter(({ term }) => {
      const key = normaliseText(term).trim();
      if (key === '') return false;
      if (occurs(haystack, key)) return true;
      const digits = key.replace(/\D/g, '');
      if (/\p{L}/u.test(key) || digits.length < MIN_SQUASH_DIGITS) return false;
      squashed ??= squashDigitRuns(haystack);
      return squashed.includes(digits);
    })
    .map(({ line }) => line)
    .sort((a, b) => a - b);
}

/**
 * Check file paths against the term list, so a file or folder named after a personal detail is found too.
 * Each path is also read with its separators (slash, backslash, dash, underscore and dot) as spaces, so "examplestreet-12.md" is found
 * for the term "Examplestreet 12".
 * @param {string[]} paths - file paths, relative to the repository or a build folder.
 * @param {{ term: string, line: number }[]} terms - the parsed term list.
 * @returns {{ path: string, lines: number[] }[]} each path that holds a term, with the term-list line numbers only.
 */
export function pathHits(paths, terms) {
  return paths
    .map((path) => ({ path, lines: findForbiddenLines(`${path}\n${path.replace(/[\\/\-_.]+/g, ' ')}`, terms) }))
    .filter(({ lines }) => lines.length > 0);
}

/**
 * Turn one phrase of the wording list into the pattern that finds it.
 * The phrase must start a word. Without a trailing "*" it must also end a word, so a phrase is never found inside a longer word;
 * with a trailing "*" it may run on, so a stem finds every word that starts with it.
 * @param {string} phrase - one phrase as written in the list.
 * @returns {RegExp | null} the pattern for normalised text, or null when nothing is left of the phrase once normalised.
 */
function wordingPattern(phrase) {
  const key = normaliseText(phrase).trim();
  const isStem = key.endsWith('*');
  const words = isStem ? key.slice(0, -1).trim() : key;
  if (words === '') return null;
  const end = isStem ? '' : '(?![\\p{L}\\p{N}])';
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(words)}${end}`, 'u');
}

/**
 * Find which phrases of the wording list occur in a text, without returning any phrase.
 * @param {string} text - the text to scan.
 * @param {{ term: string, line: number }[]} phrases - the parsed list (see parseTerms), one phrase per entry.
 * @returns {number[]} the line numbers (in the list file) of the phrases that occur, ascending, each once. Only numbers are returned, so a failure message built from them cannot leak a phrase.
 */
export function findWordingLines(text, phrases) {
  const haystack = normaliseText(text);
  return phrases
    .filter(({ term }) => wordingPattern(term)?.test(haystack) ?? false)
    .map(({ line }) => line)
    .sort((a, b) => a - b);
}

/**
 * Decode HTML entities again and again until the text stops changing, so "&amp;nbsp;" ends up as a no-break space.
 * @param {string} text - text that may hold entities, including entities inside entities.
 * @returns {string} the fully decoded text.
 */
function decodeEntitiesFully(text) {
  let current = text;
  for (let round = 0; round < MAX_DECODE_ROUNDS; round += 1) {
    const next = decodeEntities(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * Produce the views of a page or source file that are scanned:
 * the text as written; with every HTML entity decoded, named and numeric (so "&nbsp;", "&commat;" and "&#64;" read as a space and an at sign);
 * that decoded text with its tags removed (so a word split by a tag such as a word-break reads as one word);
 * the decoded text with each tag replaced by one space (so "Name<br>12" and two spans side by side read as separate words);
 * and the decoded text with percent-escapes decoded (so "%40" in a link reads as "@").
 * @param {string} html - the content of a built page, or of any text file in the repository.
 * @returns {string[]} the distinct views to scan.
 */
export function scanViews(html) {
  const decoded = decodeEntitiesFully(html);
  return [
    ...new Set([html, decoded, decoded.replace(/<[^>]*>/g, ''), decoded.replace(/<[^>]*>/g, ' '), decodeFully(decoded)]),
  ];
}
