// Checks that package-lock.json resolves every dependency it declares, the way newer npm versions do
// before `npm ci`, so a lockfile written by an older npm cannot break the publishing build again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';

/**
 * Find where a dependency resolves for a package in the lockfile, following Node's lookup order:
 * the package's own node_modules first, then each parent's, then the top level.
 * @param {Record<string, object>} packages - The lockfile's `packages` map.
 * @param {string} from - The path of the package that declares the dependency ("" for the project).
 * @param {string} name - The dependency's name.
 * @returns {string|null} The lockfile path that satisfies it, or null when none exists.
 */
function resolveInLock(packages, from, name) {
  let base = from;
  for (;;) {
    const candidate = base ? `${base}/node_modules/${name}` : `node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const cut = base.lastIndexOf('/node_modules/');
    base = cut === -1 ? '' : base.slice(0, cut);
  }
}

/**
 * List every declared dependency that the lockfile cannot resolve.
 * Optional peer dependencies are skipped, because npm does not require them to be present.
 * @param {{packages: Record<string, object>}} lock - The parsed lockfile.
 * @returns {string[]} One "package -> dependency" line per missing entry.
 */
function missingEntries(lock) {
  const missing = [];
  for (const [path, pkg] of Object.entries(lock.packages)) {
    if (pkg.link) continue;
    const optionalPeers = pkg.peerDependenciesMeta ?? {};
    const peers = Object.keys(pkg.peerDependencies ?? {}).filter((n) => !optionalPeers[n]?.optional);
    const names = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.optionalDependencies ?? {}),
      ...peers,
    ]);
    for (const name of names) {
      if (!resolveInLock(lock.packages, path, name)) missing.push(`${path || '(project)'} -> ${name}`);
    }
  }
  return missing;
}

test('resolveInLock follows the package, its parents, then the top level', () => {
  const packages = {
    '': {},
    'node_modules/a': {},
    'node_modules/a/node_modules/b': {},
    'node_modules/c': {},
  };
  assert.equal(resolveInLock(packages, 'node_modules/a', 'b'), 'node_modules/a/node_modules/b');
  assert.equal(resolveInLock(packages, 'node_modules/a/node_modules/b', 'c'), 'node_modules/c');
  assert.equal(resolveInLock(packages, 'node_modules/c', 'b'), null);
});

test('missingEntries reports a dependency with no entry anywhere', () => {
  const lock = { packages: { '': { dependencies: { a: '1' } }, 'node_modules/a': { optionalDependencies: { z: '1' } } } };
  assert.deepEqual(missingEntries(lock), ['node_modules/a -> z']);
});

test('package-lock.json resolves every dependency it declares', () => {
  const lock = JSON.parse(readFileSync(join(REPO_ROOT, 'package-lock.json'), 'utf8'));
  assert.deepEqual(missingEntries(lock), [], 'Regenerate the lockfile with a current npm: npx npm@latest install --package-lock-only');
});
