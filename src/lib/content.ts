// Content helpers: which entries are published, when unfinished text may be shown, whether the profile story is written, and how posts are ordered.

/** The two facts that decide whether drafts are shown. */
interface DraftSettings {
  /** True in a production build; undefined when the code runs outside Vite (plain Node tests). */
  prod?: boolean;
  /** The raw INCLUDE_DRAFTS environment value; only the exact text "1" turns drafts on. */
  includeDrafts?: string;
}

/**
 * Decide whether draft entries are visible.
 * Development shows them. Production hides them unless INCLUDE_DRAFTS is "1", which the test build sets.
 * Code running outside Vite (no `prod` value) is treated as production, the safe side for a public site.
 * @param settings - the build mode and the INCLUDE_DRAFTS value.
 * @returns true when drafts are visible.
 */
export function draftsVisible({ prod, includeDrafts }: DraftSettings): boolean {
  return !(prod ?? true) || includeDrafts === '1';
}

/**
 * Tell whether drafts are visible in the build or run that is happening now.
 * `import.meta.env` exists only under Vite and `process` only under Node, so both are read defensively
 * and this works inside Astro and in plain Node unit tests alike.
 * @returns true in the dev server and in the test build (INCLUDE_DRAFTS=1); false in a production build.
 */
function draftsVisibleNow(): boolean {
  const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return draftsVisible({
    prod: import.meta.env?.PROD,
    includeDrafts: nodeProcess?.env?.INCLUDE_DRAFTS,
  });
}

/**
 * Tell whether an entry should appear on the site.
 * @param entry - a content entry, or any object with an optional `data.draft` flag.
 * @returns true when the entry is not a draft, or when drafts are visible.
 */
export function isPublished(entry: { data: { draft?: boolean } }): boolean {
  if (!entry.data.draft) return true;
  return draftsVisibleNow();
}

/**
 * Tell whether text that is still to be written (marked with data-placeholder) and slots that are still empty may be drawn.
 * They show where drafts show, so the author sees what is missing in the dev server and the test build, and a published page never shows them.
 * @returns true in the dev server and in the test build; false in a production build.
 */
export function placeholdersVisible(): boolean {
  return draftsVisibleNow();
}

/**
 * Tell whether the profile story has been written. A story that is empty, or that still holds any data-placeholder mark, is not written yet.
 * @param body - the Markdown body of the profile file.
 * @returns true when the body has text and no placeholder mark.
 */
export function storyIsWritten(body: string | undefined): boolean {
  const text = (body ?? '').trim();
  return text !== '' && !/data-placeholder/i.test(text);
}

/**
 * Order posts newest first; posts with the same date are ordered by title A to Z, ignoring case.
 * @param posts - posts, or any objects with `data.date` and `data.title`; the list is not changed.
 * @returns a new, sorted array holding the same posts.
 */
export function sortByDateDesc<T extends { data: { title: string; date: Date } }>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) =>
      b.data.date.getTime() - a.data.date.getTime() ||
      a.data.title.localeCompare(b.data.title, 'en', { sensitivity: 'base' }),
  );
}
