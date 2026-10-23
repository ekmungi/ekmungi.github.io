// Wrapper for Astro content loaders: keeps the build output clean while a collection folder has no files yet.
import type { Loader } from 'astro/loaders';

// The exact start of the warning Astro's glob() loader prints for a folder with no matching files.
const EMPTY_FOLDER_WARNING = /^No files found matching /;

/**
 * Wrap a content loader so that Astro's "No files found matching ..." warning is not printed.
 * A collection folder with no entries yet is a normal state for this site (content arrives one piece
 * at a time), not a mistake. Every other message, including every other warning, passes through
 * unchanged, and the loader keeps its own file watching.
 * @param loader - the loader to wrap, normally glob(...).
 * @returns a new loader with the same name and behaviour, minus that one warning.
 */
export function quietWhenEmpty(loader: Loader): Loader {
  return {
    ...loader,
    load: (context) => {
      // Object.create keeps the real logger as the prototype, so info, error, fork and the rest are untouched.
      const logger: typeof context.logger = Object.create(context.logger, {
        warn: {
          value: (message: string) => {
            if (!EMPTY_FOLDER_WARNING.test(message)) context.logger.warn(message);
          },
        },
      });
      return loader.load({ ...context, logger });
    },
  };
}
