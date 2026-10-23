// Unit tests for tests/privacy-scan.mjs: reading a list, matching terms and phrases in text and in the views of a page. Every term and phrase used here is invented.
// Special characters are written as \u{...} escapes so that no invisible character sits in this file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findForbiddenLines, findWordingLines, normaliseText, parseTerms, pathHits, scanViews } from '../privacy-scan.mjs';

test('parseTerms keeps one term per line with its line number and skips blanks and comments', () => {
  const text = '\u{feff}first term\r\n\r\n# a comment\r\n  second term  \nthird\n';
  assert.deepEqual(parseTerms(text), [
    { term: 'first term', line: 1 },
    { term: 'second term', line: 4 },
    { term: 'third', line: 5 },
  ]);
});

test('parseTerms returns an empty list for an empty file', () => {
  assert.deepEqual(parseTerms(''), []);
  assert.deepEqual(parseTerms('\n\n# only a comment\n'), []);
});

test('normaliseText lower-cases and turns every run of whitespace, no-break spaces included, into one space', () => {
  assert.equal(normaliseText('Example\u{a0}Street \n  12'), 'example street 12');
});

test('normaliseText deletes soft hyphens and zero-width characters, folds dashes and compatibility forms', () => {
  assert.equal(normaliseText('Exam\u{ad}ple\u{200b}street\u{200c}\u{200d}\u{200e}\u{2060}\u{feff}\u{180e} 12'), 'examplestreet 12');
  assert.equal(normaliseText('40\u{2010}12\u{2011}13\u{2012}14\u{2013}15\u{2014}16\u{2015}17\u{2212}18'), '40-12-13-14-15-16-17-18');
  assert.equal(normaliseText('\u{ff21}\u{ff11}'), 'a1');
});

test('findForbiddenLines matches case-insensitively and returns line numbers only', () => {
  const terms = parseTerms('Examplestreet 12\nsomeone@example.test\n');
  const lines = findForbiddenLines('Visit EXAMPLESTREET 12 today', terms);
  assert.deepEqual(lines, [1]);
  assert.ok(lines.every((value) => typeof value === 'number'), 'only numbers come back, never term text');
});

test('findForbiddenLines returns nothing when no term appears', () => {
  assert.deepEqual(findForbiddenLines('A harmless page about endoscopy.', parseTerms('Examplestreet 12\n99999\n')), []);
});

test('findForbiddenLines matches a term that contains letters anywhere inside a longer word', () => {
  assert.deepEqual(findForbiddenLines('xExamplestreet 12y', parseTerms('Examplestreet 12\n')), [1]);
});

test('findForbiddenLines matches a number-only term only when it stands alone, not inside a longer run of digits or letters', () => {
  const terms = parseTerms('99999\n');
  assert.deepEqual(findForbiddenLines('postcode: 99999.', terms), [1]);
  assert.deepEqual(findForbiddenLines('tel:+99999', terms), [1]);
  assert.deepEqual(findForbiddenLines('id 1999990 and a99999b', terms), []);
});

test('findForbiddenLines treats a no-break space in the text as the space in the term', () => {
  assert.deepEqual(findForbiddenLines('Examplestreet\u{a0}12', parseTerms('Examplestreet 12\n')), [1]);
});

test('findForbiddenLines reports each matching line once, in order', () => {
  const terms = parseTerms('alpha\nbeta\ngamma\n');
  assert.deepEqual(findForbiddenLines('gamma and alpha and alpha again', terms), [1, 3]);
});

test('a term that is empty once invisible characters are removed matches nothing', () => {
  assert.deepEqual(findForbiddenLines('anything at all', [{ term: '\u{ad}\u{200b}', line: 1 }]), []);
});

test('a term of seven or more digits is also found when the page groups the same digits differently', () => {
  const terms = parseTerms('+49 40 1234567\n');
  for (const text of ['Call 0049 40 12 34 567', 'tel: +49-40-123-4567', 'Phone +49 4012 34567', 'fax (49) 40.1234.567']) {
    assert.deepEqual(findForbiddenLines(text, terms), [1], text);
  }
});

test('the digits-only comparison does not join numbers across letters and ignores terms of fewer than seven digits', () => {
  assert.deepEqual(findForbiddenLines('49 40 12 abc 34567', parseTerms('+49 40 1234567\n')), []);
  assert.deepEqual(findForbiddenLines('items 12 34 56', parseTerms('123456\n')), []);
  assert.deepEqual(findForbiddenLines('2026-10-21 and 1234', parseTerms('+49 40 1234567\n')), []);
});

test('the regrouped-digit comparison applies only to terms without letters', () => {
  assert.deepEqual(findForbiddenLines('Fax 49 12 34 56 78', parseTerms('Fax 4912345678\n')), [], 'letters plus digits keep exact matching');
  assert.deepEqual(findForbiddenLines('Fax 4912345678', parseTerms('Fax 4912345678\n')), [1]);
  assert.deepEqual(findForbiddenLines('49 12 34 56 78', parseTerms('4912345678\n')), [1], 'a term without letters is found regrouped');
});

test('findWordingLines finds a phrase as whole words, in any capitalisation, and returns line numbers only', () => {
  const phrases = parseTerms('purple elephant\nzebra crossing\n');
  const lines = findWordingLines('A Purple  Elephant stood at the ZEBRA\ncrossing.', phrases);
  assert.deepEqual(lines, [1, 2]);
  assert.ok(lines.every((value) => typeof value === 'number'), 'only numbers come back, never phrase text');
  assert.deepEqual(findWordingLines('Nothing to see here.', phrases), []);
});

test('findWordingLines does not match a phrase inside a longer word', () => {
  const phrases = parseTerms('zebra crossing\nlamp\n');
  assert.deepEqual(findWordingLines('zebra crossings and a lamplight', phrases), []);
  assert.deepEqual(findWordingLines('a lamp-post and a zebra crossing.', phrases), [1, 2]);
  assert.deepEqual(findWordingLines('superzebra crossing', phrases), []);
});

test('findWordingLines treats a trailing * as "any word that starts with this"', () => {
  const phrases = parseTerms('quokk*\n');
  for (const text of ['A quokka.', 'Two QUOKKAS', 'quokk']) assert.deepEqual(findWordingLines(text, phrases), [1], text);
  assert.deepEqual(findWordingLines('aquokka', phrases), [], 'the word must start with the stem');
});

test('findWordingLines finds a phrase hidden by invisible characters or a no-break space, and ignores an empty phrase', () => {
  const phrases = parseTerms('purple elephant\n');
  assert.deepEqual(findWordingLines('purple\u{a0}ele\u{ad}phant', phrases), [1]);
  assert.deepEqual(findWordingLines('anything', [{ term: '\u{200b}*', line: 1 }]), []);
});

test('pathHits finds a term in a file path, also when its words are joined by a dash, an underscore or a dot', () => {
  const terms = parseTerms('Examplestreet 12\n99999\n');
  assert.deepEqual(pathHits(['src/content/posts/examplestreet-12.md', 'notes/Examplestreet_12.txt', 'a/examplestreet.12/b.md'], terms), [
    { path: 'src/content/posts/examplestreet-12.md', lines: [1] },
    { path: 'notes/Examplestreet_12.txt', lines: [1] },
    { path: 'a/examplestreet.12/b.md', lines: [1] },
  ]);
  assert.deepEqual(pathHits(['docs/99999/readme.md'], terms), [{ path: 'docs/99999/readme.md', lines: [2] }]);
});

test('pathHits returns nothing for paths that hold no term', () => {
  assert.deepEqual(pathHits(['src/pages/index.astro', 'dist/_astro/a-99999123.css'], parseTerms('Examplestreet 12\n99999\n')), []);
});

/**
 * Run the matcher the way the site tests do: through every scanned view of the page.
 * @param {string} html - markup that may hide a term behind entities, tags or invisible characters.
 * @param {string} term - one invented term.
 * @returns {number[]} the matching term-list line numbers (only the single line 1 is used here).
 */
function scanHits(html, term) {
  return findForbiddenLines(scanViews(html).join('\n'), parseTerms(`${term}\n`));
}

test('scanViews adds the entity-decoded text and the text with tags removed, so hidden terms are still found', () => {
  const views = scanViews('<p>someone&#64;example.test</p><p>Example<wbr>street</p>');
  const hit = (term) => findForbiddenLines(views.join('\n'), parseTerms(`${term}\n`)).length === 1;
  assert.ok(hit('someone@example.test'), 'an entity-encoded address is found');
  assert.ok(hit('examplestreet'), 'a word split by a tag is found');
});

test('a tag between the words of a term cannot hide it', () => {
  const cases = [
    ['Examplestreet 12', 'Examplestreet<br>12'],
    ['Examplestreet 12', '<span>Examplestreet</span><span>12</span>'],
    ['Examplestreet 12', 'Examplestreet<br />12'],
    ['14 March 1991', '<b>14</b><i>March</i><u>1991</u>'],
    ['Examplestreet', 'Example<wbr>street'],
  ];
  for (const [term, html] of cases) {
    assert.deepEqual(scanHits(`<p>${html}</p>`, term), [1], `hidden by: ${html}`);
  }
});

test('an authored named or numeric entity cannot hide a term (spaces, punctuation, at sign, letters)', () => {
  const cases = [
    ['Examplestreet 12', 'Examplestreet&nbsp;12'],
    ['Examplestreet 12', 'Examplestreet&ensp;12'],
    ['Examplestreet 12', 'Examplestreet&emsp;12'],
    ['Examplestreet 12', 'Examplestreet&thinsp;12'],
    ['Examplestreet 12', 'Examplestreet&#160;12'],
    ['Examplestreet 12', 'Examplestreet&#xA0;12'],
    ['Examplestreet 12', 'Examplestreet&NewLine;12'],
    ['14 March 1991', '14&nbsp;March&nbsp;1991'],
    ['someone@example.test', 'someone&commat;example.test'],
    ['someone@example.test', 'someone&#x40;example&period;test'],
    ['+49 40 1234567', '&plus;49&nbsp;40&nbsp;1234567'],
    ['+49 40-1234567', '+49 40&hyphen;1234567'],
    ['+49 40-1234567', '+49 40&dash;1234567'],
    ['+49 40-1234567', '+49 40&ndash;1234567'],
    ['+49 40-1234567', '+49 40&minus;1234567'],
    ['(040) 1234567', '&lpar;040&rpar; 1234567'],
    ['Examplestra\u{df}e 12', 'Examplestra&szlig;e 12'],
    ['Examplestreet 12', 'Exam&shy;plestreet 12'],
    ['Examplestreet 12', 'Example&ZeroWidthSpace;street 12'],
    ['Examplestreet 12', 'Example&#173;street 12'],
    ['Examplestreet 12', 'Example&#8203;street&zwj;&zwnj; 12'],
    ['Examplestreet 12', 'Examplestreet&amp;nbsp;12'],
    ['someone@example.test', 'mailto:someone%40example.test'],
  ];
  for (const [term, html] of cases) {
    assert.deepEqual(scanHits(`<p>${html}</p>`, term), [1], `hidden by: ${html}`);
  }
});
