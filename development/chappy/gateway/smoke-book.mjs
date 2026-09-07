import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const identity = { playerId: randomUUID(), sessionId: randomUUID() };
const headers = { Authorization: `Bearer ${process.env.CHAPPY_GATEWAY_TOKEN}`, 'Content-Type': 'application/json' };
async function ask(question, outputMode) {
  const response = await fetch('http://127.0.0.1:18765/v1/ask', { method: 'POST', headers, signal: AbortSignal.timeout(90000), body: JSON.stringify({ ...identity, npcId: randomUUID(), question, outputMode, items: [] }) });
  assert.equal(response.status, 200); return (await response.json()).answer;
}
try {
  await ask('検証用メモです。拠点の名前は白樺港。西側に倉庫、東側に畑を作る予定です。内容を確認して。', 'chat');
  const answer = await ask('今の計画を本でまとめて', 'book');
  assert.match(answer, /白樺港/); assert.match(answer, /倉庫/); assert.match(answer, /畑/);
  assert.doesNotMatch(answer, /本.*(?:未実装|準備中|できない)/);
  console.log('Book summary live smoke passed:', answer);
} finally {
  await fetch('http://127.0.0.1:18765/v1/session/close', { method: 'POST', headers, body: JSON.stringify(identity) });
}
