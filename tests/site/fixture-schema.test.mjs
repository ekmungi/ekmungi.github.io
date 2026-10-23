// Site test on a fixture build (npm run build:fixtures): a real build refuses a post whose title is only spaces, and says which field is wrong.
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
