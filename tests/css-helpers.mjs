// Shared helpers for tests that read the built stylesheet: list files, flatten rules, and check the hint and nav rules.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { REPO_ROOT } from './helpers.mjs';

// A base hint rule: ".tip", optionally followed by the attribute selectors Astro adds to scope a component's CSS.
const BASE_TIP = /^\.tip(\[[^\]]*\])*$/;

/**
 * List every file under a folder, at any depth.
 * @param {string} dir - absolute path of the folder.
 * @returns {string[]} absolute file paths, sorted.
 */
export function filesUnder(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path));
    else found.push(path);
  }
  return found.sort();
}

/**
 * Read all the CSS files of a build into one string.
 * @param {string} outDir - the build output folder ("dist"), relative to the repo root or absolute.
 * @returns {string} the stylesheets joined with newlines.
 */
export function builtCss(outDir) {
  return filesUnder(resolve(REPO_ROOT, outDir))
    .filter((file) => file.endsWith('.css'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
}

/**
 * Split a stylesheet into its top-level blocks: the text before each "{" and the text inside the matching "}".
 * @param {string} css - a stylesheet, minified or not. Comments are ignored.
 * @returns {{ prelude: string, body: string }[]} one entry per top-level block, in order.
 */
function topLevelBlocks(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  let depth = 0;
  let start = 0;
  let bodyStart = 0;
  let prelude = '';
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '{') {
      if (depth === 0) {
        prelude = text.slice(start, i).trim();
        bodyStart = i + 1;
      }
      depth += 1;
    } else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        blocks.push({ prelude, body: text.slice(bodyStart, i) });
        start = i + 1;
      }
    }
  }
  return blocks;
}

/**
 * Flatten a stylesheet into its style rules, keeping the @media or @supports conditions each one sits under.
 * Other at-rules such as @font-face are skipped.
 * @param {string} css - a stylesheet, minified or not.
 * @param {string[]} [context] - the enclosing conditions; used by the recursion.
 * @returns {{ selector: string, body: string, context: string[] }[]} one entry per rule; context is [] for a plain rule.
 */
export function flatRules(css, context = []) {
  const rules = [];
  for (const { prelude, body } of topLevelBlocks(css)) {
    if (/^@(media|supports|layer)\b/.test(prelude)) rules.push(...flatRules(body, [...context, prelude]));
    else if (!prelude.startsWith('@')) rules.push({ selector: prelude, body, context });
  }
  return rules;
}

/**
 * Check the rules that decide when a top-bar hint (".tip") is visible.
 * Problems: there is no base .tip rule; the base rule does not set display: none; or any rule, plain or under any
 * @media condition, sets a display other than none on a selector that reaches .tip without a :hover or :focus part.
 * @param {string} css - the built stylesheet.
 * @returns {string[]} one message per problem; empty when the hints are hover and focus only.
 */
export function tipProblems(css) {
  const rules = flatRules(css);
  const problems = [];
  const base = rules.filter(
    (rule) => rule.context.length === 0 && rule.selector.split(',').some((part) => BASE_TIP.test(part.trim())),
  );
  if (base.length === 0) problems.push('there is no base .tip rule');
  else if (!base.some((rule) => /display\s*:\s*none/.test(rule.body))) {
    problems.push('the base .tip rule does not set display: none');
  }
  for (const rule of rules) {
    const reachesTip = rule.selector.split(',').some((part) => {
      // A hover or focus written inside :not() does not count as requiring hover.
      const positive = part.replace(/:not\([^)]*\)/g, '');
      return /\.tip(?![\w-])/.test(part) && !/:(hover|focus)(?!\w)/.test(positive);
    });
    if (reachesTip && /display\s*:\s*(?!none\b)[a-z-]/.test(rule.body)) {
      const where = rule.context.length ? ` under ${rule.context.join(' ')}` : '';
      problems.push(`"${rule.selector}"${where} shows a hint without hover or focus`);
    }
  }
  return problems;
}

/**
 * Whether the top-bar nav list is allowed to wrap onto a second row.
 * @param {string} css - the built stylesheet.
 * @returns {boolean} true when some rule for a "nav ... ul" selector sets flex-wrap: wrap.
 */
export function navListWraps(css) {
  return flatRules(css).some(
    (rule) => /\bnav\b.*\bul\b/.test(rule.selector.replace(/\[[^\]]*\]/g, '')) && /flex-wrap\s*:\s*wrap/.test(rule.body),
  );
}
