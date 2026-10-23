// Test helper for the two local, git-ignored lists the privacy checks read: loads each one strictly and refuses a list that could protect nothing.
// Special characters are written as \u{...} escapes so that no invisible character sits in this file. No message here ever holds an entry of a list.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findForbiddenLines, findWordingLines, parseTerms } from './privacy-scan.mjs';

// The list of personal identifiers, one per line. Its content is never printed, logged or committed.
export const FORBIDDEN_TERMS_FILE = 'private/forbidden-terms.txt';

// The list of phrases the site must not use, one per line. Its content is never printed, logged or committed.
export const AVOIDED_WORDING_FILE = 'private/avoided-wording.txt';

/**
 * Tell the developer how to create the missing term list.
 * @returns {string} an instruction naming the file and its format, containing no term.
 */
export function missingTermsHelp() {
  return (
    `${FORBIDDEN_TERMS_FILE} is missing. Create it locally (it is git-ignored and must never be committed): ` +
    'one personal term per line, taken from your own records (home street and house number, postcode, phone numbers, ' +
    'personal email addresses, date of birth in common formats). The privacy test cannot run without it.'
  );
}

/**
 * Tell the developer how to create the missing phrase list.
 * @returns {string} an instruction naming the file and its format, containing no phrase.
 */
export function missingWordingHelp() {
  return (
    `${AVOIDED_WORDING_FILE} is missing. Create it locally (it is git-ignored and must never be committed): ` +
    'one phrase per line, taken from your own records. A phrase matches whole words; a trailing * matches any word that starts with it. ' +
    'The privacy test cannot run without it.'
  );
}

/**
 * Load one local list, and refuse to continue when it could not protect anything.
 * It fails (throws) when the file is missing, is not UTF-8 text (a file saved as UTF-16, for example by older PowerShell, reads with zero
 * bytes or replacement characters and would never match anything), holds no entry, or holds an entry that does not match itself.
 * @param {string} root - the repository folder.
 * @param {{ file: string, noun: string, help: () => string, findLines: (text: string, entries: { term: string, line: number }[]) => number[] }} list -
 *   the file's path relative to the root, the word for one entry ("term", "phrase"), the help for a missing file and the matcher used on it.
 * @returns {{ term: string, line: number }[]} the entries, each with its 1-based line number.
 * @throws {Error} describing what is wrong with the file and how to fix it, by line number only.
 */
function loadStrictList(root, { file, noun, help, findLines }) {
  const path = join(root, file);
  if (!existsSync(path)) throw new Error(help());
  const text = readFileSync(path, 'utf8');
  if (text.includes('\u{0}') || text.includes('\u{fffd}')) {
    throw new Error(`${file} is not valid UTF-8 text (it holds zero bytes or replacement characters, typically because it was saved as UTF-16). Save it again as UTF-8, one ${noun} per line.`);
  }
  const entries = parseTerms(text);
  if (entries.length === 0) {
    throw new Error(`${file} holds no ${noun} (it is empty, or has only blank and comment lines), so the privacy test would check nothing. Add one ${noun} per line.`);
  }
  const broken = entries.filter(({ term, line }) => !findLines(term, [{ term, line }]).includes(line)).map(({ line }) => line);
  if (broken.length > 0) {
    const where = `line${broken.length === 1 ? '' : 's'} ${broken.join(', ')}`;
    throw new Error(`${file}: the ${noun} on ${where} cannot match itself (it is empty once invisible characters are removed), so it would protect nothing. Correct that line.`);
  }
  return entries;
}

/**
 * Load the personal term list strictly.
 * @param {string} root - the repository folder.
 * @returns {{ term: string, line: number }[]} the terms with their line numbers.
 * @throws {Error} when the file is missing, not UTF-8, empty or holds a term that cannot match itself.
 */
export function loadForbiddenTerms(root) {
  return loadStrictList(root, { file: FORBIDDEN_TERMS_FILE, noun: 'term', help: missingTermsHelp, findLines: findForbiddenLines });
}

/**
 * Load the avoided-wording list strictly.
 * @param {string} root - the repository folder.
 * @returns {{ term: string, line: number }[]} the phrases with their line numbers.
 * @throws {Error} when the file is missing, not UTF-8, empty or holds a phrase that cannot match itself.
 */
export function loadAvoidedWording(root) {
  return loadStrictList(root, { file: AVOIDED_WORDING_FILE, noun: 'phrase', help: missingWordingHelp, findLines: findWordingLines });
}
