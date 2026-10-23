// Launch gate: fails while anything unfinished is visible in the production build (a placeholder, a draft or example title, a link to a page
// that is not built, a link to the blog while no post is published, or an image with metadata). It asks for no photo, no post and no story:
// those parts stay hidden until their content exists. Run with: npm run check:launch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';
import { imageMetadataProblems, isJpeg, jpegMetadataKinds } from '../image-metadata.mjs';
import { draftTitles, exampleTitles, photoPresent, placeholderHits, publishedPostPages, readPhoto, titleHits } from '../launch-scan.mjs';
import { brokenLinks, linksToBlog } from '../link-scan.mjs';

// The production build folder (no drafts) and the content folder the draft and example titles are read from.
const PRODUCTION_BUILD = 'dist';
const CONTENT_DIR = resolve(REPO_ROOT, 'src/content');

// The folders whose images are checked for metadata: the production build, and the sources it is built from.
const IMAGE_FOLDERS = ['dist', 'public', 'src'];

/**
 * Write a list of hits as an indented bullet list for a failure message.
 * @param {string[]} lines - one hit per line.
 * @returns {string} the lines, each starting with "  - ".
 */
const bullets = (lines) => lines.map((line) => `  - ${line}`).join('\n');

test('no [data-placeholder] mark is visible in the production build', () => {
  const placeholders = placeholderHits(PRODUCTION_BUILD);
  assert.equal(placeholders.length, 0, `Unfinished text is visible. A page must leave out its unwritten parts instead of marking them:\n${bullets(placeholders)}`);
});

test('no draft title and no example title is visible in the production build', () => {
  const titles = [...new Set([...draftTitles(CONTENT_DIR), ...exampleTitles(CONTENT_DIR)])];
  const hits = titleHits(PRODUCTION_BUILD, titles);
  assert.equal(hits.length, 0, `A draft or example title is visible. Delete the entry, or set draft: false once it is real:\n${bullets(hits)}`);
});

test('nothing in the production build links to a page or file that is not built', () => {
  const broken = brokenLinks(PRODUCTION_BUILD);
  assert.equal(broken.length, 0, `These links lead nowhere:\n${bullets(broken)}`);
});

test('the blog is linked only once a post is published', () => {
  const posts = publishedPostPages(PRODUCTION_BUILD);
  const links = linksToBlog(PRODUCTION_BUILD);
  if (posts.length > 0) return;
  assert.equal(links.length, 0, `No post is published, so nothing may link to the blog:\n${bullets(links)}`);
});

test('the portrait photo, when there is one, is a JPEG without Exif, XMP or IPTC metadata', { skip: !photoPresent(REPO_ROOT) && 'there is no photo, so the landing page shows none' }, () => {
  const photo = readPhoto(REPO_ROOT);
  assert.ok(isJpeg(photo), 'public/images/photo.jpg is not a JPEG file. Export the portrait as a JPEG.');
  const kinds = jpegMetadataKinds(photo);
  assert.equal(
    kinds.length,
    0,
    `public/images/photo.jpg contains ${kinds.join(', ')} metadata, which can hold the place and time the photo was taken. Remove all metadata (see the README), then add the photo again.`,
  );
});

test('no image in the production build or its sources carries metadata', () => {
  const problems = imageMetadataProblems(REPO_ROOT, IMAGE_FOLDERS);
  assert.equal(
    problems.length,
    0,
    `These images carry metadata, which can hold the place and time a picture was taken. Remove all metadata (see the README):\n${bullets(problems)}`,
  );
});
