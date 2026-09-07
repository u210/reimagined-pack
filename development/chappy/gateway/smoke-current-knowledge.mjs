import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const snapshot = JSON.parse(await readFile(resolve(import.meta.dirname, '../runtime/server/chappy-knowledge.json'), 'utf8'));
const recipe = snapshot.recipes.find(r => r.id === 'minecraft:crafting_table');
assert.equal(recipe.data.key['#'].tag, 'minecraft:planks', 'The isolated test fixture must never affect the regular server');
const url = 'http://127.0.0.1:18765';
const headers = { Authorization: `Bearer ${process.env.CHAPPY_GATEWAY_TOKEN}`, 'Content-Type': 'application/json' };
const identity = { playerId: randomUUID(), sessionId: randomUUID(), npcId: randomUUID() };
try {
  const res = await fetch(url + '/v1/ask', { method: 'POST', headers, signal: AbortSignal.timeout(95000), body: JSON.stringify({ ...identity,
    knowledgeId: snapshot.snapshotId, question: '添付したものの作り方を調べて。材料と配置も教えて。',
    items: [{ slot: 1, id: 'minecraft:crafting_table', name: '作業台' }] }) });
  const result = await res.json(); assert.equal(res.status, 200, result.error);
  assert.match(result.answer, /板材|木材|木の板|planks/i); assert.match(result.answer, /minecraft:crafting_table/);
  console.log(result.answer); console.log('Regular server snapshot and attached-item recipe lookup: PASS');
} finally {
  await fetch(url + '/v1/session/close', { method: 'POST', headers, body: JSON.stringify(identity) });
}
