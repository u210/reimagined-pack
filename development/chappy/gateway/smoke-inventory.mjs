import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const identity = { playerId: randomUUID(), sessionId: randomUUID() };
const headers = { Authorization: `Bearer ${process.env.CHAPPY_GATEWAY_TOKEN}`, 'Content-Type': 'application/json' };
try {
  const response = await fetch('http://127.0.0.1:18765/v1/ask', { method: 'POST', headers, signal: AbortSignal.timeout(90000), body: JSON.stringify({ ...identity, npcId: randomUUID(), question: '私が今メインハンドに持っているアイテム名と個数を、持ち物を確認して教えて。', items: [], inventory: { selectedSlot: 2, items: [{ slot: 2, id: 'minecraft:diamond', name: 'ダイヤモンド', count: 7 }, { slot: 40, id: 'minecraft:torch', name: '松明', count: 11 }] } }) });
  assert.equal(response.status, 200);
  const { answer } = await response.json(); assert.match(answer, /ダイヤモンド/); assert.match(answer, /7|７|七/);
  console.log('Synthetic inventory smoke passed:', answer);
} finally {
  await fetch('http://127.0.0.1:18765/v1/session/close', { method: 'POST', headers, body: JSON.stringify(identity) });
}
