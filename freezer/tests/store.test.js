import test from 'node:test';
import assert from 'node:assert/strict';
import { append, inventory, merge, validateSnapshot, daysFrozen } from '../src/store.js';
import { encode, decode, readImport } from '../src/sharing.js';
const empty = () => ({ version: 1, changes: [] });
let id = 0;
const uuid = () => `test-${String(++id).padStart(5, '0')}`;
const fields = { name: 'Soup 🥣', category: 'Meals', frozen: '2026-09-01', location: 'Top drawer', notes: 'Tomato & basil' };
const add = (state, changes) => append(state, changes, uuid);
const batch = (portions = 4) => add(empty(), [{ kind: 'save', itemId: 'soup', fields }, { kind: 'adjust', itemId: 'soup', delta: portions }]);

test('two independent offline uses both reduce the shared stock', () => {
  const base = batch();
  const a = add(base, [{ kind: 'adjust', itemId: 'soup', delta: -1 }]);
  const b = add(base, [{ kind: 'adjust', itemId: 'soup', delta: -1 }]);
  assert.equal(inventory(merge(a, b))[0].portions, 2);
  assert.deepEqual(merge(a, b), merge(b, a));
  assert.deepEqual(merge(merge(a, b), a), merge(a, b));
});
test('concurrent additions, edits and consumption converge in any merge order', () => {
  const base = batch();
  const a = add(base, [{ kind: 'save', itemId: 'soup', fields: { ...fields, name: 'Red soup' } }]);
  const b = add(base, [{ kind: 'save', itemId: 'soup', fields: { ...fields, location: 'Bottom drawer' } }, { kind: 'adjust', itemId: 'soup', delta: 2 }]);
  const c = add(base, [{ kind: 'adjust', itemId: 'soup', delta: -1 }]);
  assert.deepEqual(merge(merge(a, b), c), merge(a, merge(b, c)));
  assert.equal(inventory(merge(merge(a, b), c))[0].portions, 5);
});
test('deleted items are not resurrected by an old copy or a concurrent edit', () => {
  const base = batch();
  const removed = add(base, [{ kind: 'delete', itemId: 'soup' }]);
  const edited = add(base, [{ kind: 'save', itemId: 'soup', fields: { ...fields, name: 'New name' } }]);
  assert.deepEqual(inventory(merge(removed, edited)), []);
  assert.deepEqual(inventory(merge(removed, base)), []);
});
test('overconsumption remains visible for reconciliation', () => {
  const base = batch(1);
  const a = add(base, [{ kind: 'adjust', itemId: 'soup', delta: -1 }]);
  const b = add(base, [{ kind: 'adjust', itemId: 'soup', delta: -1 }]);
  assert.equal(inventory(merge(a, b))[0].portions, -1);
});
test('compressed links round trip Unicode and can be opened repeatedly', async () => {
  const base = batch();
  const encoded = await encode(base);
  assert.deepEqual(await decode(encoded), base);
  assert.deepEqual(await readImport(`https://example.com/freezer/#freezer=${encoded}`), base);
  assert.deepEqual(merge(base, await decode(encoded)), base);
});
test('uncompressed fallback and JSON backups round trip', async () => {
  const base = batch();
  const payload = 'j.' + Buffer.from(JSON.stringify(base)).toString('base64url');
  assert.deepEqual(await decode(payload), base);
  assert.deepEqual(await readImport(JSON.stringify(base)), base);
});
test('invalid and conflicting changes are rejected without mutating local data', () => {
  const base = batch();
  const original = JSON.stringify(base);
  const bad = structuredClone(base);
  bad.changes[1].delta = 2.5;
  assert.throws(() => merge(base, bad));
  const collision = structuredClone(base);
  collision.changes[1].delta = 99;
  assert.throws(() => merge(base, collision), /Conflicting/);
  assert.throws(() => validateSnapshot({ version: 2, changes: [] }));
  assert.throws(() => validateSnapshot({ version: 1, changes: [{ ...base.changes[0], fields: { ...fields, frozen: '2026-02-31' } }] }));
  assert.equal(JSON.stringify(base), original);
});
test('invalid links and oversized decompressed payloads are rejected', async () => {
  await assert.rejects(decode('not-a-link'));
  await assert.rejects(readImport('https://example.com/freezer/'));
  const bytes = new TextEncoder().encode(' '.repeat(4_000_001));
  const compressed = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  await assert.rejects(decode('z.' + Buffer.from(compressed).toString('base64url')), /too large/);
});
test('days frozen uses calendar dates across daylight saving changes', () => {
  assert.equal(daysFrozen('2026-03-28', '2026-03-30'), 2);
  assert.equal(daysFrozen('2026-10-24', '2026-10-26'), 2);
  assert.equal(daysFrozen('2026-09-28', '2026-09-26'), 0);
});
test('imported fields cannot override item identity, portions or prototypes', () => {
  for (const key of ['id', 'portions', '__proto__']) {
    const value = JSON.parse(JSON.stringify(batch()));
    Object.defineProperty(value.changes[0].fields, key, { value: 'untrusted', enumerable: true });
    assert.throws(() => validateSnapshot(value), /Invalid food/);
  }
});
