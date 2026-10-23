// Smoke tests: the production build produced a home page, and no Jekyll files remain in the repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { loadPage, REPO_ROOT } from '../helpers.mjs';

test('home page is built', () => {
  const page = loadPage('dist', '/');
  assert.ok(page.querySelector('html'));
});

test('no Jekyll leftovers are tracked', () => {
  // Run git from the repo root so the answer does not depend on where the tests were started.
  const tracked = execSync('git ls-files', { cwd: REPO_ROOT }).toString().split(/\r?\n/);
  for (const leftover of ['_config.yml', '_posts/', '_layouts/', 'theme/']) {
    assert.ok(!tracked.some((file) => file.startsWith(leftover)), leftover);
  }
});
