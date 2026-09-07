import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const playerId = randomUUID();
const headers = { Authorization: `Bearer ${process.env.CHAPPY_GATEWAY_TOKEN}`, 'Content-Type': 'application/json' };
async function ask(sessionId, question, extra = {}) {
  const r = await fetch('http://127.0.0.1:18765/v1/ask', { method:'POST', headers, signal:AbortSignal.timeout(90000), body:JSON.stringify({playerId,sessionId,npcId:randomUUID(),question,items:[],...extra}) });
  assert.equal(r.status,200); return r.json();
}
async function close(sessionId) { await fetch('http://127.0.0.1:18765/v1/session/close',{method:'POST',headers,body:JSON.stringify({playerId,sessionId})}); }
const a=randomUUID(),b=randomUUID();
try {
  const photo=(await readFile(new URL('../runtime/validation-server/photo-check.txt',import.meta.url),'utf8')).trim();
  const first=await ask(a,'画像の左半分と右半分の色をそれぞれ教えて。それから私の拠点名は「琥珀灯台」なので長く覚えておいて。',{photo});
  assert.match(first.answer,/赤/); assert.match(first.answer,/青/); assert.ok(first.memory.some(s=>s.includes('琥珀灯台')));
  await close(a);
  const second=await ask(b,'私の拠点の名前を覚えてる？',{memory:first.memory});
  assert.match(second.answer,/琥珀灯台/);
  console.log('Live image + persistent-memory context checks passed:',first.answer,second.answer);
} finally { await close(a); await close(b); }
