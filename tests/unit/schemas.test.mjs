// Unit tests for src/content/schemas.ts: what each content type accepts and rejects, including the repository privacy guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postSchema, projectSchema, researchSchema, profileSchema } from '../../src/content/schemas.ts';

/** Collect every error message of a failed parse into one string, for message assertions. */
const messages = (result) => (result.success ? '' : result.error.issues.map((i) => i.message).join(' | '));

const post = { title: 'x', date: '2026-10-21', summary: 's', tags: ['a'] };
const project = { title: 'X', kind: 'software', summary: 's', status: 'x' };

test('post without date fails', () =>
  assert.equal(postSchema.safeParse({ title: 'x', summary: 's', tags: ['a'] }).success, false));

test('post without tags fails', () =>
  assert.equal(postSchema.safeParse({ title: 'x', date: '2026-10-21', summary: 's', tags: [] }).success, false));

test('a complete post parses, turns the date into a Date and defaults draft to false', () => {
  const result = postSchema.safeParse(post);
  assert.equal(result.success, true);
  assert.ok(result.data.date instanceof Date);
  assert.equal(result.data.date.toISOString().slice(0, 10), '2026-10-21');
  assert.equal(result.data.draft, false);
});

test('a post keeps draft: true when it is set', () =>
  assert.equal(postSchema.parse({ ...post, draft: true }).draft, true));

test('a post tag with no a-z or 0-9 character fails, because it would give an empty tag address', () => {
  const result = postSchema.safeParse({ ...post, tags: ['???'] });
  assert.equal(result.success, false);
  assert.match(messages(result), /a-z or 0-9/);
});

test('project schema rejects private with repo', () =>
  assert.equal(
    projectSchema.safeParse({ ...project, title: 'J', private: true, repo: 'https://github.com/ekmungi/smart-search' }).success,
    false,
  ));

test('the private-with-repo error says plainly what is wrong', () => {
  const result = projectSchema.safeParse({ ...project, private: true, repo: 'https://github.com/ekmungi/smart-search' });
  assert.match(messages(result), /private project must not have a repo link/i);
});

test('project repo must be on the public allow-list', () =>
  assert.equal(projectSchema.safeParse({ ...project, repo: 'https://github.com/ekmungi/not-public' }).success, false));

test('the allow-list error names the repository and says it is not public', () => {
  const result = projectSchema.safeParse({ ...project, repo: 'https://github.com/ekmungi/not-public' });
  assert.match(messages(result), /not-public/);
  assert.match(messages(result), /public/i);
});

test('every repo on the allow-list is accepted, with or without a trailing slash', () => {
  for (const name of ['ekmungi.github.io', 'smart-search', 'smart-search-mcp', 'youtube-transcribe', 'obsidian-database-plugin', 'ai-meeting-notes', 'notion-obsidian', 'obsidian-vault-org']) {
    assert.equal(projectSchema.safeParse({ ...project, repo: `https://github.com/ekmungi/${name}` }).success, true, name);
    assert.equal(projectSchema.safeParse({ ...project, repo: `https://github.com/ekmungi/${name}/` }).success, true, `${name}/`);
  }
});

test('a repo link must be exactly github.com/ekmungi/<name>: other owners, hosts, paths and suffixes fail', () => {
  for (const repo of [
    'https://github.com/someone-else/smart-search',
    'https://gitlab.com/ekmungi/smart-search',
    'http://github.com/ekmungi/smart-search',
    'https://github.com/ekmungi/smart-search/tree/main',
    'https://github.com/ekmungi/smart-search.git',
    'https://github.com/ekmungi',
    'https://github.com/ekmungi/',
    'https://github.com/ekmungi/Smart-Search',
  ]) {
    assert.equal(projectSchema.safeParse({ ...project, repo }).success, false, repo);
  }
});

test('a private project without a repo is valid; private defaults to false and updates to empty', () => {
  assert.equal(projectSchema.safeParse({ ...project, private: true }).success, true);
  const parsed = projectSchema.parse(project);
  assert.equal(parsed.private, false);
  assert.equal(parsed.draft, false);
  assert.deepEqual(parsed.updates, []);
});

test('project kind must be research or software', () => {
  assert.equal(projectSchema.safeParse({ ...project, kind: 'research' }).success, true);
  assert.equal(projectSchema.safeParse({ ...project, kind: 'hobby' }).success, false);
});

test('colab must be a web address, and updates carry a date and text', () => {
  assert.equal(projectSchema.safeParse({ ...project, colab: 'https://colab.research.google.com/drive/abc' }).success, true);
  assert.equal(projectSchema.safeParse({ ...project, colab: 'not a url' }).success, false);
  assert.equal(projectSchema.safeParse({ ...project, colab: 'javascript:alert(1)' }).success, false);
  const parsed = projectSchema.parse({ ...project, updates: [{ date: '2026-10-01', text: 'Started' }] });
  assert.ok(parsed.updates[0].date instanceof Date);
  assert.equal(parsed.updates[0].text, 'Started');
  assert.equal(projectSchema.safeParse({ ...project, updates: [{ text: 'no date' }] }).success, false);
});

const COLAB = 'https://colab.research.google.com';

test('a colab link into an ekmungi repository that is not on the allow-list is rejected, and the error names it', () => {
  const colab = `${COLAB}/github/ekmungi/secret-notebooks/blob/main/demo.ipynb`;
  const result = projectSchema.safeParse({ ...project, colab });
  assert.equal(result.success, false);
  assert.match(messages(result), /secret-notebooks/);
  assert.match(messages(result), /public allow-list/);
});

test('a colab link into an allow-listed ekmungi repository is accepted', () => {
  for (const name of ['smart-search', 'obsidian-vault-org', 'ekmungi.github.io']) {
    const colab = `${COLAB}/github/ekmungi/${name}/blob/main/demo.ipynb`;
    assert.equal(projectSchema.safeParse({ ...project, colab }).success, true, name);
  }
});

test('the colab allow-list check cannot be dodged by case, encoding, extra slashes or a missing name', () => {
  for (const path of [
    '/github/Ekmungi/secret-notebooks/blob/main/a.ipynb',
    '/github/%65kmungi/secret-notebooks/blob/main/a.ipynb',
    '/GitHub/ekmungi/secret-notebooks/blob/main/a.ipynb',
    '//github//ekmungi//secret-notebooks/blob/main/a.ipynb',
    '/github/ekmungi/secret%2Dnotebooks/blob/main/a.ipynb',
    '/github/ekmungi/secret%ZZnotebooks/blob/main/a.ipynb',
    '/github/ekmungi',
    '/github/ekmungi/',
  ]) {
    assert.equal(projectSchema.safeParse({ ...project, colab: `${COLAB}${path}` }).success, false, path);
  }
});

test('a private project with a GitHub-backed colab link is rejected, even into an allow-listed repository', () => {
  const colab = `${COLAB}/github/ekmungi/smart-search/blob/main/demo.ipynb`;
  const result = projectSchema.safeParse({ ...project, private: true, colab });
  assert.equal(result.success, false);
  assert.match(messages(result), /private project must not have a GitHub-backed colab link/i);
});

test('a colab link that does not go through /github/ is accepted, for public and private projects', () => {
  const colab = `${COLAB}/drive/1AbCdEfG`;
  assert.equal(projectSchema.safeParse({ ...project, colab }).success, true);
  assert.equal(projectSchema.safeParse({ ...project, private: true, colab }).success, true);
});

test('a colab link into another owner\'s repository is not limited by the ekmungi allow-list', () => {
  const colab = `${COLAB}/github/someone-else/their-repo/blob/main/x.ipynb`;
  assert.equal(projectSchema.safeParse({ ...project, colab }).success, true);
});

test('the colab field must point at Colab itself, so other hosts cannot carry a GitHub notebook around the check', () => {
  const result = projectSchema.safeParse({ ...project, colab: 'https://githubtocolab.com/ekmungi/secret-notebooks/blob/main/a.ipynb' });
  assert.equal(result.success, false);
  assert.match(messages(result), /colab\.research\.google\.com/);
});

test('a project without a title, summary or status fails', () => {
  for (const missing of ['title', 'summary', 'status']) {
    const { [missing]: _removed, ...rest } = project;
    assert.equal(projectSchema.safeParse(rest).success, false, missing);
  }
});

test('research schema needs title, period, place, summary, order and papers', () => {
  const research = {
    title: 'DKFZ', period: '2013 to 2017', place: 'Heidelberg', summary: 's', order: 1,
    papers: [{ title: 'A paper', url: 'https://doi.org/10.1000/x' }, { title: 'No link yet' }],
  };
  assert.equal(researchSchema.safeParse(research).success, true);
  for (const missing of ['title', 'period', 'place', 'summary', 'order', 'papers']) {
    const { [missing]: _removed, ...rest } = research;
    assert.equal(researchSchema.safeParse(rest).success, false, missing);
  }
  assert.equal(researchSchema.safeParse({ ...research, order: 'first' }).success, false);
  assert.equal(researchSchema.safeParse({ ...research, papers: [{ title: 'x', url: 'nope' }] }).success, false);
});

test('profile schema needs the glance block and the list fields', () => {
  const profile = {
    glance: { now: 'a', basedIn: 'b', experience: 'c', education: 'd', languages: 'e' },
    experience: [{ when: '2020 to now', title: 'Role', org: 'Org', line: 'What I do' }],
    publications: [{ title: 'Paper', url: 'https://example.org/p' }, { title: 'Unlinked' }],
    patents: ['Patent one'],
    mentoring: ['Mentoring one'],
    education: ['Degree one'],
  };
  assert.equal(profileSchema.safeParse(profile).success, true);
  for (const missing of ['glance', 'experience', 'publications', 'patents', 'mentoring', 'education']) {
    const { [missing]: _removed, ...rest } = profile;
    assert.equal(profileSchema.safeParse(rest).success, false, missing);
  }
  assert.equal(profileSchema.safeParse({ ...profile, glance: { now: 'a' } }).success, false);
  assert.equal(profileSchema.safeParse({ ...profile, experience: [{ when: 'x', title: 'y', org: 'z' }] }).success, false);
});
