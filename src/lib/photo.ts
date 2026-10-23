// Build-time check for the landing-page portrait: use the photo file when it exists. Without it the page shows no photo slot in a published build.
import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { publicDir } from './content-dir.ts';

// Where the portrait file lives inside the public folder, and the address it is served at. Both name the same file.
const PHOTO_FILE = join('images', 'photo.jpg');
const PHOTO_URL = '/images/photo.jpg';

/**
 * Find the landing-page portrait.
 * @param folder - the public folder to look in; defaults to the folder the build publishes (public/ unless a test build names its own),
 *   resolved from the project root because the site is built from there.
 * @returns the address of the photo ("/images/photo.jpg") when that file exists, or null when it is missing
 *   (also when the folder is missing, or when the path is a folder rather than a file).
 */
export function findPhoto(folder: string = resolve(process.cwd(), publicDir())): string | null {
  try {
    return statSync(join(folder, PHOTO_FILE)).isFile() ? PHOTO_URL : null;
  } catch (error) {
    // A missing file or folder is the normal "no photo yet" case. Any other failure (for example a permission error) is a real problem and is passed on.
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return null;
    throw error;
  }
}
