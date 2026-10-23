// Local test, run by npm test only because it reads the git-ignored phrase list in private/: the public README and CHANGELOG use none of its phrases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';
import { findWordingLines } from '../privacy-scan.mjs';
import { loadAvoidedWording } from '../private-lists.mjs';

test('README and CHANGELOG contain no avoided wording', () => {
  const phrases = loadAvoidedWording(REPO_ROOT);
  const hits = ['README.md', 'CHANGELOG.md'].flatMap((file) => {
    const lines = findWordingLines(readFileSync(resolve(REPO_ROOT, file), 'utf8'), phrases);
    return lines.length > 0 ? [`${file} (list line${lines.length === 1 ? '' : 's'} ${lines.join(', ')})`] : [];
  });
  assert.deepEqual(hits, [], `Avoided wording found:\n${hits.join('\n')}`);
});
