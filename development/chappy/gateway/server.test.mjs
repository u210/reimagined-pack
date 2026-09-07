import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createGateway, MockProvider } from './server.mjs';

const token = 'test-only-token-that-is-at-least-32-characters';
const makeBody = () => ({ playerId: randomUUID(), sessionId: randomUUID(), npcId: randomUUID(), question: '作り方は？', items: [] });
async function fixture(t, options = {}) {
  const gateway = createGateway({ token, provider: new MockProvider(), ...options });
  await new Promise(r => gateway.server.listen(0, '127.0.0.1', r));
  t.after(() => gateway.close());
  const url = `http://127.0.0.1:${gateway.server.address().port}`;
  return async (body, route = '/v1/ask', auth = token) => {
    const r = await fetch(url + route, { method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
}
test('authentication and malformed attachments are rejected before reaching the AI', async t => {
  const post = await fixture(t);
  assert.equal((await post(makeBody(), '/v1/ask', 'wrong')).status, 401);
  assert.equal((await post({ ...makeBody(), items: [{ slot: 1, id: '../../secret', name: 'x' }] })).status, 400);
  assert.equal((await post({ ...makeBody(), question: 'a'.repeat(1001) })).status, 400);
  assert.equal((await post({ ...makeBody(), question: '\u0000' })).status, 400);
});
test('players have separate histories; reconnect starts fresh; old sessions cannot return', async t => {
  const post = await fixture(t), a = makeBody(), b = makeBody();
  assert.match((await post(a)).body.answer, /1回目/);
  assert.match((await post(a)).body.answer, /2回目/);
  assert.match((await post(b)).body.answer, /1回目/);
  assert.equal((await post(a, '/v1/session/close')).status, 200);
  assert.equal((await post(a)).status, 409);
  assert.match((await post({ ...a, sessionId: randomUUID() })).body.answer, /1回目/);
});
test('same-session requests are serialized and global concurrency is bounded', async t => {
  const post = await fixture(t, { maxConcurrent: 1 }), a = makeBody();
  const first = post(a); await delay(80);
  assert.equal((await post(a)).status, 409);
  assert.equal((await post(makeBody())).status, 429);
  assert.equal((await first).status, 200);
});
test('logout during an answer prevents delivery', async t => {
  const post = await fixture(t), a = makeBody();
  const pending = post(a); await delay(80);
  await post(a, '/v1/session/close');
  assert.notEqual((await pending).status, 200);
});
test('timeout releases capacity even when a backend ignores cancellation', async t => {
  let calls = 0;
  const provider = { async create() { return { async ask() { if (++calls === 1) return new Promise(() => {}); return 'ok'; }, async close() {} }; }, async close() {} };
  const post = await fixture(t, { provider, timeoutMs: 30, maxConcurrent: 1 });
  assert.equal((await post(makeBody())).status, 504);
  assert.equal((await post(makeBody())).body.answer, 'ok');
});

test('deadline remains HTTP 504 when the provider rejects immediately on abort', async t => {
  const provider = { async create() { return {
    ask(input, signal) { return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true })); },
    async close() {},
  }; }, async close() {} };
  const post = await fixture(t, { provider, timeoutMs: 30 });
  const result = await post(makeBody());
  assert.equal(result.status, 504); assert.equal(result.body.error, 'Timed out');
});

test('inventory is validated and passed only as per-request tool context', async t => {
  const seen = [];
  const provider = { async create() { return { async ask(input, signal, context) { seen.push({ input, inventory: context.inventory }); return 'ok'; }, async close() {} }; }, async close() {} };
  const post = await fixture(t, { provider });
  const a = makeBody(), b = makeBody();
  const inventory = { selectedSlot: 2, items: [{ slot: 2, id: 'minecraft:diamond', name: 'ダイヤモンド', count: 3 }] };
  assert.equal((await post({ ...a, inventory })).status, 200);
  assert.equal((await post({ ...b, inventory: { selectedSlot: 0, items: [] } })).status, 200);
  assert.equal((await post({ ...a, inventory: { selectedSlot: 1, items: [] } })).status, 200);
  assert.equal(seen[0].input.inventory, undefined);
  assert.equal(seen[0].inventory.items[0].count, 3);
  assert.deepEqual(seen[1].inventory.items, []);
  assert.deepEqual(seen[2].inventory.items, []);
  for (const invalid of [{ selectedSlot: 9, items: [] }, { ...inventory, items: [...inventory.items, ...inventory.items] }, { ...inventory, items: [{ ...inventory.items[0], count: -1 }] }]) {
    assert.equal((await post({ ...makeBody(), inventory: invalid })).status, 400);
  }
  assert.equal(seen.length, 3);
});

test('book output mode reaches the model and unknown modes are rejected', async t => {
  const seen = [];
  const provider = { async create() { return { async ask(input) { seen.push(input.outputMode); return '本文'; }, async close() {} }; }, async close() {} };
  const post = await fixture(t, { provider });
  assert.equal((await post({ ...makeBody(), outputMode: 'book' })).status, 200);
  assert.equal((await post(makeBody())).status, 200);
  assert.equal((await post({ ...makeBody(), outputMode: 'execute' })).status, 400);
  assert.deepEqual(seen, ['book', 'chat']);
});
