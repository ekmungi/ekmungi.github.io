// Unit tests for src/lib/repo-guard.ts: finding links to repositories that are not on the public allow-list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeFully, findNonPublicRepo, hasParentSegment, pointsAtGithub } from '../../src/lib/repo-guard.ts';

const PUBLIC = ['ekmungi.github.io', 'smart-search', 'smart-search-mcp'];

test('decodeFully decodes repeatedly until the text stops changing', () => {
  assert.equal(decodeFully('a%2Fb'), 'a/b');
  assert.equal(decodeFully('https%253A%252F%252Fx'), 'https://x');
  assert.equal(decodeFully('no escapes'), 'no escapes');
});

test('decodeFully survives broken encoding and still decodes the plain ASCII escapes beside it', () => {
  assert.equal(decodeFully('a%ZZb'), 'a%ZZb');
  assert.equal(decodeFully('%E0%2Fx'), '%E0/x');
  assert.equal(decodeFully('x%2Fy%E0'), 'x/y%E0');
});

test('findNonPublicRepo returns null for a link to an allow-listed repository, in any common form', () => {
  for (const url of [
    'https://github.com/ekmungi/smart-search',
    'https://github.com/ekmungi/smart-search/',
    'https://github.com/ekmungi/smart-search/tree/main/src?x=1#top',
    'https://github.com/ekmungi/ekmungi.github.io',
    'https://github.com/EKMUNGI/Smart-Search',
    'https://colab.research.google.com/github/ekmungi/smart-search/blob/main/a.ipynb',
    'https://colab.research.google.com/#fileId=https%3A%2F%2Fgithub.com%2Fekmungi%2Fsmart-search',
  ]) {
    assert.equal(findNonPublicRepo(url, PUBLIC), null, url);
  }
});

test('findNonPublicRepo names the repository when it is not on the allow-list', () => {
  assert.deepEqual(findNonPublicRepo('https://github.com/ekmungi/secret/blob/main/a', PUBLIC), { name: 'secret' });
  assert.deepEqual(findNonPublicRepo('https://github.com/ekmungi/Secret.Repo?x=1', PUBLIC), { name: 'secret.repo' });
  assert.deepEqual(findNonPublicRepo('https://github.com/ekmungi/smart-search.git', PUBLIC), { name: 'smart-search.git' });
  assert.deepEqual(findNonPublicRepo('https://x.org/?next=https://github.com/ekmungi/secret', PUBLIC), { name: 'secret' });
});

test('findNonPublicRepo rejects an ekmungi mention that names no repository (empty name)', () => {
  for (const url of ['https://github.com/ekmungi', 'https://github.com/ekmungi/', 'https://x.org/a/ekmungi-secret/b', 'https://x.org/ekmungi//smart-search']) {
    assert.deepEqual(findNonPublicRepo(url, PUBLIC), { name: '' }, url);
  }
});

test('findNonPublicRepo checks every mention, not only the first', () => {
  const url = 'https://x.org/?a=https://github.com/ekmungi/smart-search&b=https://github.com/ekmungi/secret';
  assert.deepEqual(findNonPublicRepo(url, PUBLIC), { name: 'secret' });
});

test('findNonPublicRepo ignores the host, so the site itself and other owners are not flagged', () => {
  assert.equal(findNonPublicRepo('https://ekmungi.github.io/blog/', PUBLIC), null);
  assert.equal(findNonPublicRepo('https://doi.org/10.1000/xyz', PUBLIC), null);
  assert.equal(findNonPublicRepo('https://github.com/someone-else/their-repo', PUBLIC), null);
});

test('findNonPublicRepo returns null for text that is not a readable address', () => {
  assert.equal(findNonPublicRepo('not a url', PUBLIC), null);
  assert.equal(findNonPublicRepo('', PUBLIC), null);
});

test('findNonPublicRepo accepts an allow-listed name only when it ends the text or is followed by / ? # or &', () => {
  for (const tail of ['', '/', '/blob/main/a.ipynb', '?x=1', '#frag', '&b=2']) {
    assert.equal(findNonPublicRepo(`https://x.org/?a=https://github.com/ekmungi/smart-search${tail}`, PUBLIC), null, tail);
  }
});

test('findNonPublicRepo refuses anything else after an allow-listed name, and reports the whole run as the name', () => {
  assert.deepEqual(findNonPublicRepo('https://x.org/#https://github.com/ekmungi/smart-search;secret', PUBLIC), { name: 'smart-search;secret' });
  assert.deepEqual(findNonPublicRepo('https://x.org/#https://github.com/ekmungi/smart-search@secret', PUBLIC), { name: 'smart-search@secret' });
  assert.deepEqual(findNonPublicRepo('https://x.org/#https://github.com/ekmungi/smart-search~secret', PUBLIC), { name: 'smart-search~secret' });
  assert.equal(findNonPublicRepo('https://x.org/github/ekmungi/smart-search%2Fsecret', PUBLIC), null, 'a decoded slash ends the name; the ".." rule covers traversal');
  assert.deepEqual(findNonPublicRepo('https://x.org/github/ekmungi/smart-search,secret', PUBLIC), { name: 'smart-search,secret' });
});

test('hasParentSegment finds a ".." segment after full decoding, wherever it sits', () => {
  for (const url of [
    'https://x.org/a/%252e%252e/b',
    'https://x.org/a/%2e%2e%2fb',
    'https://x.org/a%2F..%2Fb',
    'https://x.org/#https://github.com/ekmungi/smart-search/../secret',
    'https://x.org/?path=..%2Fsecret',
    'https://x.org/?path=..',
    'https://x.org/#..',
  ]) {
    assert.equal(hasParentSegment(url), true, url);
  }
});

test('hasParentSegment ignores dots inside a name and unreadable text', () => {
  for (const url of ['https://x.org/10.1000/a..b', 'https://x.org/a/.../b', 'https://x.org/a.b.c', 'https://x.org/v1.2/', 'not a url']) {
    assert.equal(hasParentSegment(url), false, url);
  }
});

test('pointsAtGithub finds github after the host, in the path, query or fragment, in any encoding or case', () => {
  for (const url of [
    'https://colab.research.google.com/github/someone/repo/blob/main/a.ipynb',
    'https://colab.research.google.com/#fileId=https://github.com/x/y',
    'https://colab.research.google.com/?q=https%3A%2F%2FGitHub.com%2Fx',
    'https://colab.research.google.com/github%2Fx%2Fy',
    'https://colab.research.google.com/%2567ithub/x',
  ]) {
    assert.equal(pointsAtGithub(url), true, url);
  }
});

test('pointsAtGithub is false for a link with no GitHub after the host, and for text that is not an address', () => {
  assert.equal(pointsAtGithub('https://colab.research.google.com/drive/1AbCdEfG'), false);
  assert.equal(pointsAtGithub('https://github.com'), false);
  assert.equal(pointsAtGithub('not a url'), false);
});
