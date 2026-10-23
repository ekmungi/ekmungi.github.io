// Unit tests for src/lib/loaders.ts: the wrapper that silences only Astro's "no files found" warning for an empty collection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quietWhenEmpty } from '../../src/lib/loaders.ts';

/** A logger that records every call, built as a class so its methods live on the prototype like Astro's logger. */
class RecordingLogger {
  calls = [];
  info(message) { this.calls.push(['info', message]); }
  warn(message) { this.calls.push(['warn', message]); }
  error(message) { this.calls.push(['error', message]); }
}

/** A stand-in for glob(): it logs the given messages through the logger it receives and records its context. */
function fakeLoader(messages) {
  const seen = { context: null };
  const loader = {
    name: 'fake-loader',
    async load(context) {
      seen.context = context;
      for (const [level, message] of messages) context.logger[level](message);
    },
  };
  return { loader, seen };
}

test('the empty-folder warning is dropped', async () => {
  const { loader } = fakeLoader([['warn', 'No files found matching "**/*.md" in directory "src\\content\\posts"']]);
  const logger = new RecordingLogger();
  await quietWhenEmpty(loader).load({ collection: 'posts', logger });
  assert.deepEqual(logger.calls, []);
});

test('every other warning still reaches the real logger, and so do info and error messages', async () => {
  const { loader } = fakeLoader([
    ['warn', 'The base directory "x" does not exist.'],
    ['info', 'Loaded 3 entries'],
    ['error', 'Could not parse a.md'],
  ]);
  const logger = new RecordingLogger();
  await quietWhenEmpty(loader).load({ collection: 'posts', logger });
  assert.deepEqual(logger.calls, [
    ['warn', 'The base directory "x" does not exist.'],
    ['info', 'Loaded 3 entries'],
    ['error', 'Could not parse a.md'],
  ]);
});

test('the wrapped loader keeps its name and receives the rest of the context unchanged', async () => {
  const { loader, seen } = fakeLoader([]);
  const wrapped = quietWhenEmpty(loader);
  const store = { id: 'store' };
  await wrapped.load({ collection: 'posts', store, logger: new RecordingLogger() });
  assert.equal(wrapped.name, 'fake-loader');
  assert.equal(seen.context.collection, 'posts');
  assert.equal(seen.context.store, store);
});

test('the context passed in is not changed', async () => {
  const { loader } = fakeLoader([]);
  const logger = new RecordingLogger();
  const context = { collection: 'posts', logger };
  await quietWhenEmpty(loader).load(context);
  assert.equal(context.logger, logger);
});
