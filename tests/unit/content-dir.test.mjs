// Unit tests for src/lib/content-dir.ts: the content folder is src/content and the public folder is public unless a fixture build names its own folders under fixture-builds/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentDir, publicDir } from '../../src/lib/content-dir.ts';

test('contentDir is ./src/content when SITE_CONTENT_DIR is unset or empty', () => {
  assert.equal(contentDir({}), './src/content');
  assert.equal(contentDir({ SITE_CONTENT_DIR: '' }), './src/content');
});

test('contentDir accepts a fixture folder of the form ./fixture-builds/<name>/content', () => {
  assert.equal(contentDir({ SITE_CONTENT_DIR: './fixture-builds/no-posts/content' }), './fixture-builds/no-posts/content');
});

test('contentDir refuses any other folder, so a build cannot be pointed somewhere unexpected', () => {
  for (const value of ['./elsewhere/content', '../fixture-builds/a/content', './fixture-builds/../src/content', 'C:/fixture-builds/a/content', './fixture-builds/A B/content']) {
    assert.throws(() => contentDir({ SITE_CONTENT_DIR: value }), /SITE_CONTENT_DIR/, value);
  }
});

test('publicDir is ./public when SITE_PUBLIC_DIR is unset or empty', () => {
  assert.equal(publicDir({}), './public');
  assert.equal(publicDir({ SITE_PUBLIC_DIR: '' }), './public');
});

test('publicDir accepts a fixture folder of the form ./fixture-builds/<name>/public', () => {
  assert.equal(publicDir({ SITE_PUBLIC_DIR: './fixture-builds/with-photo/public' }), './fixture-builds/with-photo/public');
});

test('publicDir refuses any other folder, so a build cannot publish files from an unexpected place', () => {
  for (const value of ['./elsewhere/public', '../fixture-builds/a/public', './fixture-builds/../src/public', 'C:/fixture-builds/a/public', './fixture-builds/A B/public', './fixture-builds/a/content']) {
    assert.throws(() => publicDir({ SITE_PUBLIC_DIR: value }), /SITE_PUBLIC_DIR/, value);
  }
});
