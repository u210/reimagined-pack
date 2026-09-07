// Requires the isolated test server (25576) and a gateway on 18766 pointed only at its snapshot.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { testConsole } from './rcon-test.mjs';
const root = resolve(import.meta.dirname, '../runtime/knowledge-test-server');
const path = resolve(root, 'chappy-knowledge.json');
const load = async () => JSON.parse(await readFile(path, 'utf8'));
const url = 'http://127.0.0.1:18766';
const headers = { Authorization: `Bearer ${process.env.CHAPPY_GATEWAY_TOKEN}`, 'Content-Type': 'application/json' };
const identity = { playerId: randomUUID(), sessionId: randomUUID(), npcId: randomUUID() };
async function post(route, body) {
  const response = await fetch(url + route, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(95000) });
  const result = await response.json();
  if (!response.ok) throw new Error(`Gateway HTTP ${response.status}: ${result.error}`);
  return result;
}
async function fixture(item) {
  const before = await load();
  const recipe = { type: 'minecraft:crafting_shaped', pattern: ['##', '##'], key: { '#': { item } }, result: { id: 'minecraft:crafting_table', count: 1 } };
  await writeFile(resolve(root, 'world/datapacks/chappy-fixture/data/minecraft/recipe/crafting_table.json'), JSON.stringify(recipe));
  await testConsole('reload');
  for (let i = 0; i < 150; i++) {
    const after = await load();
    if (after.snapshotId !== before.snapshotId) {
      assert.equal(after.recipes.find(r => r.id === 'minecraft:crafting_table').data.key['#'].item, item);
      return after;
    }
    await delay(200);
  }
  throw new Error('Recipe reload did not publish a new snapshot');
}
try {
  const cobble = await fixture('minecraft:cobblestone');
  const progress = new Set();
  const interval = setInterval(() => { void post('/v1/progress', identity).then(r => progress.add(r.message)).catch(() => {}); }, 300);
  let first;
  try {
    first = await post('/v1/ask', { ...identity, knowledgeId: cobble.snapshotId, question: 'この世界の作業台の作り方を教えて。材料と配置も知りたい。', items: [] });
  } finally { clearInterval(interval); }
  console.log('Loaded custom recipe answer:', first.answer);
  assert.match(first.answer, /丸石|cobblestone/i);
  assert.match(first.answer, /minecraft:crafting_table/);
  assert.ok([...progress].some(p => /レシピ|材料/.test(p)), 'No tool progress was observed');
  const iron = await fixture('minecraft:iron_ingot');
  const second = await post('/v1/ask', { ...identity, knowledgeId: iron.snapshotId, question: '今の作業台の材料をもう一度調べて教えて。', items: [] });
  console.log('Reloaded custom recipe answer:', second.answer);
  assert.match(second.answer, /鉄インゴット|iron_ingot/i);
  assert.match(second.answer, /minecraft:crafting_table/);
  console.log('Real recipe override, Japanese lookup, tool progress and reload continuity: PASS');
} finally { await post('/v1/session/close', identity).catch(() => {}); }
