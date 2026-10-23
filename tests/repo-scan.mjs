// Test helper: finds every mention of an ekmungi repository in a built HTML file, in links and in visible text, so the site tests can check it against the public allow-list.
import { TextNode } from 'node-html-parser';
import { decodeFully } from '../src/lib/repo-guard.ts';

// One mention of the owner followed by "/": the text after the slash, up to the next "/", "?", "#", "&" or the end, is the repository name.
const OWNER_MENTION = /ekmungi\/([^/?#&]*)/g;

// Punctuation that ends a sentence and so is not part of a repository name written in running text.
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/;

/**
 * Decode HTML entities the way a browser reads text: numeric ones and the whole HTML named-entity table (spaces, punctuation, letters,
 * soft hyphens and the rest), so an address or a term written as "github.com&sol;ekmungi" or "Example&nbsp;street" is read as written.
 * The decoding is done by node-html-parser's text node, which already holds the complete table. One level only: "&amp;nbsp;" becomes "&nbsp;".
 * @param {string} html - HTML or text that may contain entities.
 * @returns {string} the text with every known entity replaced; unknown entities are left as written.
 */
export function decodeEntities(html) {
  return new TextNode(html).text;
}

/**
 * List the repository names mentioned in one block of text, lower-case.
 * Every mention of "ekmungi/" counts, whatever the host (github.com, a Colab "/github/" path, a raw file host, or an address tucked
 * into a query or fragment). Percent-escapes are decoded first, as many layers deep as there are. A plain "ekmungi" with no "/" after it
 * (the site's own host ekmungi.github.io, or the profile link github.com/ekmungi) names no repository and is not listed.
 * @param {string} text - one whitespace-free token, as cut out of a page.
 * @returns {string[]} the repository names found; an empty string stands for "github.com/ekmungi/" with no name after it.
 */
function namesInToken(text) {
  const decoded = decodeFully(text).toLowerCase();
  const names = [];
  for (const mention of decoded.matchAll(OWNER_MENTION)) {
    const reachesEnd = mention.index + mention[0].length === decoded.length;
    // A name at the very end of a token may carry the full stop or comma of the sentence around it.
    names.push(reachesEnd ? mention[1].replace(TRAILING_PUNCTUATION, '') : mention[1]);
  }
  return names;
}

/**
 * Cut a text into the pieces that can hold an address: runs without whitespace, quotes or angle brackets.
 * @param {string} text - decoded HTML or visible text.
 * @returns {string[]} the pieces, empty ones removed.
 */
function tokens(text) {
  return text.split(/[\s"'<>`]+/).filter(Boolean);
}

/**
 * Find every repository an HTML file names, in attribute values (links) and in visible text.
 * Two views of the file are scanned: the raw markup, which holds the links, and the markup with its tags removed, which holds the
 * visible text even where a tag splits it.
 * @param {string} html - the content of a built HTML file.
 * @returns {string[]} the distinct repository names mentioned, lower-case, in the order first met.
 */
export function repoMentions(html) {
  const raw = decodeEntities(html);
  const visible = raw.replace(/<[^>]*>/g, ' ');
  return [...new Set([...tokens(raw), ...tokens(visible)].flatMap(namesInToken))];
}

/**
 * Find the mentions of a repository that is not on the public allow-list.
 * @param {string} html - the content of a built HTML file.
 * @param {readonly string[]} publicRepos - the repository names the site may link to.
 * @returns {string[]} the offending names, lower-case; an empty string means the owner was mentioned with a "/" and no name.
 */
export function badRepoMentions(html, publicRepos) {
  const allowed = publicRepos.map((name) => name.toLowerCase());
  return repoMentions(html).filter((name) => !allowed.includes(name));
}
