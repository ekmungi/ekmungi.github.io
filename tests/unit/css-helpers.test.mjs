// Unit tests for tests/css-helpers.mjs: rule flattening, and the checks that keep top-bar hints hover-only and the nav wrapping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { filesUnder, flatRules, navListWraps, tipProblems } from '../css-helpers.mjs';

// The hint rules of a correct stylesheet, as the minifier writes them (scoped attribute included).
const GOOD_BASE = '.tip[data-astro-cid-x]{z-index:1;display:none;position:absolute}';
const GOOD_REVEAL =
  '.nav[data-astro-cid-x]:hover .tip[data-astro-cid-x],.nav[data-astro-cid-x]:focus-within .tip[data-astro-cid-x]{display:block}';

test('flatRules lists plain rules with no context and nested rules with their @media condition', () => {
  const css = '/* note */.a{x:1}@media (hover:none){.b{y:2}@media (width<=520px){.c{z:3}}}.d{w:4}';
  assert.deepEqual(flatRules(css), [
    { selector: '.a', body: 'x:1', context: [] },
    { selector: '.b', body: 'y:2', context: ['@media (hover:none)'] },
    { selector: '.c', body: 'z:3', context: ['@media (hover:none)', '@media (width<=520px)'] },
    { selector: '.d', body: 'w:4', context: [] },
  ]);
});

test('flatRules skips at-rules that are not conditions, such as @font-face', () => {
  const css = '@font-face{font-family:F;src:url(a.woff2)}.a{x:1}';
  assert.deepEqual(flatRules(css), [{ selector: '.a', body: 'x:1', context: [] }]);
});

test('tipProblems accepts a stylesheet that hides the hint and reveals it only on hover or focus', () => {
  assert.deepEqual(tipProblems(`${GOOD_BASE}${GOOD_REVEAL}`), []);
});

test('tipProblems accepts a phone rule that only moves the hint, and a reveal under (hover:hover)', () => {
  const css = `${GOOD_BASE}${GOOD_REVEAL}@media (width<=520px){.tip[data-astro-cid-x]{left:18px;right:18px}}@media (hover:hover){.nav:hover .tip{display:block}}`;
  assert.deepEqual(tipProblems(css), []);
});

test('tipProblems fails when there is no base .tip rule', () => {
  assert.equal(tipProblems(GOOD_REVEAL).length, 1);
  assert.match(tipProblems(GOOD_REVEAL)[0], /no base \.tip rule/);
});

test('tipProblems fails when the base .tip rule does not hide the hint', () => {
  const problems = tipProblems(`.tip{position:absolute}${GOOD_REVEAL}`);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /display: none/);
});

test('tipProblems fails when the base .tip rule makes the hint visible', () => {
  assert.ok(tipProblems(`.tip{display:none}.tip{display:block}${GOOD_REVEAL}`).length > 0);
});

// Every way the hint could be forced on for touch screens or in any other media condition.
for (const condition of [
  '(any-hover:none)',
  '(hover:none)',
  '(pointer:coarse)',
  'not all and (hover:hover)',
  '(width<=520px)',
  '(max-width:520px)',
  'print',
]) {
  test(`tipProblems fails on a rule under @media ${condition} that shows the hint without hover`, () => {
    for (const rule of ['.tip{display:block}', '.nav .tip{display:inline-block}', 'header .nav .tip{display:flex}']) {
      const problems = tipProblems(`${GOOD_BASE}${GOOD_REVEAL}@media ${condition}{${rule}}`);
      assert.equal(problems.length, 1, `${condition} ${rule}`);
      assert.match(problems[0], /without hover or focus/);
    }
  });
}

test('tipProblems fails on a nested @media rule that shows the hint', () => {
  assert.equal(tipProblems(`${GOOD_BASE}${GOOD_REVEAL}@media (width<=520px){@media (hover:none){.tip{display:block}}}`).length, 1);
});

test('tipProblems fails on a reveal that only mentions hover inside :not()', () => {
  assert.equal(tipProblems(`${GOOD_BASE}${GOOD_REVEAL}@media (hover:none){.nav:not(:hover) .tip{display:block}}`).length, 1);
});

test('tipProblems fails on a top-level rule outside the base and hover rules that shows the hint', () => {
  assert.equal(tipProblems(`${GOOD_BASE}${GOOD_REVEAL}.tip.open{display:block}`).length, 1);
});

test('navListWraps is true when a nav list rule sets flex-wrap: wrap, at any width', () => {
  assert.equal(navListWraps('nav[data-astro-cid-x].main ul[data-astro-cid-x]{gap:6px;flex-wrap:wrap;display:flex}'), true);
  assert.equal(navListWraps('@media (width<=520px){nav.main ul{flex-wrap:wrap}}'), true);
});

test('navListWraps is false when the nav list never wraps', () => {
  assert.equal(navListWraps('nav.main ul{gap:6px;display:flex}'), false);
  assert.equal(navListWraps('.bar{flex-wrap:wrap}'), false);
  assert.equal(navListWraps('nav.main ul{flex-wrap:nowrap}'), false);
});

test('filesUnder lists files at any depth, sorted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'css-helpers-test-'));
  try {
    mkdirSync(join(dir, 'b'));
    writeFileSync(join(dir, 'z.css'), '');
    writeFileSync(join(dir, 'b', 'a.css'), '');
    assert.deepEqual(filesUnder(dir).map((file) => relative(dir, file).split('\\').join('/')), ['b/a.css', 'z.css']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
