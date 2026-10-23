// Profile files for the fixture builds: the real profile's header fields (so the page builds) with an invented story, so a fixture shows
// the profile in a known state (story still a placeholder, or story written) whatever the real story is today.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';

// The story as a placeholder, marked the way the real profile marks an unwritten story.
export const PLACEHOLDER_STORY = '<p data-placeholder="story">Fixture story, still to be written.</p>';

// An invented written story: one plain paragraph with no mark.
export const WRITTEN_STORY = 'Fixture story: one invented paragraph that stands in for the written story.';

/**
 * Write a profile file: the header of the real src/content/profile/profile.md followed by the given story.
 * @param {string} story - the body of the file (the Story frame's content).
 * @returns {string} the file text.
 * @throws {Error} when the real profile has no front-matter header to copy.
 */
export function profileWithStory(story) {
  const raw = readFileSync(join(REPO_ROOT, 'src', 'content', 'profile', 'profile.md'), 'utf8');
  const header = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (!header) throw new Error('src/content/profile/profile.md has no front-matter header to copy.');
  return `${header[0]}\n${story}\n`;
}
