// Unit tests for tests/link-scan.mjs: finding links that lead to a page or file the build does not contain, and links that lead to the blog.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brokenLinks, linksToBlog } from '../link-scan.mjs';

/**
 * Make a throwaway build folder from a map of relative paths to file text, run a check against it and delete it afterwards.
 * @param {Record<string, string>} files - relative path (forward slashes) to file text.
 * @param {(root: string) => void} check - the assertions to run; receives the folder.
 * @returns {void}
 */
function withBuild(files, check) {
  const root = mkdtempSync(join(tmpdir(), 'link-scan-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      const target = join(root, ...path.split('/'));
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, text);
    }
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** A page with the given links. */
const page = (...hrefs) => `<main>${hrefs.map((href) => `<a href="${href}">x</a>`).join('')}</main>`;

/** The hits of a scan with the build folder removed from the front, so a test can compare short strings. */
const short = (root, hits) => hits.map((hit) => hit.replaceAll('\\', '/').replace(`${root.replaceAll('\\', '/')}/`, ''));

test('brokenLinks finds nothing when every link leads to a built page or file', () => {
  withBuild(
    {
      'index.html': page('/', '/profile/', '/privacy.html', '/images/photo.jpg', '/blog', '/profile/#story', '/profile/?x=1'),
      'profile/index.html': page('/'),
      'privacy.html': page('/'),
      'blog/index.html': page('/'),
      'images/photo.jpg': 'x',
    },
    (root) => assert.deepEqual(brokenLinks(root), []),
  );
});

test('brokenLinks names the page and the link for each link to a page that is not built', () => {
  withBuild(
    {
      'index.html': page('/profile/', '/blog/', '/missing.html', '/images/photo.jpg'),
      'profile/index.html': page('/gone/'),
    },
    (root) =>
      assert.deepEqual(short(root, brokenLinks(root)).sort(), [
        'index.html: /blog/',
        'index.html: /images/photo.jpg',
        'index.html: /missing.html',
        'profile/index.html: /gone/',
      ]),
  );
});

test('brokenLinks ignores links that leave the site, mail and phone links, fragments and empty links', () => {
  withBuild(
    {
      'index.html': page('https://example.org/x', '//cdn.example.org/y', 'mailto:someone@example.org', 'tel:+000', '#top', '', 'javascript:void(0)'),
    },
    (root) => assert.deepEqual(brokenLinks(root), []),
  );
});

test('brokenLinks reads the site\'s own full address as a link inside the site', () => {
  withBuild(
    { 'index.html': page('https://ekmungi.github.io/profile/', 'https://ekmungi.github.io/gone/'), 'profile/index.html': page('/') },
    (root) => assert.deepEqual(short(root, brokenLinks(root)), ['index.html: https://ekmungi.github.io/gone/']),
  );
});

test('brokenLinks resolves a relative link from the folder of the page that holds it, and decodes percent signs', () => {
  withBuild(
    {
      'index.html': page(),
      'blog/index.html': page('../profile/', 'post/', '../nowhere/'),
      'blog/post/index.html': page('/'),
      'profile/index.html': page('/caf%C3%A9/'),
      'café/index.html': page('/'),
    },
    (root) => assert.deepEqual(short(root, brokenLinks(root)), ['blog/index.html: ../nowhere/']),
  );
});

test('brokenLinks does not count a link without an href', () => {
  withBuild({ 'index.html': '<a name="x">anchor</a><a>bare</a>' }, (root) => assert.deepEqual(brokenLinks(root), []));
});

test('linksToBlog finds every link to /blog/ or below it, on any page', () => {
  withBuild(
    {
      'index.html': page('/profile/', '/blog/'),
      'profile/index.html': page('/blog/tags/ai/', '/blog'),
      '404.html': page('/', 'https://ekmungi.github.io/blog/'),
      'privacy.html': page('/blogger/', '/'),
    },
    (root) =>
      assert.deepEqual(short(root, linksToBlog(root)).sort(), [
        '404.html: https://ekmungi.github.io/blog/',
        'index.html: /blog/',
        'profile/index.html: /blog',
        'profile/index.html: /blog/tags/ai/',
      ]),
  );
});

test('linksToBlog finds nothing in a build that never links to the blog', () => {
  withBuild({ 'index.html': page('/profile/', '/projects/') }, (root) => assert.deepEqual(linksToBlog(root), []));
});
