// Test helper for the launch gate and the site tests: finds the links in a build that lead to a page or file the build does not contain,
// and the links that lead to the blog.
import { readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { parse } from 'node-html-parser';
import { allHtmlFiles, REPO_ROOT } from './helpers.mjs';
import { displayPath } from './launch-scan.mjs';

// The public address of the site, as astro.config.mjs sets it. A link written with it is a link inside the site.
const SITE_ORIGIN = 'https://ekmungi.github.io';

/**
 * Turn a built file into the address of its page: "index.html" is "/", "blog/index.html" is "/blog/", "privacy.html" is "/privacy.html".
 * @param {string} root - the absolute build folder.
 * @param {string} file - an absolute path to a built HTML file under it.
 * @returns {string} the page's route.
 */
function routeOf(root, file) {
  const path = relative(root, file).split(sep).join('/');
  return `/${path.replace(/(^|\/)index\.html$/, '$1')}`;
}

/**
 * Work out where inside the site a link leads.
 * @param {string} href - the link as written in the page.
 * @param {string} route - the route of the page that holds the link, which relative links are read from.
 * @returns {string | null} the decoded path inside the site (query and fragment removed), or null when the link leaves the site, is a mail,
 *   phone or script link, points only at a fragment, or cannot be read.
 */
function sitePath(href, route) {
  let url;
  try {
    url = new URL(href.trim(), `${SITE_ORIGIN}${route}`);
  } catch {
    return null;
  }
  if (url.origin !== SITE_ORIGIN || href.trim() === '' || href.trim().startsWith('#')) return null;
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return url.pathname;
  }
}

/**
 * Tell whether the build holds a file for a path inside the site, the way GitHub Pages serves it: the file itself, a folder's index.html
 * (also for an address written without the closing slash), or a .html file.
 * @param {string} root - the absolute build folder.
 * @param {string} path - a path inside the site, starting with "/".
 * @returns {boolean} true when the build serves something at that path.
 */
function isBuilt(root, path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.includes('..')) return false;
  const base = join(root, ...parts);
  const candidates = path.endsWith('/') ? [join(base, 'index.html')] : [base, join(base, 'index.html'), `${base}.html`];
  return candidates.some((candidate) => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}

/**
 * List the links of every page of a build, with the path each one leads to inside the site.
 * @param {string} outDir - the build folder, relative to the repository root or absolute.
 * @returns {{ page: string, href: string, path: string | null }[]} one entry per link that has an href.
 */
function linksOf(outDir) {
  const root = resolve(REPO_ROOT, outDir);
  return allHtmlFiles(outDir).flatMap((file) =>
    parse(readFileSync(file, 'utf8'))
      .querySelectorAll('a')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href !== undefined)
      .map((href) => ({ page: displayPath(file), href, path: sitePath(href, routeOf(root, file)) })),
  );
}

/**
 * Find the links in a build that lead to a page or file the build does not contain. Links that leave the site, mail and phone links and
 * links to a fragment of the same page are not checked.
 * @param {string} outDir - the build folder, relative to the repository root or absolute.
 * @returns {string[]} one line per broken link: "<page>: <link as written>".
 */
export function brokenLinks(outDir) {
  const root = resolve(REPO_ROOT, outDir);
  return linksOf(outDir)
    .filter(({ path }) => path !== null && !isBuilt(root, path))
    .map(({ page, href }) => `${page}: ${href}`);
}

/**
 * Find the links in a build that lead to the blog: /blog/ itself and every page below it (posts and tags).
 * @param {string} outDir - the build folder, relative to the repository root or absolute.
 * @returns {string[]} one line per link: "<page>: <link as written>".
 */
export function linksToBlog(outDir) {
  return linksOf(outDir)
    .filter(({ path }) => path !== null && (path === '/blog' || path.startsWith('/blog/')))
    .map(({ page, href }) => `${page}: ${href}`);
}
