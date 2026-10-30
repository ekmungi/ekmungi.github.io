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

test('a project diagram names an SVG file in src/assets/diagrams and needs a caption', () => {
  const diagram = { file: 'smart-search.svg', caption: 'From a file on disk to a search result.' };
  assert.deepEqual(projectSchema.parse({ ...project, diagram }).diagram, diagram);
  for (const file of ['Smart-Search.svg', 'smart search.svg', '../x.svg', 'diagrams/x.svg', 'x.png', '.svg', '']) {
    const result = projectSchema.safeParse({ ...project, diagram: { file, caption: 'c' } });
    assert.equal(result.success, false, JSON.stringify(file));
    assert.match(messages(result), /src\/assets\/diagrams/, JSON.stringify(file));
  }
  for (const caption of BLANK) {
    const result = projectSchema.safeParse({ ...project, diagram: { file: 'x.svg', caption } });
    assert.equal(result.success, false, JSON.stringify(caption));
    assert.match(messages(result), /needs a caption/);
  }
});

test('a project notice needs a title and a text, and says which one is missing', () => {
  const notice = { title: 'Record only with consent', text: 'Ask everyone first.' };
  assert.deepEqual(projectSchema.parse({ ...project, notice }).notice, notice);
  assert.equal(projectSchema.parse(project).notice, undefined);
  for (const field of ['title', 'text']) {
    for (const value of BLANK) {
      const result = projectSchema.safeParse({ ...project, notice: { ...notice, [field]: value } });
      assert.equal(result.success, false, `${field}: ${JSON.stringify(value)}`);
      assert.match(messages(result), new RegExp(`notice needs a ${field}`), field);
    }
  }
});

test('a project view names an SVG file in src/assets/diagrams and needs a caption, and a project without views has none', () => {
  const view = { file: 'settings-view.svg', caption: 'The settings tab.' };
  assert.deepEqual(projectSchema.parse({ ...project, views: [view] }).views, [view]);
  assert.deepEqual(projectSchema.parse(project).views, []);
  for (const file of ['Settings.svg', '../x.svg', 'x.png', '']) {
    const result = projectSchema.safeParse({ ...project, views: [{ file, caption: 'c' }] });
    assert.equal(result.success, false, JSON.stringify(file));
    assert.match(messages(result), /src\/assets\/diagrams/, JSON.stringify(file));
  }
  for (const caption of BLANK) {
    const result = projectSchema.safeParse({ ...project, views: [{ file: 'x.svg', caption }] });
    assert.equal(result.success, false, JSON.stringify(caption));
    assert.match(messages(result), /view needs a caption/);
  }
});

test('a project reference has a title, a web address, authors, a source and a use, and a project without references has none', () => {
  const reference = { title: 'A paper', url: 'https://doi.org/10.1/x', authors: 'A and B', source: 'SIGIR 2009', use: 'What it is used for.' };
  assert.deepEqual(projectSchema.parse({ ...project, references: [reference] }).references, [reference]);
  assert.deepEqual(projectSchema.parse(project).references, []);
  for (const field of ['title', 'authors', 'source', 'use']) {
    for (const value of BLANK) {
      const result = projectSchema.safeParse({ ...project, references: [{ ...reference, [field]: value }] });
      assert.equal(result.success, false, `${field}: ${JSON.stringify(value)}`);
      assert.match(messages(result), new RegExp(`reference needs a ${field}`), field);
    }
  }
  for (const url of [undefined, '', 'doi.org/10.1/x', 'javascript:alert(1)']) {
    const result = projectSchema.safeParse({ ...project, references: [{ ...reference, url }] });
    assert.equal(result.success, false, JSON.stringify(url));
  }
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
