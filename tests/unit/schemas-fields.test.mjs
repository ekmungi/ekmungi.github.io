// Unit tests for src/content/schemas.ts: titles and summaries that must say something, and the language and translation of a paper title.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postSchema, profileSchema, projectSchema, researchSchema } from '../../src/content/schemas.ts';

/** Collect every error message of a failed parse into one string, for message assertions. */
const messages = (result) => (result.success ? '' : result.error.issues.map((issue) => issue.message).join(' | '));

const post = { title: 'x', date: '2026-10-21', summary: 's', tags: ['a'] };
const project = { title: 'X', kind: 'software', summary: 's', status: 'x' };

// Values that are empty once their spaces are removed: empty, spaces, a tab and a line break, and no-break spaces.
const BLANK = ['', '   ', '\t\n', '\u{a0}\u{a0}'];

test('a post title or summary that is empty after trimming fails, and says which field', () => {
  for (const field of ['title', 'summary']) {
    for (const value of BLANK) {
      const result = postSchema.safeParse({ ...post, [field]: value });
      assert.equal(result.success, false, `${field}: ${JSON.stringify(value)}`);
      assert.match(messages(result), new RegExp(`needs a ${field}`), field);
    }
  }
});

test('a project title or summary that is empty after trimming fails, and says which field', () => {
  for (const field of ['title', 'summary']) {
    for (const value of BLANK) {
      const result = projectSchema.safeParse({ ...project, [field]: value });
      assert.equal(result.success, false, `${field}: ${JSON.stringify(value)}`);
      assert.match(messages(result), new RegExp(`needs a ${field}`), field);
    }
  }
});

test('a title or summary with text keeps its spacing as written', () => {
  assert.equal(postSchema.parse({ ...post, title: ' Spaced ' }).title, ' Spaced ');
  assert.equal(projectSchema.parse({ ...project, summary: 'One line.' }).summary, 'One line.');
});

test('a paper or publication may name the language of its title and give a translation', () => {
  const paper = { title: 'Un titre', lang: 'fr', translation: 'A title' };
  const research = { title: 'T', period: 'p', place: 'q', summary: 's', order: 1, papers: [paper] };
  assert.deepEqual(researchSchema.parse(research).papers[0], paper);
  const profile = {
    glance: { now: 'a', basedIn: 'b', experience: 'c', education: 'd', languages: 'e' },
    experience: [],
    publications: [paper],
    patents: [],
    mentoring: [],
    education: [],
  };
  assert.deepEqual(profileSchema.parse(profile).publications[0], paper);
});

test('the language of a paper title must be a language tag, such as "fr" or "de-CH"', () => {
  const research = (lang) => ({ title: 'T', period: 'p', place: 'q', summary: 's', order: 1, papers: [{ title: 'x', lang }] });
  for (const lang of ['fr', 'de-CH', 'pt-BR']) assert.equal(researchSchema.safeParse(research(lang)).success, true, lang);
  for (const lang of ['', 'French', 'f', 'fr_FR', 'fr "x"']) assert.equal(researchSchema.safeParse(research(lang)).success, false, lang);
});
