// Test helper for fixture builds: writes a small, invented content folder under fixture-builds/<name>/content (git-ignored) and builds the
// site from it into fixture-builds/<name>/dist, so a test can check one state of the site (no post published, drafts shown, a broken file)
// whatever the real content is today. The real src/content and public/ are never touched: a fixture has its own content folder and its own public folder.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './helpers.mjs';

// The git-ignored folder that holds every fixture's content and build.
export const FIXTURE_ROOT = 'fixture-builds';

// How long one build may take before the test gives up, in milliseconds.
const BUILD_TIMEOUT_MS = 240000;

/**
 * The build folder of a fixture, relative to the repository root, for loadPage and allHtmlFiles.
 * @param {string} name - the fixture's name (lower-case letters, digits and dashes).
 * @returns {string} for example "fixture-builds/no-posts/dist".
 */
export function fixtureOut(name) {
  return `${FIXTURE_ROOT}/${name}/dist`;
}

/**
 * Write a fixture's folders from scratch: its content folder (the real profile and research themes, because the profile page cannot build
 * without them, plus the invented files given, which may replace the copied profile) and its public folder (empty unless files are given).
 * @param {string} name - the fixture's name.
 * @param {Record<string, string>} files - path inside the content folder (for example "posts/a.md") to file text.
 * @param {Record<string, string | Buffer>} [publicFiles] - path inside the fixture's public folder (for example "images/photo.jpg") to file content.
 * @returns {string} the content folder in the form SITE_CONTENT_DIR expects, for example "./fixture-builds/no-posts/content".
 */
export function writeFixture(name, files, publicFiles = {}) {
  const content = join(REPO_ROOT, FIXTURE_ROOT, name, 'content');
  const publicDir = join(REPO_ROOT, FIXTURE_ROOT, name, 'public');
  rmSync(join(REPO_ROOT, FIXTURE_ROOT, name), { recursive: true, force: true });
  for (const folder of ['posts', 'projects']) mkdirSync(join(content, folder), { recursive: true });
  mkdirSync(publicDir, { recursive: true });
  for (const folder of ['profile', 'research']) cpSync(join(REPO_ROOT, 'src', 'content', folder), join(content, folder), { recursive: true });
  for (const [root, entries] of [[content, files], [publicDir, publicFiles]]) {
    for (const [path, data] of Object.entries(entries)) {
      const target = join(root, ...path.split('/'));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, data);
    }
  }
  return `./${FIXTURE_ROOT}/${name}/content`;
}

/**
 * Build the site from a fixture's content folder.
 * @param {string} name - the fixture's name; writeFixture must have run first.
 * @param {{ drafts?: boolean }} [options] - drafts: true builds like dist-test (drafts shown); otherwise like the production build.
 * @returns {{ status: number | null, output: string }} the exit status (0 for success) and everything the build printed.
 */
export function buildFixture(name, { drafts = false } = {}) {
  // The fixture's own public folder is named too, so whether the portrait photo exists never depends on the real public/ folder.
  const env = { ...process.env, SITE_CONTENT_DIR: `./${FIXTURE_ROOT}/${name}/content`, SITE_PUBLIC_DIR: `./${FIXTURE_ROOT}/${name}/public` };
  if (drafts) env.INCLUDE_DRAFTS = '1';
  else delete env.INCLUDE_DRAFTS;
  const build = spawnSync(process.execPath, [join(REPO_ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'build', '--outDir', fixtureOut(name)], {
    cwd: REPO_ROOT,
    env,
    encoding: 'utf8',
    timeout: BUILD_TIMEOUT_MS,
  });
  return { status: build.status, output: `${build.stdout ?? ''}\n${build.stderr ?? ''}` };
}

/**
 * Write a Markdown file: a front-matter block from the given lines, then the body.
 * @param {string[]} frontMatter - the front-matter lines, without the "---" fences.
 * @param {string} body - the text after the front matter.
 * @returns {string} the file text.
 */
export function markdown(frontMatter, body) {
  return ['---', ...frontMatter, '---', '', body, ''].join('\n');
}
