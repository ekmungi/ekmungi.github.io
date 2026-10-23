// Shared helpers for the site tests: load a built page as a parsed HTML tree, list built HTML files and tidy whitespace.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

// The repository root. Output folders are resolved against it so a test gives the same answer
// whichever folder the test process was started from.
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Turn a site route into the path of the built file, relative to the output folder.
 * "/" maps to index.html, "/profile/" to profile/index.html, "/privacy.html" to privacy.html.
 * @param {string} route - a site route starting with "/" and ending with "/" or ".html".
 * @returns {string} the file path using forward slashes.
 * @throws {Error} when the route is not one of those three shapes.
 */
function routeToFile(route) {
  if (route === '/') return 'index.html';
  if (route.startsWith('/') && route.endsWith('/')) return `${route.slice(1)}index.html`;
  if (route.startsWith('/') && route.endsWith('.html')) return route.slice(1);
  throw new Error(`Unsupported route "${route}": use "/", a route ending in "/", or a route ending in ".html".`);
}

/**
 * Load one built page and parse it.
 * @param {string} outDir - the build output folder ("dist", "dist-test"), relative to the repo root or absolute.
 * @param {string} route - the site route to load, for example "/" or "/profile/".
 * @returns {import('node-html-parser').HTMLElement} the parsed root of the page.
 * @throws {Error} naming the missing file when the page was not built.
 */
export function loadPage(outDir, route) {
  const file = resolve(REPO_ROOT, outDir, routeToFile(route));
  if (!existsSync(file)) {
    throw new Error(`Built page not found for route "${route}": expected the file ${file}. Has the site been built?`);
  }
  return parse(readFileSync(file, 'utf8'));
}

/**
 * List every .html file under a build output folder, at any depth.
 * @param {string} outDir - the build output folder, relative to the repo root or absolute.
 * @returns {string[]} absolute paths, sorted so repeated runs give the same order.
 * @throws {Error} naming the folder when it does not exist.
 */
export function allHtmlFiles(outDir) {
  const root = resolve(REPO_ROOT, outDir);
  if (!existsSync(root)) {
    throw new Error(`Build output folder not found: ${root}. Has the site been built?`);
  }
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.html')) found.push(path);
    }
  };
  walk(root);
  return found.sort();
}

/**
 * Collapse every run of whitespace to a single space and trim both ends.
 * @param {string} text - any text.
 * @returns {string} the tidied text.
 */
export function tidy(text) {
  return text.replace(/\s+/g, ' ').trim();
}
