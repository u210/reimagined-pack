import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const snapshot = JSON.parse(await readFile(new URL('../runtime/integration-server/chappy-knowledge.json', import.meta.url), 'utf8'));
const base = `http://127.0.0.1:${process.env.CHAPPY_PORT ?? 18765}`;
const headers = { Authorization: `Bearer ${process.env.CHAPPY_GATEWAY_TOKEN}`, 'Content-Type': 'application/json' };
for (const question of [
  '俺の持ってるGlobeってアイテム、どうやって使うものなの？',
  'Exposureの導入版と、この世界の設定ファイルでカラー写真の印刷にかかる時間（print_time_color）はいくつか、資料を調べて出典付きで教えて。',
]) {
  const identity = { playerId: randomUUID(), sessionId: randomUUID() };
  const start = Date.now();
  try {
    const response = await fetch(`${base}/v1/ask`, { method: 'POST', headers, signal: AbortSignal.timeout(90000), body: JSON.stringify({
      ...identity, npcId: randomUUID(), knowledgeId: snapshot.snapshotId, question, items: [],
      inventory: { selectedSlot: 1, items: [{ slot: 1, id: 'supplementaries:globe', name: 'Globe', count: 1 }] },
    }) });
    assert.equal(response.status, 200);
    const { answer } = await response.json();
    assert.ok(answer?.trim());
    if (question.includes('Exposure')) { assert.match(answer, /1\.9\.18/); assert.match(answer, /160/); }
    else assert.match(answer, /Globe|地球儀|globe/);
    console.log(JSON.stringify({ seconds: (Date.now() - start) / 1000, answer }));
  } finally {
    await fetch(`${base}/v1/session/close`, { method: 'POST', headers, body: JSON.stringify(identity) });
  }
}
