// Where the content collections and the public files are read from: src/content and public/, unless a test build points the site at its own
// fixture folders under fixture-builds/.

// The folders every real build reads.
const DEFAULT_CONTENT_DIR = './src/content';
const DEFAULT_PUBLIC_DIR = './public';

// The only other folders allowed: ./fixture-builds/<name>/content and ./fixture-builds/<name>/public, written by the site tests (and
// git-ignored). Anything else is refused, so the settings can never point a build at an unexpected place.
const FIXTURE_CONTENT_DIR = /^\.\/fixture-builds\/[a-z0-9-]+\/content$/;
const FIXTURE_PUBLIC_DIR = /^\.\/fixture-builds\/[a-z0-9-]+\/public$/;

/**
 * Pick the folder the content collections are read from.
 * @param env - the environment to read SITE_CONTENT_DIR from; defaults to the process environment when it exists.
 * @returns './src/content', or the fixture folder named by SITE_CONTENT_DIR.
 * @throws {Error} when SITE_CONTENT_DIR is set to anything other than a fixture folder.
 */
export function contentDir(env: Record<string, string | undefined> = processEnv()): string {
  const chosen = env.SITE_CONTENT_DIR;
  if (chosen === undefined || chosen === '') return DEFAULT_CONTENT_DIR;
  if (!FIXTURE_CONTENT_DIR.test(chosen)) {
    throw new Error(`SITE_CONTENT_DIR must be unset or of the form ./fixture-builds/<name>/content; it is "${chosen}".`);
  }
  return chosen;
}

/**
 * Pick the folder whose files are published as they are (the portrait photo, the pictures of posts).
 * @param env - the environment to read SITE_PUBLIC_DIR from; defaults to the process environment when it exists.
 * @returns './public', or the fixture folder named by SITE_PUBLIC_DIR.
 * @throws {Error} when SITE_PUBLIC_DIR is set to anything other than a fixture folder.
 */
export function publicDir(env: Record<string, string | undefined> = processEnv()): string {
  const chosen = env.SITE_PUBLIC_DIR;
  if (chosen === undefined || chosen === '') return DEFAULT_PUBLIC_DIR;
  if (!FIXTURE_PUBLIC_DIR.test(chosen)) {
    throw new Error(`SITE_PUBLIC_DIR must be unset or of the form ./fixture-builds/<name>/public; it is "${chosen}".`);
  }
  return chosen;
}

/**
 * Read the process environment defensively, so this module also loads where there is no `process`.
 * @returns the environment variables, or an empty object.
 */
function processEnv(): Record<string, string | undefined> {
  const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return nodeProcess?.env ?? {};
}
