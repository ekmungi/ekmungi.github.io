// Builds every fixture in tests/fixtures/definitions.mjs, one after the other, before the site tests run (npm run build:fixtures).
// The builds run in sequence because they share Astro's cache folders. Each outcome is saved beside the build so a test can read it.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';
import { FIXTURE_ROOT, buildFixture, writeFixture } from '../fixture-build.mjs';
import { FIXTURES } from './definitions.mjs';

// On Windows a virus scanner or the search indexer can hold a file in .astro/ for a moment, so a rename there fails with EPERM or EBUSY.
// A build that fails that way is run once more; every other failure counts as it is.
const FILE_LOCK = /\b(EPERM|EBUSY)\b/;

/**
 * Build one fixture, once more if the first attempt failed only because a file was locked.
 * @param {string} name - the fixture's name.
 * @param {boolean} drafts - whether drafts are shown.
 * @returns {{ status: number | null, output: string }} the outcome of the last attempt.
 */
function buildWithRetry(name, drafts) {
  const first = buildFixture(name, { drafts });
  if (first.status === 0 || !FILE_LOCK.test(first.output)) return first;
  console.log(`fixture ${name}: a file was locked, building again`);
  return buildFixture(name, { drafts });
}

/**
 * Build every fixture and record its outcome in fixture-builds/<name>/result.json.
 * @returns {string[]} one message per fixture whose build did not end the way its definition expects.
 */
function buildAll() {
  rmSync(join(REPO_ROOT, FIXTURE_ROOT), { recursive: true, force: true });
  const surprises = [];
  for (const [name, { drafts, expect, files, publicFiles }] of Object.entries(FIXTURES)) {
    writeFixture(name, files, publicFiles);
    const { status, output } = buildWithRetry(name, drafts);
    const outcome = status === 0 ? 'pass' : 'fail';
    mkdirSync(join(REPO_ROOT, FIXTURE_ROOT, name), { recursive: true });
    writeFileSync(join(REPO_ROOT, FIXTURE_ROOT, name, 'result.json'), JSON.stringify({ status, output }, null, 2));
    console.log(`fixture ${name}: build ${outcome === 'pass' ? 'succeeded' : 'failed'} (expected to ${expect === 'pass' ? 'succeed' : 'fail'})`);
    if (outcome !== expect) surprises.push(`The fixture build "${name}" was expected to ${expect === 'pass' ? 'succeed' : 'fail'}:\n${output}`);
  }
  return surprises;
}

const surprises = buildAll();
if (surprises.length > 0) {
  console.error(surprises.join('\n\n'));
  process.exit(1);
}
