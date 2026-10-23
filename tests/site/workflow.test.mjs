// Site test for the publishing workflow: push to master only, one run at a time, every action pinned to a commit SHA, least permissions per job, the tests and the launch gate before anything is built for publishing, and weekly Dependabot updates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';

// The only actions the workflow may use, with the major version each pinned commit stands for. Every one is pinned to a full commit SHA
// with its version in a comment. Only the major version is compared, because Dependabot may write the comment as "# v7.2.0".
const EXPECTED_ACTIONS = {
  'actions/checkout': 'v7',
  'actions/setup-node': 'v7',
  'actions/deploy-pages': 'v5',
  'withastro/action': 'v6',
};

// A pinned action line: "uses: owner/name@<40 hex characters> # v<version>".
const PINNED_USES = /^\s*(?:-\s*)?uses:\s*([\w.-]+\/[\w./-]+)@([0-9a-f]{40})\s+#\s*(v\d+(?:\.\d+)*)\s*$/;

/**
 * Reduce a version comment to its major version.
 * @param {string} version - for example "v7", "v7.1" or "v7.2.0".
 * @returns {string} the major version, for example "v7".
 */
function majorOf(version) {
  return version.split('.')[0];
}

test('majorOf keeps only the major version, so "# v7", "# v7.1" and "# v7.2.0" all stand for v7', () => {
  assert.deepEqual(['v7', 'v7.1', 'v7.2.0'].map(majorOf), ['v7', 'v7', 'v7']);
  assert.notEqual(majorOf('v8.0.0'), 'v7');
});

/**
 * Read the workflow file.
 * @returns {string} its text with line endings normalised to "\n".
 */
function workflowText() {
  return readFileSync(resolve(REPO_ROOT, '.github/workflows/deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Remove comments from workflow text: a "#" starts a comment when it begins the line or follows whitespace.
 * @param {string} text - workflow text.
 * @returns {string} the text without comments, line breaks kept.
 */
function withoutComments(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/(^|\s)#.*$/, '$1').trimEnd())
    .join('\n');
}

/**
 * Count the leading spaces of a line.
 * @param {string} line - one line of text.
 * @returns {number} the indent.
 */
function indentOf(line) {
  return line.length - line.trimStart().length;
}

/**
 * Follow a path of keys through indented YAML (for example ["on", "push", "branches"]) and describe the last key.
 * Each key is looked for only among the children of the key before it, so a "branches" line under another trigger is never read as push's.
 * @param {string} text - workflow text without comments.
 * @param {string[]} path - the keys to follow, outermost first.
 * @returns {{ value: string, children: string[], keys: string[] } | null} the text after the colon on the key's own line, the trimmed lines nested below it, and the names of its direct child keys; null when the path does not exist.
 */
function lookup(text, path) {
  let lines = text.split('\n').filter((line) => line.trim() !== '');
  let result = null;
  for (const key of path) {
    const keyIndent = Math.min(...lines.map(indentOf));
    const first = lines.findIndex((line) => indentOf(line) === keyIndent && line.trim().startsWith(`${key}:`));
    if (first === -1) return null;
    const rest = lines.slice(first + 1);
    const end = rest.findIndex((line) => indentOf(line) <= keyIndent);
    const children = end === -1 ? rest : rest.slice(0, end);
    const childIndent = Math.min(...children.map(indentOf));
    result = {
      value: lines[first].trim().slice(key.length + 1).trim(),
      children: children.map((line) => line.trim()),
      keys: children.filter((line) => indentOf(line) === childIndent && /^[\w-]+:/.test(line.trim())).map((line) => line.trim().split(':')[0]),
    };
    lines = children;
  }
  return result;
}

/**
 * Sort the "uses:" lines of a workflow into pinned and unpinned ones.
 * @param {string} text - the workflow text including its comments (the version is written in a comment).
 * @returns {{ pinned: { name: string, sha: string, version: string }[], unpinned: string[] }} the pinned actions, and the trimmed text of every "uses:" line that is not "name@<40 hex> # vN".
 */
function pinnedActions(text) {
  const usesLines = text.split('\n').filter((line) => /^\s*(?:-\s*)?uses:/.test(line));
  const pinned = [];
  const unpinned = [];
  for (const line of usesLines) {
    const match = PINNED_USES.exec(line);
    if (match) pinned.push({ name: match[1], sha: match[2], version: match[3] });
    else unpinned.push(line.trim());
  }
  return { pinned, unpinned };
}

test('pinnedActions accepts "name@<40 hex> # vN" and reports a tag, a short hash or a missing version comment as unpinned', () => {
  const sha = 'a'.repeat(40);
  const text = [
    `      - uses: owner/one@${sha} # v1`,
    `        uses: owner/two@${sha}   # v2.3`,
    '        uses: owner/three@v4',
    `        uses: owner/four@${'b'.repeat(39)} # v1`,
    `        uses: owner/five@${sha}`,
    `        uses: owner/six@${sha} # latest`,
  ].join('\n');
  const { pinned, unpinned } = pinnedActions(text);
  assert.deepEqual(pinned.map(({ name, version }) => `${name} ${version}`), ['owner/one v1', 'owner/two v2.3']);
  assert.equal(unpinned.length, 4);
  assert.ok(unpinned[0].startsWith('uses: owner/three@v4'));
});

test('withoutComments drops whole-line and trailing comments but keeps a # inside a value', () => {
  assert.equal(withoutComments('# top\nkey: value # note\nurl: a#b\n'), '\nkey: value\nurl: a#b\n');
});

test('lookup follows a key path, returns the inline value and the nested lines, and stops at the next sibling', () => {
  const text = 'a:\n  x: 1\n\n  y:\n    z: 2\nb:\n  x: 3\n';
  assert.deepEqual(lookup(text, ['a']), { value: '', children: ['x: 1', 'y:', 'z: 2'], keys: ['x', 'y'] });
  assert.deepEqual(lookup(text, ['a', 'x']), { value: '1', children: [], keys: [] });
  assert.deepEqual(lookup(text, ['a', 'y', 'z']), { value: '2', children: [], keys: [] });
  assert.deepEqual(lookup(text, ['b', 'x']), { value: '3', children: [], keys: [] });
  assert.equal(lookup(text, ['a', 'missing']), null);
  assert.equal(lookup(text, ['missing']), null);
});

test('lookup does not read a branches line under pull_request as the push trigger', () => {
  const onlyPullRequest = 'on:\n  pull_request:\n    branches: [master]\n  push:\n    paths: [src]\n';
  assert.equal(lookup(onlyPullRequest, ['on', 'push', 'branches']), null);
  assert.equal(lookup(onlyPullRequest, ['on', 'pull_request', 'branches']).value, '[master]');
});

test('workflow publishes from master with the pinned actions', () => {
  const text = withoutComments(workflowText());
  // Trigger: the push trigger itself is limited to master, and the workflow can be started by hand. Nothing else triggers it.
  assert.equal(lookup(text, ['on', 'push', 'branches']).value, '[master]', 'the push trigger is limited to the master branch');
  assert.ok(lookup(text, ['on', 'workflow_dispatch']), 'the workflow can be started by hand');
  assert.deepEqual(lookup(text, ['on']).keys.sort(), ['push', 'workflow_dispatch']);
  // Actions: every "uses:" is a full commit SHA followed by a version comment, and these are the only actions.
  const { pinned, unpinned } = pinnedActions(workflowText());
  assert.deepEqual(unpinned, [], 'every action is pinned to a 40-character commit SHA with a "# v" comment');
  assert.deepEqual(Object.fromEntries(pinned.map(({ name, version }) => [name, majorOf(version)])), EXPECTED_ACTIONS);
  assert.equal(pinned.length, Object.keys(EXPECTED_ACTIONS).length, 'no action is used twice');
});

test('every workflow file in the repository pins every action it uses', () => {
  const folder = resolve(REPO_ROOT, '.github/workflows');
  const files = readdirSync(folder).filter((name) => /\.ya?ml$/.test(name));
  assert.ok(files.includes('deploy.yml'));
  for (const name of files) {
    assert.deepEqual(pinnedActions(readFileSync(resolve(folder, name), 'utf8')).unpinned, [], `${name} pins every action`);
  }
});

test('Dependabot proposes weekly updates for the GitHub Actions pins', () => {
  const text = withoutComments(readFileSync(resolve(REPO_ROOT, '.github/dependabot.yml'), 'utf8').replace(/\r\n/g, '\n'));
  assert.match(text, /^version: 2$/m);
  const update = lookup(text, ['updates']);
  assert.ok(update, 'an updates list exists');
  assert.ok(update.children.includes('- package-ecosystem: "github-actions"'), 'it watches github-actions');
  assert.ok(update.children.includes('directory: "/"'), 'it watches the repository root, where .github/workflows is found');
  assert.ok(update.children.includes('interval: "weekly"'), 'it checks weekly');
});

test('workflow gives each job only the permissions it needs', () => {
  const text = withoutComments(workflowText());
  assert.deepEqual(lookup(text, ['permissions']).children, ['contents: read'], 'the default is read-only');
  assert.deepEqual(lookup(text, ['jobs', 'build', 'permissions']).children, ['contents: read']);
  assert.deepEqual(lookup(text, ['jobs', 'deploy', 'permissions']).children, ['pages: write', 'id-token: write']);
});

test('workflow runs the tests that need no private file and the launch gate before the Astro action builds and uploads the site', () => {
  const steps = lookup(withoutComments(workflowText()), ['jobs', 'build', 'steps']).children;
  const at = (pattern) => steps.findIndex((line) => pattern.test(line));
  const order = [
    at(/uses: actions\/checkout@/),
    at(/uses: actions\/setup-node@/),
    at(/run: npm ci$/),
    at(/run: npm run test:ci$/),
    at(/run: npm run check:launch$/),
    at(/uses: withastro\/action@/),
  ];
  assert.ok(order.every((index) => index !== -1), 'checkout, Node setup, npm ci, test:ci, the launch gate and the Astro action are all steps of the build job');
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'they run in that order');
});

test('the checkout keeps no credentials and fetches the history the privacy page test compares against', () => {
  const steps = lookup(withoutComments(workflowText()), ['jobs', 'build', 'steps']).children;
  const start = steps.findIndex((line) => /uses: actions\/checkout@/.test(line));
  const next = steps.findIndex((line, index) => index > start && line.startsWith('- '));
  const checkout = steps.slice(start, next === -1 ? undefined : next);
  assert.ok(checkout.includes('persist-credentials: false'), 'the token is not left in the checkout');
  assert.ok(checkout.includes('fetch-depth: 0'), 'the whole history is fetched');
});

test('workflow publishes one run at a time and never cancels a running publish', () => {
  const text = withoutComments(workflowText());
  assert.equal(lookup(text, ['concurrency', 'group']).value, 'pages');
  assert.equal(lookup(text, ['concurrency', 'cancel-in-progress']).value, 'false');
});

test('workflow builds first and deploys to the github-pages environment only after the build', () => {
  const text = withoutComments(workflowText());
  assert.ok(lookup(text, ['jobs', 'build']), 'a build job exists');
  assert.equal(lookup(text, ['jobs', 'deploy', 'needs']).value, 'build', 'the deploy job waits for the build job');
  assert.equal(lookup(text, ['jobs', 'deploy', 'environment', 'name']).value, 'github-pages');
});
