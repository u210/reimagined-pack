// Explicit local smoke test. In codex mode, these two requests consume the logged-in account's Codex usage.
import { randomUUID } from 'node:crypto';

const url = `http://127.0.0.1:${process.env.CHAPPY_PORT ?? 18765}`;
const headers = { Authorization: `Bearer ${process.env.CHAPPY_GATEWAY_TOKEN}`, 'Content-Type': 'application/json' };
const identity = { playerId: randomUUID(), sessionId: randomUUID(), npcId: randomUUID() };
async function post(path, body) {
  const res = await fetch(url + path, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(95000) });
  const result = await res.json();
  if (!res.ok) throw new Error(`Gateway HTTP ${res.status}: ${result.error}`);
  return result;
}
try {
  const health = await (await fetch(url + '/health', { headers })).json();
  if (!health.ok || health.backend !== 'codex') throw new Error('Gateway is not using Codex');
  const first = await post('/v1/ask', { ...identity, question: 'こんにちは。君の名前を教えて。今回の合言葉は「青いかぼちゃ」だよ。', items: [] });
  if (!first.answer?.trim() || first.answer.includes('AI未接続')) throw new Error('Not a real answer');
  console.log('First answer:', first.answer);
  const second = await post('/v1/ask', { ...identity, question: 'さっき伝えた合言葉は何だった？', items: [] });
  if (!second.answer?.includes('青いかぼちゃ')) throw new Error('Conversation context was not retained');
  console.log('Follow-up answer:', second.answer);
  console.log('Live Codex answer and session continuity: PASS');
} finally { await post('/v1/session/close', identity).catch(() => {}); }
