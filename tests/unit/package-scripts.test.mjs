// Unit tests for the npm scripts: npm test runs everything but the launch gate, test:ci leaves out the tests that need the private lists, and the launch gate cannot pass without running a real test file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';

const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'));

test('npm test runs the unit, site and local tests and leaves out the launch gate', () => {
  assert.match(pkg.scripts.test, /tests\/unit/);
  assert.match(pkg.scripts.test, /tests\/site/);
  assert.match(pkg.scripts.test, /tests\/local/);
  assert.doesNotMatch(pkg.scripts.test, /launch/);
});

test('npm test builds the public site, the drafts build and the fixture builds before any test runs', () => {
  assert.match(pkg.scripts.test, /^npm run build && npm run build:test && npm run build:fixtures && node --test /);
  assert.equal(pkg.scripts['build:fixtures'], 'node tests/fixtures/build.mjs');
});

test('test:ci runs the same builds and the unit and site tests, and leaves out the local tests and the launch gate', () => {
  const script = pkg.scripts['test:ci'];
  assert.match(script, /^npm run build && npm run build:test && npm run build:fixtures && node --test /);
  assert.match(script, /"tests\/unit\/\*\*\/\*\.test\.mjs"/);
  assert.match(script, /"tests\/site\/\*\*\/\*\.test\.mjs"/);
  assert.doesNotMatch(script, /tests\/local|launch/);
});

test('no test outside tests/local reads a private list', () => {
  for (const folder of ['unit', 'site']) {
    for (const name of readdirSync(resolve(REPO_ROOT, 'tests', folder))) {
      const text = readFileSync(resolve(REPO_ROOT, 'tests', folder, name), 'utf8');
      // The unit tests of the loader write their own invented lists in a temporary folder, so they never read the real ones;
      // this file names the loaders only to look for them.
      if (name === 'private-lists.test.mjs' || name === 'package-scripts.test.mjs') continue;
      assert.ok(!/private-lists\.mjs|loadForbiddenTerms|loadAvoidedWording/.test(text), `tests/${folder}/${name} must not read a private list; put it in tests/local`);
    }
  }
});

test('check:launch builds production first and runs one named launch test file that exists', () => {
  const script = pkg.scripts['check:launch'];
  assert.match(script, /^npm run build && /, 'it builds the production site first');
  const files = [...script.matchAll(/(tests\/launch\/[\w.-]+\.test\.mjs)/g)].map((match) => match[1]);
  assert.ok(files.length > 0, 'it names a launch test file, not a pattern that could match nothing and pass');
  assert.doesNotMatch(script, /\*/, 'it uses no wildcard');
  for (const file of files) assert.ok(existsSync(resolve(REPO_ROOT, file)), `${file} exists`);
});

test('the launch test file defines the checks of the gate, so it cannot pass by finding nothing to run', () => {
  const text = readFileSync(resolve(REPO_ROOT, 'tests', 'launch', 'launch.test.mjs'), 'utf8');
  const names = [...text.matchAll(/^test\(\s*'([^']+)'/gm)].map((match) => match[1]);
  assert.ok(names.length >= 5, `the launch gate defines at least five tests, it has ${names.length}`);
  for (const wanted of [/placeholder/i, /draft|example/i, /link/i, /blog/i, /metadata/i]) {
    assert.ok(names.some((name) => wanted.test(name)), `a launch test covers ${wanted}`);
  }
  assert.ok(!names.some((name) => /portrait photo is in place|blog post is published/i.test(name)), 'the gate does not require a photo or a post');
});
