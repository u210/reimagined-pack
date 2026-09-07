import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const snapshot=JSON.parse(await readFile(new URL('../runtime/integration-server/chappy-knowledge.json',import.meta.url),'utf8'));
const identity={playerId:randomUUID(),sessionId:randomUUID()};
const headers={Authorization:`Bearer ${process.env.CHAPPY_GATEWAY_TOKEN}`,'Content-Type':'application/json'};
try {
  const r=await fetch('http://127.0.0.1:18765/v1/ask',{method:'POST',headers,signal:AbortSignal.timeout(90000),body:JSON.stringify({...identity,npcId:randomUUID(),knowledgeId:snapshot.snapshotId,question:'Exposureの導入版と、この世界の設定ファイルでカラー写真の印刷にかかる時間（print_time_color）はいくつか、資料を調べて出典付きで教えて。',items:[]})});
  assert.equal(r.status,200); const {answer}=await r.json();
  assert.match(answer,/1\.9\.18/); assert.match(answer,/160/); assert.match(answer,/exposure-server|print_time_color/);
  console.log('Integration documentation live smoke passed:',answer);
} finally { await fetch('http://127.0.0.1:18765/v1/session/close',{method:'POST',headers,body:JSON.stringify(identity)}); }
