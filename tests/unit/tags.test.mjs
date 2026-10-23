// Unit tests for src/lib/tags.ts: how a tag becomes a web address slug and how posts are counted per tag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagSlug, tagCounts, tagPath, postsWithTag, postTags } from '../../src/lib/tags.ts';

/** Build a minimal post carrying only the tags the helper reads. */
const p = (tags) => ({ data: { tags } });

test('tagSlug', () => assert.equal(tagSlug('Drug Discovery'), 'drug-discovery'));

test('tagSlug turns runs of non-alphanumerics into one dash and trims the ends', () => {
  assert.equal(tagSlug('  AI & Healthcare!  '), 'ai-healthcare');
  assert.equal(tagSlug('--LLM / RAG--'), 'llm-rag');
  assert.equal(tagSlug('Gen-AI'), 'gen-ai');
});

test('tagSlug strips accents instead of leaving a gap', () => assert.equal(tagSlug('Café'), 'cafe'));

test('tagSlug gives an empty string when nothing alphanumeric is left', () => assert.equal(tagSlug('???'), ''));

test('tagCounts merges case and spacing variants', () =>
  assert.deepEqual(tagCounts([p(['Drug Discovery']), p(['drug discovery', 'AI'])]).find((t) => t.slug === 'drug-discovery').count, 2));

test('tagCounts uses the first spelling seen as the display label', () => {
  const counts = tagCounts([p(['Drug Discovery']), p(['drug discovery'])]);
  assert.equal(counts.length, 1);
  assert.deepEqual(counts[0], { tag: 'Drug Discovery', slug: 'drug-discovery', count: 2 });
});

test('tagCounts sorts by count descending, then label A to Z ignoring case', () => {
  const counts = tagCounts([p(['beta', 'Alpha', 'zeta']), p(['zeta']), p(['Alpha', 'zeta']), p(['Gamma'])]);
  assert.deepEqual(counts.map((t) => [t.tag, t.count]), [['zeta', 3], ['Alpha', 2], ['beta', 1], ['Gamma', 1]]);
});

test('tagCounts counts a tag once per post even when the post repeats it', () => {
  assert.equal(tagCounts([p(['AI', 'ai', ' AI '])])[0].count, 1);
});

test('tagCounts of no posts is an empty list, and the input is not changed', () => {
  assert.deepEqual(tagCounts([]), []);
  const posts = [p(['b', 'a'])];
  tagCounts(posts);
  assert.deepEqual(posts[0].data.tags, ['b', 'a']);
});

test('tagPath gives the address of a tag page, with a leading and a trailing slash', () => {
  assert.equal(tagPath('ai'), '/blog/tags/ai/');
  assert.equal(tagPath('drug-discovery'), '/blog/tags/drug-discovery/');
});

test('postsWithTag keeps the posts that carry the tag, in their order, whatever the spelling', () => {
  const posts = [{ id: 'a', ...p(['Drug Discovery', 'AI']) }, { id: 'b', ...p(['endoscopy']) }, { id: 'c', ...p(['drug  discovery']) }];
  assert.deepEqual(postsWithTag(posts, 'drug-discovery').map((x) => x.id), ['a', 'c']);
  assert.deepEqual(postsWithTag(posts, 'endoscopy').map((x) => x.id), ['b']);
});

test('postsWithTag gives an empty list for a tag no post carries, and leaves the input alone', () => {
  const posts = [{ id: 'a', ...p(['AI']) }];
  assert.deepEqual(postsWithTag(posts, 'nothing'), []);
  assert.deepEqual(postsWithTag(posts, ''), [], 'an empty slug matches nothing');
  assert.equal(posts.length, 1);
});

test('postTags pairs each tag of a post with its slug, in the order written', () => {
  assert.deepEqual(postTags(['endoscopy', 'AI']), [
    { tag: 'endoscopy', slug: 'endoscopy' },
    { tag: 'AI', slug: 'ai' },
  ]);
});

test('postTags lists a tag once when the post repeats it, and skips a tag with no address', () => {
  assert.deepEqual(postTags(['AI', 'ai', '???', ' A.I. ']), [
    { tag: 'AI', slug: 'ai' },
    { tag: ' A.I. ', slug: 'a-i' },
  ]);
});
