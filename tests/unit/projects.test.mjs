// Unit tests for src/lib/projects.ts: the status line, the A-to-Z order of projects and the date and order of updates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDay, sortByTitle, sortUpdatesDesc, statusLabel } from '../../src/lib/projects.ts';

test('statusLabel says "Public on GitHub" when the project has a repo', () => {
  assert.equal(statusLabel({ repo: 'https://github.com/ekmungi/smart-search', private: false, status: 'anything' }), 'Public on GitHub');
});

test('statusLabel says "Code private" when the project is private', () => {
  assert.equal(statusLabel({ private: true, status: 'anything' }), 'Code private');
});

test('statusLabel falls back to the written status when there is neither a repo nor a private flag', () => {
  assert.equal(statusLabel({ private: false, status: 'Planned' }), 'Planned');
});

test('sortByTitle orders A to Z ignoring case and does not change the list it was given', () => {
  const projects = [{ data: { title: 'spyglass' } }, { data: { title: 'Smart Search MCP' } }, { data: { title: 'Smart Search' } }, { data: { title: 'AI Meeting Notes' } }];
  const sorted = sortByTitle(projects);
  assert.deepEqual(
    sorted.map((project) => project.data.title),
    ['AI Meeting Notes', 'Smart Search', 'Smart Search MCP', 'spyglass'],
  );
  assert.equal(projects[0].data.title, 'spyglass', 'the input list is untouched');
});

test('sortUpdatesDesc puts the newest update first and does not change the list it was given', () => {
  const updates = [
    { date: new Date('2026-01-05'), text: 'older' },
    { date: new Date('2026-03-01'), text: 'newest' },
    { date: new Date('2026-02-10'), text: 'middle' },
  ];
  assert.deepEqual(
    sortUpdatesDesc(updates).map((update) => update.text),
    ['newest', 'middle', 'older'],
  );
  assert.equal(updates[0].text, 'older');
});

test('formatDay writes a date as day, month name and year, from the calendar day in the file', () => {
  assert.equal(formatDay(new Date('2026-10-21')), '21 October 2026');
  assert.equal(formatDay(new Date('2026-01-05')), '5 January 2026');
});
