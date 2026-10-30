// Site tests on fixture builds (npm run build:fixtures): a real build refuses a post whose title is only spaces and says which field is
// wrong, and refuses a project whose diagram file is missing and names the file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';
import { FIXTURE_ROOT } from '../fixture-build.mjs';

test('astro build fails on a post without a title, and the message names the title', () => {
  const { status, output } = JSON.parse(readFileSync(join(REPO_ROOT, FIXTURE_ROOT, 'no-title', 'result.json'), 'utf8'));
  assert.notEqual(status, 0, 'the build failed');
  assert.match(output, /A post needs a title/);
});

test('astro build fails on a project whose diagram file does not exist, and the message names the file', () => {
  const { status, output } = JSON.parse(readFileSync(join(REPO_ROOT, FIXTURE_ROOT, 'missing-diagram', 'result.json'), 'utf8'));
  assert.notEqual(status, 0, 'the build failed');
  assert.match(output, /fixture-missing\.svg/);
});
