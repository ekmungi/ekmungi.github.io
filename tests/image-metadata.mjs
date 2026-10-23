// Test helper for image metadata: finds the metadata that can hold the place or time a picture was taken in JPEG (Exif, XMP, IPTC),
// PNG (eXIf, iTXt, tEXt and zTXt chunks) and WebP files (EXIF and XMP chunks), and lists the images of a set of folders that carry any.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

// The JPEG header segments that can carry the place or time of a photo, with the marker byte and the identifier that starts their data:
// Exif (APP1, "Exif" and two zero bytes), XMP (APP1, the Adobe XMP namespace address) and IPTC (APP13, the "Photoshop 3.0" block).
const JPEG_SEGMENTS = [
  { kind: 'Exif', marker: 0xe1, identifier: Buffer.from('Exif\0\0', 'latin1') },
  { kind: 'XMP', marker: 0xe1, identifier: Buffer.from('http://ns.adobe.com/xap/1.0/', 'latin1') },
  { kind: 'IPTC', marker: 0xed, identifier: Buffer.from('Photoshop 3.0', 'latin1') },
];

// The PNG chunks that hold Exif data or free text (XMP travels in an iTXt chunk), in the order they are reported.
const PNG_METADATA_CHUNKS = ['eXIf', 'iTXt', 'tEXt', 'zTXt'];

// The eight bytes every PNG file starts with.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// The WebP chunks that hold metadata, and the name each is reported under.
const WEBP_METADATA_CHUNKS = [
  ['EXIF', 'Exif'],
  ['XMP ', 'XMP'],
];

// File name endings of the images this check reads, and of images it cannot read (they can carry metadata too, so they are refused).
const READABLE_IMAGES = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const UNREADABLE_IMAGES = new Set(['.gif', '.avif', '.heic', '.heif', '.tif', '.tiff']);

/**
 * Tell whether bytes start like a JPEG file (the start-of-image marker followed by another marker).
 * @param {Buffer} buffer - the file content.
 * @returns {boolean} true for a JPEG signature.
 */
export function isJpeg(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

/**
 * Name the kinds of metadata a JPEG carries: Exif, XMP and IPTC. The header segments are walked one by one up to the start of the
 * picture data, so bytes inside the picture are never mistaken for a segment. Truncated or non-JPEG data gives an empty list.
 * @param {Buffer} buffer - the file content.
 * @returns {string[]} the kinds found ("Exif", "XMP", "IPTC"), each once, in that fixed order.
 */
export function jpegMetadataKinds(buffer) {
  const found = new Set();
  let offset = isJpeg(buffer) ? 2 : buffer.length;
  while (offset + 4 <= buffer.length && buffer[offset] === 0xff) {
    const marker = buffer[offset + 1];
    // A fill byte before a marker is skipped; the start of the picture data or the end of the image ends the header.
    if (marker === 0xff) offset += 1;
    else if (marker === 0xda || marker === 0xd9) break;
    // Markers with no length field.
    else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) offset += 2;
    else {
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      for (const { kind, marker: wanted, identifier } of JPEG_SEGMENTS) {
        if (marker === wanted && buffer.subarray(offset + 4, offset + 4 + identifier.length).equals(identifier)) found.add(kind);
      }
      offset += 2 + length;
    }
  }
  return JPEG_SEGMENTS.map(({ kind }) => kind).filter((kind) => found.has(kind));
}

/**
 * Name the metadata chunks a PNG carries, walking the chunks from the header to the end chunk.
 * @param {Buffer} buffer - the file content.
 * @returns {string[]} the chunk types found among eXIf, iTXt, tEXt and zTXt, each once, in that order; empty for other data.
 */
export function pngMetadataKinds(buffer) {
  const found = new Set();
  let offset = buffer.subarray(0, 8).equals(PNG_SIGNATURE) ? 8 : buffer.length;
  // Each chunk is a 4-byte length, a 4-byte type, the data and a 4-byte checksum.
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    if (type === 'IEND') break;
    if (PNG_METADATA_CHUNKS.includes(type)) found.add(type);
    offset += 12 + buffer.readUInt32BE(offset);
  }
  return PNG_METADATA_CHUNKS.filter((type) => found.has(type));
}

/**
 * Name the metadata chunks a WebP file carries, walking the chunks of its RIFF container.
 * @param {Buffer} buffer - the file content.
 * @returns {string[]} "Exif" and "XMP" when their chunks are present, each once, in that order; empty for other data.
 */
export function webpMetadataKinds(buffer) {
  const found = new Set();
  const isWebp = buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP';
  let offset = isWebp ? 12 : buffer.length;
  // Each chunk is a four-character code, a 4-byte little-endian size and the data, padded to an even length.
  while (offset + 8 <= buffer.length) {
    const fourcc = buffer.toString('latin1', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const match = WEBP_METADATA_CHUNKS.find(([code]) => code === fourcc);
    if (match) found.add(match[1]);
    offset += 8 + size + (size % 2);
  }
  return WEBP_METADATA_CHUNKS.map(([, kind]) => kind).filter((kind) => found.has(kind));
}

/**
 * Check one image file. The bytes decide the format, so a PNG saved under a .jpg name is still read correctly.
 * @param {string} shown - the path to name in the message.
 * @param {Buffer} buffer - the file content.
 * @returns {string | null} what is wrong with the file, or null when it is fine or is not an image this check covers.
 */
export function imageProblem(shown, buffer) {
  const ending = extname(shown).toLowerCase();
  if (UNREADABLE_IMAGES.has(ending)) return `${shown} is a ${ending.slice(1).toUpperCase()} image, whose metadata this check cannot read. Save it as JPEG, PNG or WebP without metadata.`;
  if (!READABLE_IMAGES.has(ending)) return null;
  let kinds;
  if (isJpeg(buffer)) kinds = jpegMetadataKinds(buffer);
  else if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) kinds = pngMetadataKinds(buffer);
  else if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') kinds = webpMetadataKinds(buffer);
  else return `${shown} is not a JPEG, PNG or WebP file, so its metadata cannot be checked.`;
  return kinds.length > 0 ? `${shown} contains ${kinds.join(', ')} metadata` : null;
}

/**
 * List every file under a folder, at any depth.
 * @param {string} dir - an absolute folder path.
 * @returns {string[]} absolute file paths, sorted; empty when the folder does not exist.
 */
function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]))
    .sort();
}

/**
 * Check every image in some folders of the repository.
 * @param {string} root - the repository folder.
 * @param {string[]} folders - folders relative to the root, for example ["dist", "public", "src"]; a missing folder is skipped.
 * @returns {string[]} one message per image with a problem, paths relative to the root with forward slashes.
 */
export function imageMetadataProblems(root, folders) {
  const isImage = (file) => READABLE_IMAGES.has(extname(file).toLowerCase()) || UNREADABLE_IMAGES.has(extname(file).toLowerCase());
  return folders.flatMap((folder) =>
    filesUnder(join(root, folder))
      .filter(isImage)
      .map((file) => imageProblem(relative(root, file).replaceAll('\\', '/'), readFileSync(file)))
      .filter((problem) => problem !== null),
  );
}
