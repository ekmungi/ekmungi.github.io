// Test helper for the repository's files: lists the files git holds or is about to hold, reads text files and asks git whether a path is ignored or tracked.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// How many leading bytes are checked for a zero byte when deciding whether a file is text.
const BINARY_SNIFF_BYTES = 8000;

/**
 * Tell whether a buffer looks like text: it has no zero byte in its first bytes.
 * @param {Buffer} buffer - the start of a file.
 * @returns {boolean} true for text, false for binary data.
 */
export function isTextBuffer(buffer) {
  return !buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0);
}

/**
 * Read a file if it exists and is text.
 * @param {string} root - the repository folder.
 * @param {string} path - the file path relative to the root.
 * @returns {string | null} the text, or null when the file is missing (deleted but still tracked), is a folder or is binary.
 */
export function readTextIfPresent(root, path) {
  const file = join(root, path);
  if (!existsSync(file) || !statSync(file).isFile()) return null;
  const buffer = readFileSync(file);
  return isTextBuffer(buffer) ? buffer.toString('utf8') : null;
}

/**
 * List the files the repository holds or is about to hold: tracked files, plus untracked files that are not ignored.
 * Including the untracked ones means a file is scanned before its first "git add", not only after.
 * @param {string} root - the repository folder.
 * @returns {string[]} paths relative to the root with forward slashes, sorted.
 */
export function listRepoFiles(root) {
  const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return [...new Set(output.split('\0').filter(Boolean))].sort();
}

/**
 * Tell whether git ignores a path.
 * @param {string} root - the repository folder.
 * @param {string} path - the path relative to the root; it need not exist.
 * @returns {boolean} true when a .gitignore rule matches it (git check-ignore exits 0).
 */
export function isGitIgnored(root, path) {
  return spawnSync('git', ['check-ignore', '-q', '--', path], { cwd: root }).status === 0;
}

/**
 * Tell whether git tracks a path (it is in the index).
 * @param {string} root - the repository folder.
 * @param {string} path - the path relative to the root.
 * @returns {boolean} true when the path is tracked.
 */
export function isGitTracked(root, path) {
  return spawnSync('git', ['ls-files', '--error-unmatch', '--', path], { cwd: root, stdio: 'ignore' }).status === 0;
}
