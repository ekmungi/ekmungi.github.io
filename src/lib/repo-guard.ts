// Repository guard: decides whether a URL names an ekmungi repository that is not on the public allow-list.
// It reads the whole address (path, query and fragment), because a repository name can be hidden in any of them.

// One mention of the owner in decoded, lower-case text: "ekmungi" and, when a "/" follows, everything up to the
// next "/", "?", "#" or "&" or the end of the text. That whole run is the repository name, so anything glued to
// a listed name (";secret", "@x", "~x", "%") makes it a different, unlisted name. The run belongs to the
// match, so the "ekmungi" inside the repository "ekmungi.github.io" is not read as a second mention.
const OWNER_MENTION = /ekmungi(?:\/([^/?#&]*))?/g;

// A ".." that is a whole path segment (or a whole query or fragment value): not preceded or followed by a name
// character, so "a..b" in a DOI is not one, and "..." is not one either.
const PARENT_SEGMENT = /(?<![a-z0-9._-])\.\.(?![a-z0-9._-])/;

/**
 * Decode one run of percent-escapes such as "%2F%2F". If the run is not valid UTF-8 (for example "%E0%2F"),
 * decode only the plain ASCII escapes in it and leave the rest as written.
 * @param run - text made only of "%XX" escapes.
 * @returns the decoded text.
 */
function decodeRun(run: string): string {
  try {
    return decodeURIComponent(run);
  } catch {
    return run.replace(/%([0-7][0-9a-f])/gi, (_escape, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  }
}

/**
 * Decode percent-escapes again and again until the text stops changing, so "%252F" (an escaped "%2F")
 * ends up as "/". Broken escapes are left as written instead of raising an error. Every round that changes
 * the text makes it shorter, so the loop always ends.
 * @param text - text that may contain percent-escapes, possibly several layers deep.
 * @returns the fully decoded text.
 */
export function decodeFully(text: string): string {
  let current = text;
  for (;;) {
    const next = current.replace(/(?:%[0-9a-f]{2})+/gi, decodeRun);
    if (next === current) return current;
    current = next;
  }
}

/**
 * Read the part of an address that follows the host: path, query and fragment, fully decoded.
 * @param url - the address as written in a content file.
 * @returns the decoded text, or null when the address cannot be read (the URL field's own check reports that).
 */
function textAfterHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    return decodeFully(parsed.pathname + parsed.search + parsed.hash);
  } catch {
    return null;
  }
}

/**
 * Find a mention of an ekmungi repository that is not on the public allow-list. Every mention of the owner
 * in the decoded path, query or fragment must be followed by "/<name>" with <name> on the allow-list, and
 * <name> must end at the end of the text or at "/", "?", "#" or "&"; this
 * catches `github.com/ekmungi/<name>`, a Colab `/github/ekmungi/<name>` path, and a repository address
 * tucked into a fragment or query (`#fileId=https://github.com/ekmungi/<name>`), however it is encoded or
 * capitalised. The host is not read, so a link to the site itself (ekmungi.github.io) is not a repository link.
 * @param url - the address as written in a content file.
 * @param publicRepos - the repository names the site may link to.
 * @returns the first offending mention as `{ name }` in lower case (an empty name means the owner was
 *   mentioned without any repository), or null when every mention is allowed or the address is unreadable.
 */
export function findNonPublicRepo(url: string, publicRepos: readonly string[]): { name: string } | null {
  const text = textAfterHost(url);
  if (text === null) return null;
  const allowed = publicRepos.map((repo) => repo.toLowerCase());
  for (const mention of text.toLowerCase().matchAll(OWNER_MENTION)) {
    const name = mention[1] ?? '';
    if (!allowed.includes(name)) return { name };
  }
  return null;
}

/**
 * Tell whether an address contains a ".." path segment once fully decoded, in the path, the query or the
 * fragment. Such a segment can lead from an allow-listed repository to a different one
 * ("smart-search/../secret"), so it is refused in every link, however it is encoded.
 * @param url - the address as written in a content file.
 * @returns true when a ".." segment is present; false otherwise or when the address is unreadable.
 */
export function hasParentSegment(url: string): boolean {
  const text = textAfterHost(url);
  return text !== null && PARENT_SEGMENT.test(text);
}

/**
 * Tell whether an address mentions GitHub anywhere after its host, in any encoding or capitalisation.
 * A private project may not carry such a link, because the repository it names could be a private one.
 * @param url - the address as written in a content file.
 * @returns true when the decoded path, query or fragment contains "github"; false otherwise or when unreadable.
 */
export function pointsAtGithub(url: string): boolean {
  const text = textAfterHost(url);
  return text !== null && text.toLowerCase().includes('github');
}
