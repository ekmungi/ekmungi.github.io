// Unit tests for the guards in src/content/schemas.ts that reach beyond field shapes: the repository guard on every URL field and the date rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postSchema, projectSchema, researchSchema, profileSchema } from '../../src/content/schemas.ts';

/** Collect every error message of a failed parse into one string, for message assertions. */
const messages = (result) => (result.success ? '' : result.error.issues.map((i) => i.message).join(' | '));

const COLAB = 'https://colab.research.google.com';
const SECRET = 'secret-notebooks'; // a made-up private repository name; it is on no allow-list
const post = { title: 'x', date: '2026-10-21', summary: 's', tags: ['a'] };
const project = { title: 'X', kind: 'software', summary: 's', status: 'x' };
const research = {
  title: 'DKFZ', period: '2013 to 2017', place: 'Heidelberg', summary: 's', order: 1,
  papers: [{ title: 'A paper', url: 'https://doi.org/10.1000/x' }],
};
const profile = {
  glance: { now: 'a', basedIn: 'b', experience: 'c', education: 'd', languages: 'e' },
  experience: [{ when: '2020 to now', title: 'Role', org: 'Org', line: 'What I do' }],
  publications: [{ title: 'Paper', url: 'https://example.org/p' }],
  patents: ['Patent one'], mentoring: ['Mentoring one'], education: ['Degree one'],
};

// Every way found so far to put a private repository name into a colab link without using the /github/<owner>/<name> path.
const HIDDEN_FORMS = {
  'fragment': `${COLAB}/#fileId=https://github.com/ekmungi/${SECRET}/blob/main/a.ipynb`,
  'encoded fragment': `${COLAB}/#fileId=https%3A%2F%2Fgithub.com%2Fekmungi%2F${SECRET}%2Fblob%2Fmain%2Fa.ipynb`,
  'double-encoded fragment': `${COLAB}/#fileId=https%253A%252F%252Fgithub.com%252Fekmungi%252F${SECRET}`,
  'query': `${COLAB}/?q=https://github.com/ekmungi/${SECRET}`,
  'encoded query': `${COLAB}/?q=https%3A%2F%2Fgithub.com%2Fekmungi%2F${SECRET}`,
  'encoded slashes in the path': `${COLAB}/github%2Fekmungi%2F${SECRET}/blob/main/a.ipynb`,
  'encoded slash before the name': `${COLAB}/github/ekmungi%2F${SECRET}/blob/main/a.ipynb`,
  'upper-case owner in a fragment': `${COLAB}/#fileId=https://github.com/EKMUNGI/${SECRET}`,
};

test('a colab link that names a non-allow-listed ekmungi repository anywhere in the address is rejected, public or private', () => {
  for (const [form, colab] of Object.entries(HIDDEN_FORMS)) {
    const result = projectSchema.safeParse({ ...project, colab });
    assert.equal(result.success, false, `public project, ${form}`);
    assert.match(messages(result), new RegExp(SECRET), form);
    assert.equal(projectSchema.safeParse({ ...project, private: true, colab }).success, false, `private project, ${form}`);
  }
});

test('a colab link that names an allow-listed repository in a fragment, query or encoded path is accepted for a public project', () => {
  for (const colab of [
    `${COLAB}/#fileId=https://github.com/ekmungi/smart-search/blob/main/a.ipynb`,
    `${COLAB}/#fileId=https%3A%2F%2Fgithub.com%2Fekmungi%2Fsmart-search%2Fblob%2Fmain%2Fa.ipynb`,
    `${COLAB}/?q=https://github.com/ekmungi/ekmungi.github.io`,
    `${COLAB}/github%2Fekmungi%2Fsmart-search/blob/main/a.ipynb`,
  ]) {
    assert.equal(projectSchema.safeParse({ ...project, colab }).success, true, colab);
  }
});

test('a private project may not carry a colab link that mentions GitHub anywhere after the host', () => {
  for (const colab of [
    `${COLAB}/#fileId=https://github.com/ekmungi/smart-search/blob/main/a.ipynb`,
    `${COLAB}/?q=https%3A%2F%2FGitHub.com%2Fsomeone-else%2Frepo`,
    `${COLAB}/github%2Fsomeone-else%2Frepo/blob/main/a.ipynb`,
  ]) {
    const result = projectSchema.safeParse({ ...project, private: true, colab });
    assert.equal(result.success, false, colab);
    assert.match(messages(result), /private project must not have a GitHub-backed colab link/i);
  }
});

test('a repo link that spells a public repository in different capitalisation is rejected and names the listed spelling', () => {
  const result = projectSchema.safeParse({ ...project, repo: 'https://github.com/ekmungi/Smart-Search' });
  assert.equal(result.success, false);
  assert.match(messages(result), /smart-search/);
});

test('a research paper link to a non-allow-listed ekmungi repository is rejected; an allow-listed repository or another site is accepted', () => {
  const withUrl = (url) => ({ ...research, papers: [{ title: 'P', url }] });
  const bad = researchSchema.safeParse(withUrl(`https://github.com/ekmungi/${SECRET}`));
  assert.equal(bad.success, false);
  assert.match(messages(bad), new RegExp(SECRET));
  assert.equal(researchSchema.safeParse(withUrl(`https://github.com/ekmungi/${SECRET}/blob/main/p.pdf`)).success, false);
  assert.equal(researchSchema.safeParse(withUrl('https://github.com/ekmungi/smart-search')).success, true);
  assert.equal(researchSchema.safeParse(withUrl('https://doi.org/10.1000/xyz')).success, true);
  assert.equal(researchSchema.safeParse(withUrl('https://github.com/someone-else/their-repo')).success, true);
});

test('a profile publication link to a non-allow-listed ekmungi repository is rejected; an allow-listed repository or another site is accepted', () => {
  const withUrl = (url) => ({ ...profile, publications: [{ title: 'P', url }] });
  const bad = profileSchema.safeParse(withUrl(`https://github.com/ekmungi/${SECRET}`));
  assert.equal(bad.success, false);
  assert.match(messages(bad), new RegExp(SECRET));
  assert.equal(profileSchema.safeParse(withUrl(`https://raw.githubusercontent.com/ekmungi/${SECRET}/main/p.pdf`)).success, false);
  assert.equal(profileSchema.safeParse(withUrl('https://github.com/ekmungi/smart-search-mcp/')).success, true);
  assert.equal(profileSchema.safeParse(withUrl('https://www.nature.com/articles/abc')).success, true);
  assert.equal(profileSchema.safeParse(withUrl('https://ekmungi.github.io/blog/')).success, true, 'the site itself is not a repository link');
});

test('a post without a real date fails: a blank (null) date, a number, an empty or invalid string and other types are rejected', () => {
  for (const date of [null, 0, 1792607297000, '', 'not a date', true, {}]) {
    assert.equal(postSchema.safeParse({ ...post, date }).success, false, JSON.stringify(date));
  }
});

test('a post date is accepted as an ISO string or as a Date (the form a front-matter date arrives in)', () => {
  assert.equal(postSchema.parse({ ...post, date: '2026-10-21' }).date.toISOString().slice(0, 10), '2026-10-21');
  assert.equal(postSchema.parse({ ...post, date: new Date('2026-10-21T00:00:00Z') }).date.toISOString().slice(0, 10), '2026-10-21');
});

test('a project update with a blank, numeric or invalid date fails, and a valid one is accepted', () => {
  for (const date of [null, 0, 1792607297000, '', 'not a date']) {
    assert.equal(projectSchema.safeParse({ ...project, updates: [{ date, text: 't' }] }).success, false, JSON.stringify(date));
  }
  assert.equal(projectSchema.safeParse({ ...project, updates: [{ date: '2026-10-21', text: 't' }] }).success, true);
});

// ---- Fix round 2 ----

test('a date written as text must be exactly YYYY-MM-DD and a real calendar day; a Date is still accepted', () => {
  for (const date of ['0', 'October 21, 2026', '2026-10-21T00:00:00Z', '2026-2-1', '21/10/2026', '2026-02-31', '2026-13-01', ' 2026-10-21']) {
    assert.equal(postSchema.safeParse({ ...post, date }).success, false, date);
    assert.equal(projectSchema.safeParse({ ...project, updates: [{ date, text: 't' }] }).success, false, `update ${date}`);
  }
  assert.equal(postSchema.parse({ ...post, date: '2026-10-21' }).date.toISOString(), '2026-10-21T00:00:00.000Z');
  assert.equal(postSchema.parse({ ...post, date: '2028-02-29' }).date.toISOString(), '2028-02-29T00:00:00.000Z');
  assert.equal(postSchema.safeParse({ ...post, date: new Date('2026-10-21') }).success, true);
});

test('the repo field accepts only the exact form: a query, a fragment or an encoded path after the name is rejected', () => {
  for (const repo of [
    'https://github.com/ekmungi/smart-search?x=1',
    'https://github.com/ekmungi/smart-search#frag',
    'https://github.com/ekmungi/smart-search%2f..%2fsecret-notebooks',
    'https://github.com/ekmungi/smart-search%2Fsecret-notebooks',
    'https://github.com/ekmungi/smart-search;secret-notebooks',
  ]) {
    assert.equal(projectSchema.safeParse({ ...project, repo }).success, false, repo);
  }
  assert.equal(projectSchema.safeParse({ ...project, repo: 'https://github.com/ekmungi/smart-search/' }).success, true);
});

test('the repo field says "spell it exactly" for a capitalisation slip and "not on the allow-list" for anything else', () => {
  assert.match(messages(projectSchema.safeParse({ ...project, repo: 'https://github.com/ekmungi/Smart-Search' })), /spell the repository exactly/);
  const other = projectSchema.safeParse({ ...project, repo: 'https://github.com/ekmungi/smart-search?x=1' });
  assert.match(messages(other), /smart-search\?x=1/);
  assert.match(messages(other), /public allow-list/);
});

// Ways to follow an allow-listed repository name with something that could carry another name.
const AFTER_ALLOWED_NAME = {
  'double-encoded parent segment in the path': `${COLAB}/github/ekmungi/smart-search/%252e%252e/${SECRET}/blob/main/a.ipynb`,
  'parent segment in a fragment': `${COLAB}/#fileId=https://github.com/ekmungi/smart-search/../${SECRET}`,
  'encoded slashes and a parent segment': `${COLAB}/github/ekmungi/smart-search%2F..%2F${SECRET}/blob/main/a.ipynb`,
  'semicolon': `${COLAB}/#fileId=https://github.com/ekmungi/smart-search;${SECRET}`,
  'at sign': `${COLAB}/#fileId=https://github.com/ekmungi/smart-search@${SECRET}`,
  'tilde': `${COLAB}/#fileId=https://github.com/ekmungi/smart-search~${SECRET}`,
  'a parent segment in a query value': `${COLAB}/?path=..%2F${SECRET}&q=https://github.com/ekmungi/smart-search`,
};

test('nothing that could carry another repository name may follow an allow-listed name, and no ".." segment is allowed', () => {
  for (const [form, colab] of Object.entries(AFTER_ALLOWED_NAME)) {
    assert.equal(projectSchema.safeParse({ ...project, colab }).success, false, form);
    assert.equal(projectSchema.safeParse({ ...project, private: true, colab }).success, false, `private, ${form}`);
  }
});

test('a ".." segment is refused in any URL field, with a message that says so', () => {
  const result = researchSchema.safeParse({ ...research, papers: [{ title: 'P', url: 'https://example.org/a/%2e%2e%2f..%2fb' }] });
  assert.equal(result.success, false);
  assert.match(messages(result), /"\.\."/);
});

test('legitimate links still pass: the site itself, other owners, Drive notebooks, allow-listed notebooks and journal URLs', () => {
  for (const colab of [
    `${COLAB}/drive/1AbCdEfG`,
    `${COLAB}/drive/1AbCdEfG?usp=sharing#scrollTo=abc`,
    `${COLAB}/github/ekmungi/smart-search/blob/main/notebooks/a.ipynb`,
    `${COLAB}/github/ekmungi/ekmungi.github.io/blob/main/a.ipynb`,
    `${COLAB}/github/someone-else/their-repo/blob/main/a.ipynb`,
    `${COLAB}/#fileId=https://github.com/ekmungi/smart-search/blob/main/a.ipynb&revisionId=7`,
    `${COLAB}/github/ekmungi/smart-search?authuser=1`,
  ]) {
    assert.equal(projectSchema.safeParse({ ...project, colab }).success, true, colab);
  }
  for (const url of [
    'https://ekmungi.github.io/blog/some-post/',
    'https://www.nature.com/articles/s41586-020-2649-2?utm_source=x&utm_medium=y#Sec3',
    'https://doi.org/10.1016/j.media.2020.101952',
    'https://doi.org/10.1000/a..b',
    'https://github.com/someone-else/their-repo/tree/main/docs',
  ]) {
    assert.equal(researchSchema.safeParse({ ...research, papers: [{ title: 'P', url }] }).success, true, url);
  }
});
