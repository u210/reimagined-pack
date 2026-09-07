import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { CodexProvider, authenticate } from './codex.mjs';

class FakeRpc extends EventEmitter {
  requests = [];
  async request(method, params) {
    this.requests.push({ method, params });
    if (method === 'thread/start') return { thread: { id: `thread-${this.requests.length}` } };
    if (method === 'turn/start') return { turn: { id: 'turn-1' } };
    return {};
  }
}
test('failed lookups expose the schema, suppress identical retries and end research after two errors', async () => {
  const rpc = new FakeRpc(), provider = new CodexProvider(rpc, '/knowledge', 'gpt-5.6-luna', 'max');
  const session = await provider.create(), controller = new AbortController();
  let executions = 0;
  const answer = session.ask({ question: 'Globe' }, controller.signal, { knowledge: {
    summary: () => ({}), execute: () => { executions++; throw new Error('private data must not escape'); },
  } });
  rpc.emit('notification', { method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'active' } } });
  const handler = rpc.toolHandlers.get('thread-1');
  const call = { turnId: 'active', tool: 'minecraft_search_documents', arguments: { query: 'Globe', limit: -1 } };
  const failed = handler(call);
  assert.equal(failed.success, false); assert.match(failed.contentItems[0].text, /expectedInputSchema/);
  assert.doesNotMatch(failed.contentItems[0].text, /private data/);
  assert.equal(JSON.parse(handler(call).contentItems[0].text).researchComplete, true);
  handler({ ...call, arguments: { query: 'Globe', limit: 0 } });
  assert.equal(JSON.parse(handler({ ...call, arguments: { query: 'Globe' } }).contentItems[0].text).researchComplete, true);
  assert.equal(executions, 2);
  controller.abort(); await assert.rejects(answer);
});

test('lookup budget stops execution but lets the model finish a partial answer', async () => {
  const rpc = new FakeRpc(), session = await new CodexProvider(rpc, '/knowledge', 'test').create();
  let executions = 0;
  const answer = session.ask({ question: 'Globe' }, new AbortController().signal, { knowledge: {
    summary: () => ({}), execute: () => { executions++; return { found: false }; },
  } });
  rpc.emit('notification', { method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'active' } } });
  const handler = rpc.toolHandlers.get('thread-1');
  let last;
  for (let i = 0; i < 10; i++) last = handler({ turnId: 'active', tool: 'minecraft_search_documents', arguments: { query: 'Globe' } });
  assert.equal(executions, 8); assert.equal(JSON.parse(last.contentItems[0].text).researchComplete, true);
  rpc.emit('notification', { method: 'item/completed', params: { threadId: 'thread-1', item: { type: 'agentMessage', text: '詳しい操作は未確認だよ。', phase: 'final_answer' } } });
  rpc.emit('notification', { method: 'turn/completed', params: { threadId: 'thread-1', turn: { status: 'completed' } } });
  assert.equal(await answer, '詳しい操作は未確認だよ。');
});
test('explicit model and effort are passed to thread creation and every turn', async () => {
  const rpc = new FakeRpc(), provider = new CodexProvider(rpc, '/knowledge', 'gpt-5.6-luna', 'max');
  const session = await provider.create();
  assert.equal(rpc.requests[0].params.model, 'gpt-5.6-luna');
  assert.equal(rpc.requests[0].params.config.model_reasoning_effort, 'max');
  const controller = new AbortController();
  const response = session.ask({ question: 'こんにちは', items: [] }, controller.signal);
  assert.equal(rpc.requests.find(r => r.method === 'turn/start').params.effort, 'max');
  controller.abort(); await assert.rejects(response, /Cancelled/);
});
test('Minecraft tools are scoped to the active turn and report only safe progress', async () => {
  const rpc = new FakeRpc(), provider = new CodexProvider(rpc, '/knowledge', 'test-model');
  const session = await provider.create(); const controller = new AbortController(); const progress = [];
  const response = session.ask({ question: '調べて', items: [] }, controller.signal,
    { knowledge: { summary: () => ({ available: true }), execute: () => ({ recipeId: 'test:recipe' }) }, onProgress: p => progress.push(p) });
  rpc.emit('notification', { method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'active-turn' } } });
  const handler = rpc.toolHandlers.get('thread-1');
  assert.equal(handler({ turnId: 'old-turn', tool: 'minecraft_recipe_detail', arguments: {} }).success, false);
  assert.equal(handler({ turnId: 'active-turn', tool: 'minecraft_recipe_detail', arguments: {} }).success, true);
  assert.deepEqual(progress, ['材料と作り方を確認しているよ…']);
  controller.abort(); await assert.rejects(response); assert.equal(rpc.toolHandlers.size, 0);
});
test('Codex adapter isolates threads and returns only the final message', async () => {
  const rpc = new FakeRpc(), provider = new CodexProvider(rpc, '/knowledge', 'test-model');
  const a = await provider.create(), b = await provider.create();
  const pendingA = a.ask({ question: 'A', items: [] }, new AbortController().signal);
  const pendingB = b.ask({ question: 'B', items: [] }, new AbortController().signal);
  const emit = (threadId, text, phase) => rpc.emit('notification', {
    method: 'item/completed', params: { threadId, item: { type: 'agentMessage', text, phase } },
  });
  emit('thread-1', '調査途中', 'commentary');
  emit('thread-2', 'Bの回答', 'final_answer');
  emit('thread-1', 'Aの回答', 'final_answer');
  for (const threadId of ['thread-2', 'thread-1']) rpc.emit('notification', { method: 'turn/completed', params: { threadId, turn: { status: 'completed' } } });
  assert.equal(await pendingA, 'Aの回答'); assert.equal(await pendingB, 'Bの回答');
  assert.equal(rpc.listenerCount('notification'), 0);
  assert.equal(rpc.requests[0].params.sandbox, 'read-only');
  assert.deepEqual(rpc.requests[0].params.environments, []);
});

test('saved ChatGPT login is reused without API authentication', async () => {
  const rpc = new FakeRpc();
  rpc.request = async (method, params) => {
    rpc.requests.push({ method, params });
    return { account: { type: 'chatgpt' } };
  };
  await authenticate(rpc, { apiKey: 'ignored-api-key' });
  assert.deepEqual(rpc.requests.map(r => r.method), ['account/read']);
});
test('gateway fails clearly when interactive login has not happened', async () => {
  const rpc = new FakeRpc();
  await assert.rejects(authenticate(rpc), /login-chatgpt.ps1/);
  assert.ok(!rpc.requests.some(r => r.method === 'account/login/start'));
});
test('browser login accepts an early success notification and verifies the account', async () => {
  const rpc = new FakeRpc(); let reads = 0, opened = false;
  rpc.request = async method => {
    if (method === 'account/read') return { account: ++reads === 1 ? null : { type: 'chatgpt' } };
    if (method === 'account/login/start') {
      rpc.emit('notification', { method: 'account/login/completed', params: { loginId: 'login-1', success: true } });
      return { loginId: 'login-1', authUrl: 'https://auth.openai.com/test' };
    }
  };
  await authenticate(rpc, { interactive: true, onLogin: async () => { opened = true; } });
  assert.equal(opened, true); assert.equal(reads, 2); assert.equal(rpc.listenerCount('notification'), 0);
});
test('browser login timeout cancels the attempt and clears listeners', async () => {
  const rpc = new FakeRpc();
  rpc.request = async (method, params) => {
    rpc.requests.push({ method, params });
    return method === 'account/login/start' ? { loginId: 'login-1', authUrl: 'https://auth.openai.com/test' } : {};
  };
  await assert.rejects(authenticate(rpc, { interactive: true, timeoutMs: 10 }), /timed out/);
  assert.ok(rpc.requests.some(r => r.method === 'account/login/cancel'));
  assert.equal(rpc.listenerCount('notification'), 0);
});

test('login waits for the saved-account cache after the success notification', async () => {
  const rpc = new FakeRpc(); let reads = 0;
  rpc.request = async method => {
    if (method === 'account/read') return { account: ++reads < 3 ? null : { type: 'chatgpt' } };
    if (method === 'account/login/start') {
      rpc.emit('notification', { method: 'account/login/completed', params: { loginId: 'login-1', success: true } });
      return { loginId: 'login-1', authUrl: 'https://auth.openai.com/test' };
    }
  };
  await authenticate(rpc, { interactive: true });
  assert.equal(reads, 3);
});
test('cancelled turn is interrupted even when turn/start responds after cancellation', async () => {
  const rpc = new FakeRpc(), provider = new CodexProvider(rpc, '/knowledge', 'test-model');
  const a = await provider.create(), abort = new AbortController();
  const answer = a.ask({ question: 'A', items: [] }, abort.signal);
  abort.abort(); await assert.rejects(answer, /Cancelled/);
  await new Promise(r => setImmediate(r));
  assert.ok(rpc.requests.some(r => r.method === 'turn/interrupt'));
  assert.equal(rpc.listenerCount('notification'), 0);
});

test('inventory is fetched on demand, isolated per player and unavailable after the turn', async () => {
  const rpc = new FakeRpc(), provider = new CodexProvider(rpc, '/knowledge', 'test-model');
  const a = await provider.create(), b = await provider.create();
  const ca = new AbortController(), cb = new AbortController();
  const pa = a.ask({ question: '手持ちは？' }, ca.signal, { inventory: { items: [{ id: 'test:private_a' }] } });
  const pb = b.ask({ question: '手持ちは？' }, cb.signal, { inventory: { items: [{ id: 'test:private_b' }] } });
  for (const id of ['thread-1', 'thread-2']) rpc.emit('notification', { method: 'turn/started', params: { threadId: id, turn: { id: 'turn-live' } } });
  const call = { turnId: 'turn-live', tool: 'minecraft_player_inventory', arguments: {} };
  const ha = rpc.toolHandlers.get('thread-1'), hb = rpc.toolHandlers.get('thread-2');
  assert.match(ha(call).contentItems[0].text, /private_a/);
  assert.doesNotMatch(ha(call).contentItems[0].text, /private_b/);
  assert.match(hb(call).contentItems[0].text, /private_b/);
  assert.equal(ha({ ...call, arguments: { playerId: 'someone-else' } }).success, false);
  assert.ok(rpc.requests.filter(r => r.method === 'turn/start').every(r => !r.params.input[0].text.includes('private_')));
  ca.abort(); cb.abort(); await Promise.all([assert.rejects(pa), assert.rejects(pb)]);
  assert.equal(ha(call).success, false);
  const cc = new AbortController();
  const pc = a.ask({ question: '今は？' }, cc.signal, { inventory: { items: [] } });
  rpc.emit('notification', { method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'turn-new' } } });
  assert.equal(rpc.toolHandlers.get('thread-1')({ ...call, turnId: 'turn-new' }).contentItems[0].text, '{"items":[]}');
  cc.abort(); await assert.rejects(pc);
});

test('image and memory are scoped to a turn; image is an input part, not prompt text', async () => {
  const { memoryContext } = await import('./memory.mjs');
  const rpc = new FakeRpc(), provider = new CodexProvider(rpc,'/knowledge','gpt-5.6-luna','max');
  const session = await provider.create(), controller = new AbortController(), memory = memoryContext(['白樺港']);
  const answer = session.ask({question:'写真を見て'},controller.signal,{photo:'data:image/png;base64,TEST',memory});
  const input = rpc.requests.find(r => r.method === 'turn/start').params.input;
  assert.equal(input[1].type,'image'); assert.equal(input[1].url,'data:image/png;base64,TEST');
  assert.ok(!input[0].text.includes('base64')); assert.match(input[0].text,/白樺港/);
  rpc.emit('notification',{method:'turn/started',params:{threadId:'thread-1',turn:{id:'active'}}});
  const handler = rpc.toolHandlers.get('thread-1');
  assert.equal(handler({turnId:'old',tool:'minecraft_remember',arguments:{note:'bad'}}).success,false);
  assert.equal(handler({turnId:'active',tool:'minecraft_remember',arguments:{note:'新しい倉庫'}}).success,true);
  assert.deepEqual(memory.notes,['白樺港','新しい倉庫']);
  controller.abort(); await assert.rejects(answer);
  assert.equal(handler({turnId:'active',tool:'minecraft_remember',arguments:{note:'late'}}).success,false);
});
