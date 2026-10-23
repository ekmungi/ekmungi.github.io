// Site test for images: no JPEG, PNG or WebP image in the builds, in public/ or in src/ carries metadata (Exif, XMP, IPTC, PNG text chunks),
// and no image is in a format whose metadata the check cannot read. The launch gate runs the same check on the production build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPO_ROOT } from '../helpers.mjs';
import { imageMetadataProblems } from '../image-metadata.mjs';

// Both builds and the folders they are built from: public/ is copied as it is, and src/ holds the content and any images posts use.
const IMAGE_FOLDERS = ['dist', 'dist-test', 'public', 'src'];

test('no image in the builds, public/ or src/ carries metadata', () => {
  const problems = imageMetadataProblems(REPO_ROOT, IMAGE_FOLDERS);
  assert.deepEqual(problems, [], `Remove all metadata from these images (see the README):\n${problems.join('\n')}`);
});
