// Unit tests for tests/repo-scan.mjs: the scanner must pass pages with only listed repositories and fail on every planted bad link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badRepoMentions, decodeEntities, repoMentions } from '../repo-scan.mjs';

// A small allow-list is enough here; the site test reads the real one from src/data/site.ts.
const PUBLIC = ['ekmungi.github.io', 'smart-search'];

/** Wrap a fragment in a minimal page, as the build would. */
const page = (body) => `<!doctype html><html><head><title>t</title></head><body>${body}</body></html>`;

test('decodeEntities reads numeric and common named entities and leaves unknown ones as written', () => {
  assert.equal(decodeEntities('github.com&#x2F;ekmungi&sol;x&#47;y'), 'github.com/ekmungi/x/y');
  assert.equal(decodeEntities('a&amp;b &quot;c&quot; &unknown;'), 'a&b "c" &unknown;');
});

test('decodeEntities reads the whole HTML named-entity table, whitespace and punctuation entities included', () => {
  assert.equal(decodeEntities('a&nbsp;b&ensp;c&emsp;d&thinsp;e'), 'a\u{a0}b\u{2002}c\u{2003}d\u{2009}e');
  assert.equal(decodeEntities('x&commat;y&plus;z&lpar;1&rpar;&hyphen;&ndash;&minus;'), 'x@y+z(1)\u{2010}\u{2013}\u{2212}');
  assert.equal(decodeEntities('M&uuml;ller Stra&szlig;e &shy;&ZeroWidthSpace;'), 'M\u{fc}ller Stra\u{df}e \u{ad}\u{200b}');
  assert.equal(decodeEntities('&amp;nbsp;'), '&nbsp;', 'one level only: the result of a decode is not decoded again');
});

test('a page with only allow-listed repositories, the profile link and the site\'s own host passes', () => {
  const html = page(
    '<a href="https://github.com/ekmungi/smart-search">code</a> ' +
      '<a href="https://github.com/ekmungi">profile</a> ' +
      '<a href="https://ekmungi.github.io/projects/">site</a> ' +
      '<p>Written at github.com/ekmungi/smart-search.</p>',
  );
  assert.deepEqual(badRepoMentions(html, PUBLIC), []);
  assert.deepEqual(repoMentions(html), ['smart-search']);
});

test('a planted link to an unlisted repository in an href is found', () => {
  const html = page('<a href="https://github.com/ekmungi/not-a-listed-repo">x</a>');
  assert.deepEqual(badRepoMentions(html, PUBLIC), ['not-a-listed-repo']);
});

test('a planted repository address in visible text is found, whatever its capitalisation', () => {
  const html = page('<p>See GitHub.com/EkMungi/Not-A-Listed-Repo for the code.</p>');
  assert.deepEqual(badRepoMentions(html, PUBLIC), ['not-a-listed-repo']);
});

test('a planted address is found when it is percent-encoded, entity-encoded or split by a tag', () => {
  assert.deepEqual(badRepoMentions(page('<a href="https%3A%2F%2Fgithub.com%2Fekmungi%2Fhidden-one">x</a>'), PUBLIC), ['hidden-one']);
  assert.deepEqual(badRepoMentions(page('<a href="https://github.com&#x2F;ekmungi&#x2F;hidden-two">x</a>'), PUBLIC), ['hidden-two']);
  assert.deepEqual(badRepoMentions(page('<p>github.com/ekmungi/<b>hidden-three</b></p>'), PUBLIC), ['']);
});

test('a planted GitHub-backed Colab link to an unlisted repository is found, in its path or tucked into a fragment', () => {
  const inPath = page('<a href="https://colab.research.google.com/github/ekmungi/not-a-listed-repo/blob/main/a.ipynb">n</a>');
  assert.deepEqual(badRepoMentions(inPath, PUBLIC), ['not-a-listed-repo']);
  const inFragment = page('<a href="https://colab.research.google.com/#fileId=https%3A//github.com/ekmungi/not-a-listed-repo/blob/main/a.ipynb">n</a>');
  assert.deepEqual(badRepoMentions(inFragment, PUBLIC), ['not-a-listed-repo']);
});

test('a Colab link to an allow-listed repository passes', () => {
  const html = page('<a href="https://colab.research.google.com/github/ekmungi/smart-search/blob/main/a.ipynb">n</a>');
  assert.deepEqual(badRepoMentions(html, PUBLIC), []);
});

test('a name glued to a listed repository is a different repository and is found', () => {
  const html = page('<a href="https://github.com/ekmungi/smart-search-secret">x</a>');
  assert.deepEqual(badRepoMentions(html, PUBLIC), ['smart-search-secret']);
});
