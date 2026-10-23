// Unit tests for src/lib/photo.ts: the build-time choice between the portrait file and the placeholder.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';
import { findPhoto } from '../../src/lib/photo.ts';

// Each test works in its own throwaway folder under the system temp folder; all are removed when the tests end.
const made = [];
after(() => made.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** Make an empty throwaway "public" folder and return its path. */
function makePublic() {
  const dir = mkdtempSync(join(tmpdir(), 'photo-test-'));
  made.push(dir);
  return dir;
}

test('findPhoto returns the address of the photo when public/images/photo.jpg exists', () => {
  const pub = makePublic();
  mkdirSync(join(pub, 'images'));
  writeFileSync(join(pub, 'images', 'photo.jpg'), 'x');
  assert.equal(findPhoto(pub), '/images/photo.jpg');
});

test('findPhoto returns null when the photo file does not exist', () => {
  const pub = makePublic();
  mkdirSync(join(pub, 'images'));
  assert.equal(findPhoto(pub), null);
});

test('findPhoto returns null when the public folder itself is missing', () => {
  assert.equal(findPhoto(join(makePublic(), 'no-such-folder')), null);
});

test('findPhoto returns null when photo.jpg is a folder, not a file', () => {
  const pub = makePublic();
  mkdirSync(join(pub, 'images', 'photo.jpg'), { recursive: true });
  assert.equal(findPhoto(pub), null);
});

test('findPhoto with no folder given looks in the public folder named by SITE_PUBLIC_DIR, which is how a fixture build gets its own photo', () => {
  const name = 'unit-photo-default';
  const folder = join(REPO_ROOT, 'fixture-builds', name, 'public');
  const original = process.env.SITE_PUBLIC_DIR;
  made.push(join(REPO_ROOT, 'fixture-builds', name));
  mkdirSync(join(folder, 'images'), { recursive: true });
  process.env.SITE_PUBLIC_DIR = `./fixture-builds/${name}/public`;
  try {
    assert.equal(findPhoto(), null, 'no photo in the fixture folder');
    writeFileSync(join(folder, 'images', 'photo.jpg'), 'x');
    assert.equal(findPhoto(), '/images/photo.jpg', 'the photo in the fixture folder');
  } finally {
    if (original === undefined) delete process.env.SITE_PUBLIC_DIR;
    else process.env.SITE_PUBLIC_DIR = original;
  }
});
