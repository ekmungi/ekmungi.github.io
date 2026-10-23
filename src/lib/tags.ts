// Tag helpers for the blog: turn a tag into its slug and its page address, count posts per tag, and pick the posts or pills for one tag.

/** One tag as shown on the blog: its display label, its address slug and how many posts carry it. */
export interface TagCount {
  tag: string;
  slug: string;
  count: number;
}

/**
 * Turn a tag into the slug used in its address, for example "Drug Discovery" becomes "drug-discovery".
 * Accents are removed first so "Café" gives "cafe" rather than "caf"; every other run of characters
 * that are not a-z or 0-9 becomes one dash, and dashes at either end are dropped.
 * @param tag - the tag as written in a post.
 * @returns the slug; an empty string when the tag has no letter or digit in it.
 */
export function tagSlug(tag: string): string {
  return tag
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Count the posts that carry each tag. Tags that give the same slug ("Drug Discovery", "drug discovery")
 * are one tag, shown with the spelling met first, and a post counts once for a tag even if it repeats it.
 * @param posts - posts, or any objects with `data.tags`; the list and the posts are not changed.
 * @returns one entry per tag, sorted by count (highest first), then by label A to Z ignoring case.
 */
export function tagCounts(posts: { data: { tags: string[] } }[]): TagCount[] {
  const found = new Map<string, TagCount>();
  for (const post of posts) {
    // A post that lists the same tag twice (under different spellings) must still count once.
    const seenInPost = new Set<string>();
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      // A tag with no letter or digit has no address, so it cannot be listed.
      if (slug === '' || seenInPost.has(slug)) continue;
      seenInPost.add(slug);
      const existing = found.get(slug);
      found.set(slug, { tag: existing?.tag ?? tag, slug, count: (existing?.count ?? 0) + 1 });
    }
  }
  return [...found.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'en', { sensitivity: 'base' }),
  );
}

/**
 * The address of a tag page, for example "drug-discovery" gives "/blog/tags/drug-discovery/".
 * @param slug - the tag's slug, as made by tagSlug.
 * @returns the path, with a leading and a trailing slash like every folder page on the site.
 */
export function tagPath(slug: string): string {
  return `/blog/tags/${slug}/`;
}

/**
 * Pick the posts that carry a tag, whatever spelling the post used for it.
 * @param posts - posts, or any objects with `data.tags`; the list is not changed.
 * @param slug - the tag's slug, as made by tagSlug.
 * @returns a new array of the matching posts in their original order; empty when none match.
 */
export function postsWithTag<T extends { data: { tags: string[] } }>(posts: T[], slug: string): T[] {
  if (slug === '') return [];
  return posts.filter((post) => post.data.tags.some((tag) => tagSlug(tag) === slug));
}

/**
 * Pair each tag of one post with its slug, for the tag pills on a post card and a post page.
 * A tag the post repeats under another spelling is listed once (the first spelling), and a tag
 * with no letter or digit is left out because it has no page to link to.
 * @param tags - the `tags` field of a post.
 * @returns the tags in the order written, each with its label and slug.
 */
export function postTags(tags: string[]): { tag: string; slug: string }[] {
  const seen = new Set<string>();
  const result: { tag: string; slug: string }[] = [];
  for (const tag of tags) {
    const slug = tagSlug(tag);
    if (slug === '' || seen.has(slug)) continue;
    seen.add(slug);
    result.push({ tag, slug });
  }
  return result;
}
