// Unit tests for src/lib/content.ts: which entries are published, when unfinished text may show, whether the profile story is written, and how posts are ordered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublished, draftsVisible, placeholdersVisible, sortByDateDesc, storyIsWritten } from '../../src/lib/content.ts';

/** Run a function with INCLUDE_DRAFTS set to a value (or removed), then restore the original. */
function withIncludeDrafts(value, fn) {
  const original = process.env.INCLUDE_DRAFTS;
  if (value === undefined) delete process.env.INCLUDE_DRAFTS;
  else process.env.INCLUDE_DRAFTS = value;
  try {
    return fn();
  } finally {
    if (original === undefined) delete process.env.INCLUDE_DRAFTS;
    else process.env.INCLUDE_DRAFTS = original;
  }
}

const entry = (draft) => ({ data: { draft } });
const post = (title, date) => ({ data: { title, date: new Date(date) } });

test('isPublished hides drafts unless INCLUDE_DRAFTS=1', () => {
  withIncludeDrafts(undefined, () => assert.equal(isPublished(entry(true)), false));
  withIncludeDrafts('0', () => assert.equal(isPublished(entry(true)), false));
  withIncludeDrafts('true', () => assert.equal(isPublished(entry(true)), false));
  withIncludeDrafts('1', () => assert.equal(isPublished(entry(true)), true));
});

test('isPublished always shows a finished entry, whatever INCLUDE_DRAFTS says', () => {
  withIncludeDrafts(undefined, () => assert.equal(isPublished(entry(false)), true));
  withIncludeDrafts('1', () => assert.equal(isPublished(entry(false)), true));
});

test('isPublished treats an entry with no draft flag as published', () => {
  withIncludeDrafts(undefined, () => assert.equal(isPublished({ data: {} }), true));
});

test('draftsVisible: drafts show in development and in production only with INCLUDE_DRAFTS=1', () => {
  assert.equal(draftsVisible({ prod: false, includeDrafts: undefined }), true);
  assert.equal(draftsVisible({ prod: true, includeDrafts: undefined }), false);
  assert.equal(draftsVisible({ prod: true, includeDrafts: '0' }), false);
  assert.equal(draftsVisible({ prod: true, includeDrafts: '1' }), true);
  assert.equal(draftsVisible({ prod: undefined, includeDrafts: undefined }), false, 'outside Vite counts as production');
});

test('placeholdersVisible follows the drafts: shown only when drafts are shown, never in a plain production build', () => {
  withIncludeDrafts(undefined, () => assert.equal(placeholdersVisible(), false));
  withIncludeDrafts('0', () => assert.equal(placeholdersVisible(), false));
  withIncludeDrafts('true', () => assert.equal(placeholdersVisible(), false));
  withIncludeDrafts('1', () => assert.equal(placeholdersVisible(), true));
});

test('storyIsWritten is false for no story, a blank story and any story that still has a data-placeholder mark', () => {
  assert.equal(storyIsWritten(undefined), false);
  assert.equal(storyIsWritten(''), false);
  assert.equal(storyIsWritten('  \n\n '), false);
  assert.equal(storyIsWritten('<p data-placeholder="story">Still to be written.</p>'), false);
  assert.equal(storyIsWritten('A real paragraph.\n\n<p data-placeholder="more">More to come.</p>'), false, 'a half-written story is not written');
});

test('storyIsWritten is true for plain text', () => {
  assert.equal(storyIsWritten('A real paragraph.'), true);
  assert.equal(storyIsWritten('\nFirst.\n\nSecond.\n'), true);
});

test('sortByDateDesc puts newer posts first', () => {
  const sorted = sortByDateDesc([post('Old', '2025-01-01'), post('New', '2026-10-21'), post('Mid', '2026-01-01')]);
  assert.deepEqual(sorted.map((x) => x.data.title), ['New', 'Mid', 'Old']);
});

test('sortByDateDesc breaks ties by title A to Z', () => {
  const sorted = sortByDateDesc([post('Beta', '2026-10-21'), post('alpha', '2026-10-21'), post('Gamma', '2026-10-21')]);
  assert.deepEqual(sorted.map((x) => x.data.title), ['alpha', 'Beta', 'Gamma']);
});

test('sortByDateDesc returns a new array and leaves the input order alone', () => {
  const input = [post('B', '2025-01-01'), post('A', '2026-01-01')];
  const sorted = sortByDateDesc(input);
  assert.notEqual(sorted, input);
  assert.deepEqual(input.map((x) => x.data.title), ['B', 'A']);
});
