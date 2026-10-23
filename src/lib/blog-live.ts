// Whether the blog has anything to show yet: the top bar, the landing page and the 404 page link to it only after a first post is published.
import { getCollection } from 'astro:content';
import { isPublished } from './content';

/**
 * Tell whether at least one post is shown by the build that is running. A draft counts only where drafts are shown (the dev server and
 * the test build), so a production build links to the blog only after a post with no `draft: true` exists.
 * @returns true when the blog has a post to list.
 */
export async function blogIsLive(): Promise<boolean> {
  return (await getCollection('posts', isPublished)).length > 0;
}
