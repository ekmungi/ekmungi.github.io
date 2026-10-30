// Unit tests: the Stone palette in src/styles/tokens.css, and WCAG 2 contrast of text colours on every background.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../helpers.mjs';

// The palette the design agreed (requirement R15): any change must be a deliberate edit to this table too.
const AGREED = {
  '--bg': '#efefed',
  '--frame': '#f8f8f7',
  '--frame-2': '#e2e2de',
  '--rule': '#dbdbd7',
  '--ink': '#3a3b3d',
  '--ink-strong': '#2b2c2e',
  '--muted': '#626366',
  '--accent': '#4a5f86',
  // The warning box, added on 2026-10-30 for the recording-consent notice on the AI Meeting Notes page.
  '--warn-bg': '#fbf1df',
  '--warn-rule': '#d9a441',
  '--warn-ink': '#7a4a00',
};

/**
 * Read every "--name: #rrggbb" custom property out of a stylesheet.
 * @param {string} css - the stylesheet text.
 * @returns {Record<string, string>} property name (with the leading dashes) to lower-case hex colour.
 */
function parseTokens(css) {
  const tokens = {};
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

/**
 * WCAG 2 relative luminance of a colour.
 * @param {string} hex - a colour written "#rrggbb".
 * @returns {number} luminance from 0 (black) to 1 (white).
 */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2 contrast ratio between two colours, the same whichever is the text and whichever the background.
 * @param {string} a - a colour written "#rrggbb".
 * @param {string} b - a colour written "#rrggbb".
 * @returns {number} ratio from 1 (identical) to 21 (black on white).
 */
function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const tokens = parseTokens(readFileSync(join(REPO_ROOT, 'src', 'styles', 'tokens.css'), 'utf8'));

test('contrast gives 21 for black on white, 1 for identical colours, and does not depend on the order', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff') * 100) / 100, 21);
  assert.equal(contrast('#4a5f86', '#4a5f86'), 1);
  assert.equal(contrast('#2b2c2e', '#efefed'), contrast('#efefed', '#2b2c2e'));
});

test('parseTokens reads hex custom properties and ignores everything else', () => {
  const css = ':root { --a: #AABBCC; --b:#112233;\n  --c: 18px; color: #ffffff; }';
  assert.deepEqual(parseTokens(css), { '--a': '#aabbcc', '--b': '#112233' });
});

test('tokens.css holds exactly the agreed Stone palette', () => {
  assert.deepEqual(tokens, AGREED);
});

// The warning box's heading and text must be as readable as the rest of the site.
for (const fg of ['--warn-ink', '--ink-strong']) {
  test(`${fg} on --warn-bg >= 4.5`, () => {
    assert.ok(contrast(tokens[fg], tokens['--warn-bg']) >= 4.5, `${fg} ${tokens[fg]} on --warn-bg ${tokens['--warn-bg']}`);
  });
}

for (const fg of ['--ink', '--ink-strong', '--muted', '--accent']) {
  for (const bg of ['--bg', '--frame', '--frame-2']) {
    test(`${fg} on ${bg} >= 4.5`, () => {
      assert.ok(tokens[fg] && tokens[bg], `tokens.css must define ${fg} and ${bg}`);
      assert.ok(contrast(tokens[fg], tokens[bg]) >= 4.5, `${fg} ${tokens[fg]} on ${bg} ${tokens[bg]}`);
    });
  }
}
