// Unit tests for tests/image-metadata.mjs: finding metadata in JPEG, PNG and WebP files, built here from synthetic bytes, and listing the
// images of a folder that carry it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { imageMetadataProblems, imageProblem, isJpeg, jpegMetadataKinds, pngMetadataKinds, webpMetadataKinds } from '../image-metadata.mjs';

// Building blocks for tiny synthetic JPEG files: start of image, a JFIF header segment, a scan and the end of image.
const SOI = [0xff, 0xd8];
const APP0_JFIF = [0xff, 0xe0, 0x00, 0x10, ...Buffer.from('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0];
const SCAN = [0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0xff, 0xd9];

/**
 * Build a JPEG header segment whose data starts with the given identifier.
 * @param {number} marker - the second marker byte: 0xE1 for APP1 (Exif, XMP), 0xED for APP13 (IPTC), 0xE2 for APP2.
 * @param {string} identifier - the text that starts the segment data, for example "Exif\0\0".
 * @returns {number[]} the segment bytes, marker and length included.
 */
function segment(marker, identifier) {
  const data = [...Buffer.from(identifier, 'latin1'), 0x4d, 0x4d, 0x00, 0x2a];
  return [0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 0xff, ...data];
}

// The identifiers that start the three kinds of JPEG metadata that can hold the place or time of a photo.
const EXIF = 'Exif\0\0';
const XMP = 'http://ns.adobe.com/xap/1.0/\0';
const IPTC = 'Photoshop 3.0\0';

/** A clean JPEG, with no metadata segment. */
const cleanJpeg = () => Buffer.from([...SOI, ...APP0_JFIF, ...SCAN]);

/**
 * Build a PNG file from chunks; the checksums are left as zero bytes, which the check does not read.
 * @param {[string, string][]} chunks - [type, data] pairs between the header chunk and the end chunk.
 * @returns {Buffer} the file bytes.
 */
function png(chunks) {
  const chunk = (type, data) => {
    const body = Buffer.from(data, 'latin1');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length);
    return Buffer.concat([length, Buffer.from(type, 'latin1'), body, Buffer.alloc(4)]);
  };
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk('IHDR', '\0'.repeat(13)), ...chunks.map(([type, data]) => chunk(type, data)), chunk('IDAT', 'xx'), chunk('IEND', '')]);
}

/**
 * Build a WebP file from chunks; a chunk of odd size gets its padding byte.
 * @param {[string, string][]} chunks - [fourcc, data] pairs.
 * @returns {Buffer} the file bytes.
 */
function webp(chunks) {
  const parts = chunks.map(([fourcc, data]) => {
    const body = Buffer.from(data, 'latin1');
    const size = Buffer.alloc(4);
    size.writeUInt32LE(body.length);
    return Buffer.concat([Buffer.from(fourcc, 'latin1'), size, body, Buffer.alloc(body.length % 2)]);
  });
  const payload = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...parts]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(payload.length);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), size, payload]);
}

test('isJpeg is true for a buffer that starts with the JPEG signature and false for anything else', () => {
  assert.equal(isJpeg(cleanJpeg()), true);
  assert.equal(isJpeg(Buffer.from('\x89PNG\r\n', 'latin1')), false);
  assert.equal(isJpeg(Buffer.alloc(0)), false);
});

test('jpegMetadataKinds is empty for a JPEG with no Exif, XMP or IPTC segment', () => {
  assert.deepEqual(jpegMetadataKinds(cleanJpeg()), []);
});

test('jpegMetadataKinds names an Exif, XMP or IPTC segment, wherever it sits before the scan', () => {
  assert.deepEqual(jpegMetadataKinds(Buffer.from([...SOI, ...APP0_JFIF, ...segment(0xe1, EXIF), ...SCAN])), ['Exif']);
  assert.deepEqual(jpegMetadataKinds(Buffer.from([...SOI, ...segment(0xe1, EXIF), ...APP0_JFIF, ...SCAN])), ['Exif']);
  assert.deepEqual(jpegMetadataKinds(Buffer.from([...SOI, ...APP0_JFIF, ...segment(0xe1, XMP), ...SCAN])), ['XMP']);
  assert.deepEqual(jpegMetadataKinds(Buffer.from([...SOI, ...APP0_JFIF, ...segment(0xed, IPTC), ...SCAN])), ['IPTC']);
});

test('jpegMetadataKinds lists each kind found once, in a fixed order, when a file carries several', () => {
  const all = [...SOI, ...segment(0xed, IPTC), ...APP0_JFIF, ...segment(0xe1, XMP), ...segment(0xe1, EXIF), ...segment(0xe1, EXIF), ...SCAN];
  assert.deepEqual(jpegMetadataKinds(Buffer.from(all)), ['Exif', 'XMP', 'IPTC']);
});

test('jpegMetadataKinds ignores segments that merely look similar: other APP1 data, an Exif identifier in the wrong marker, other APP markers', () => {
  const other = [...SOI, ...APP0_JFIF, ...segment(0xe1, 'something else\0'), ...segment(0xe2, EXIF), ...segment(0xed, 'not photoshop\0'), ...segment(0xe1, IPTC), ...SCAN];
  assert.deepEqual(jpegMetadataKinds(Buffer.from(other)), []);
});

test('jpegMetadataKinds does not read picture data after the scan starts, and copes with truncated or non-JPEG data', () => {
  const afterScan = [...SOI, ...APP0_JFIF, 0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, ...Buffer.from(EXIF), ...Buffer.from(XMP), 0xff, 0xd9];
  assert.deepEqual(jpegMetadataKinds(Buffer.from(afterScan)), []);
  assert.deepEqual(jpegMetadataKinds(Buffer.from([...SOI, 0xff, 0xe1, 0x00])), []);
  assert.deepEqual(jpegMetadataKinds(Buffer.from([...SOI, 0xff, 0xe1, 0x00, 0x02])), []);
  assert.deepEqual(jpegMetadataKinds(Buffer.from(`not a jpeg, ${EXIF}${XMP}`, 'latin1')), []);
});

test('pngMetadataKinds names the eXIf, iTXt, tEXt and zTXt chunks, each once and in a fixed order, and nothing in a clean PNG', () => {
  assert.deepEqual(pngMetadataKinds(png([])), []);
  assert.deepEqual(pngMetadataKinds(png([['pHYs', '\0'.repeat(9)], ['gAMA', '\0'.repeat(4)]])), [], 'chunks that hold no text or Exif are fine');
  assert.deepEqual(pngMetadataKinds(png([['zTXt', 'Comment\0\0xx'], ['tEXt', 'Software\0x'], ['eXIf', 'MM\0*'], ['iTXt', 'XML:com.adobe.xmp\0'], ['tEXt', 'Author\0y']])), [
    'eXIf',
    'iTXt',
    'tEXt',
    'zTXt',
  ]);
});

test('pngMetadataKinds stops at the end chunk and copes with truncated or non-PNG data', () => {
  const afterEnd = Buffer.concat([png([]), Buffer.from('\0\0\0\x02tEXtab\0\0\0\0', 'latin1')]);
  assert.deepEqual(pngMetadataKinds(afterEnd), []);
  assert.deepEqual(pngMetadataKinds(png([['tEXt', 'Comment\0x']]).subarray(0, 40)), []);
  assert.deepEqual(pngMetadataKinds(Buffer.from('tEXt eXIf', 'latin1')), []);
});

test('webpMetadataKinds names the EXIF and XMP chunks, handles odd-sized chunks and ignores the image chunks', () => {
  assert.deepEqual(webpMetadataKinds(webp([['VP8L', 'abc']])), []);
  assert.deepEqual(webpMetadataKinds(webp([['VP8X', '\0'.repeat(10)], ['VP8 ', 'abcde'], ['XMP ', '<x/>'], ['EXIF', 'MM\0*x']])), ['Exif', 'XMP']);
  assert.deepEqual(webpMetadataKinds(Buffer.from('RIFF\0\0\0\0WEBPEXIF', 'latin1')), [], 'a truncated chunk is not read');
  assert.deepEqual(webpMetadataKinds(Buffer.from('not a webp EXIF', 'latin1')), []);
});

test('imageProblem reports metadata, a file that is not the format its name says, and a format the check cannot read', () => {
  assert.equal(imageProblem('a.jpg', cleanJpeg()), null);
  assert.equal(imageProblem('a.JPEG', Buffer.from([...SOI, ...segment(0xe1, EXIF), ...SCAN])), 'a.JPEG contains Exif metadata');
  assert.equal(imageProblem('b.png', png([['tEXt', 'Software\0x']])), 'b.png contains tEXt metadata');
  assert.equal(imageProblem('c.webp', webp([['EXIF', 'MM']])), 'c.webp contains Exif metadata');
  assert.equal(imageProblem('d.png', cleanJpeg()), null, 'the bytes decide the format, not the name');
  assert.match(imageProblem('e.jpg', Buffer.from('plain text')), /e\.jpg is not a JPEG, PNG or WebP file/);
  assert.match(imageProblem('f.heic', Buffer.from('x')), /f\.heic .*cannot read/);
  assert.equal(imageProblem('g.svg', Buffer.from('<svg/>')), null, 'an SVG is text and is not an image this check reads');
});

test('imageMetadataProblems lists the images with metadata in the given folders, skipping a folder that does not exist', () => {
  const root = mkdtempSync(join(tmpdir(), 'image-metadata-'));
  try {
    mkdirSync(join(root, 'public', 'images', 'posts'), { recursive: true });
    writeFileSync(join(root, 'public', 'images', 'clean.jpg'), cleanJpeg());
    writeFileSync(join(root, 'public', 'images', 'posts', 'diagram.png'), png([['iTXt', 'XML:com.adobe.xmp\0']]));
    writeFileSync(join(root, 'public', 'notes.txt'), 'not an image');
    assert.deepEqual(imageMetadataProblems(root, ['public', 'missing']), ['public/images/posts/diagram.png contains iTXt metadata']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
