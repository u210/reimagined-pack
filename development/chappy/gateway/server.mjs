import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { CodexProvider } from './codex.mjs';
import { KnowledgeStore } from './knowledge.mjs';
import { validateInventory } from './inventory.mjs';
import { memoryContext } from './memory.mjs';
import { validatePhoto } from './photo.mjs';
import { validateScene } from './scene.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function identity(body) {
  if (!uuid.test(body.playerId ?? '') || !uuid.test(body.sessionId ?? '')) throw new HttpError(400, 'Invalid identity');
  return `${body.playerId}/${body.sessionId}`;
}
function validate(body) {
  identity(body);
  if (!uuid.test(body.npcId ?? '') || typeof body.question !== 'string' || !body.question.trim()
      || body.question.length > 1000 || /[\x00-\x1f\x7f]/.test(body.question)) throw new HttpError(400, 'Invalid question');
  if (!Array.isArray(body.items) || body.items.length > 3) throw new HttpError(400, 'Invalid attachments');
  if (body.knowledgeId != null && !uuid.test(body.knowledgeId)) throw new HttpError(400, 'Invalid knowledge identity');
  if (body.outputMode != null && !['chat', 'book'].includes(body.outputMode)) throw new HttpError(400, 'Invalid output mode');
  return { outputMode: body.outputMode ?? 'chat', question: body.question.trim(), items: body.items.map(item => {
    if (!Number.isInteger(item.slot) || item.slot < 1 || item.slot > 3
        || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(item.id ?? '') || item.id.length > 256
        || typeof item.name !== 'string' || item.name.length > 512) throw new HttpError(400, 'Invalid item');
    return { slot: item.slot, id: item.id, name: item.name };
  }) };
}
async function readBody(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1800000) throw new HttpError(413, 'Body too large');
    chunks.push(chunk);
  }
  try { const b = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!b || Array.isArray(b) || typeof b !== 'object') throw 0; return b; }
  catch { throw new HttpError(400, 'Invalid JSON'); }
}
function reply(res, status, body) {
  if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
}

export class MockProvider {
  async create() {
    let turns = 0;
    return {
      async ask(input, signal) {
        await delay(800, undefined, { signal });
        turns++;
        const attachments = input.items.map(i => `${i.slot}: ${i.name} (${i.id})`).join('、');
        return `【接続テスト・AI未接続】うん、質問を受け取ったよ。このログインで${turns}回目の相談だね。`
          + (attachments ? ` 添付は ${attachments} だね。` : '') + ' 本物の調査と回答はAI接続後にできるよ。';
      },
      async close() {},
    };
  }
  async close() {}
}

export function createGateway({ token, provider, backendName = 'custom', knowledgeStore = new KnowledgeStore(), maxConcurrent = 2, timeoutMs = 80000, idleMs = 1800000 }) {
  if (typeof token !== 'string' || token.length < 32) throw new Error('CHAPPY_GATEWAY_TOKEN must contain at least 32 characters');
  const expected = Buffer.from(`Bearer ${token}`);
  const sessions = new Map(), closed = new Map(); let active = 0;
  async function dispose(key, s) {
    sessions.delete(key); closed.set(key, Date.now()); s.controller?.abort();
    try { await (await s.backend)?.close(); } catch { /* Failed sessions are still evicted. */ }
  }
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, s] of sessions) if (!s.busy && now - s.touched > idleMs) void dispose(key, s);
    for (const [key, date] of closed) if (now - date > idleMs) closed.delete(key);
  }, Math.min(idleMs, 60000)); sweep.unref();
  const server = http.createServer(async (req, res) => {
    try {
      const auth = Buffer.from(req.headers.authorization ?? '');
      if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) throw new HttpError(401, 'Unauthorized');
      // Only the server mod may call this API; browser-origin requests are not accepted.
      if (req.headers.origin) throw new HttpError(403, 'Browser requests are not accepted');
      if (req.method === 'GET' && req.url === '/health') return reply(res, 200, { ok: true, backend: backendName });
      if (req.method !== 'POST' || !['/v1/ask', '/v1/session/close', '/v1/progress'].includes(req.url)) throw new HttpError(404, 'Not found');
      if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'JSON required');
      const body = await readBody(req), key = identity(body);
      if (req.url === '/v1/progress') return reply(res, 200, { message: sessions.get(key)?.progress ?? '質問を受け付けているよ…' });
      if (req.url === '/v1/session/close') {
        closed.set(key, Date.now());
        const s = sessions.get(key); if (s) await dispose(key, s);
        return reply(res, 200, { ok: true });
      }
      const input = validate(body);
      let scene;
      try { scene = validateScene(body.scene); } catch { throw new HttpError(400, "Invalid scene"); }
      let photo;
      try { photo = validatePhoto(body.photo); } catch { throw new HttpError(400, "Invalid photo"); }
      let memory;
      try { memory = memoryContext(body.memory); } catch { throw new HttpError(400, "Invalid memory"); }
      let inventory;
      try { inventory = validateInventory(body.inventory); } catch { throw new HttpError(400, "Invalid inventory"); }
      if (closed.has(key)) throw new HttpError(409, 'Session closed');
      let s = sessions.get(key);
      if (s?.busy) throw new HttpError(409, 'Question already in progress');
      if (active >= maxConcurrent) throw new HttpError(429, 'Guide is busy');
      if (!s && sessions.size >= 32) throw new HttpError(429, 'Too many sessions');
      if (s?.turns >= 40) throw new HttpError(409, 'Session turn limit reached; log in again');
      if (!s) { s = { backend: null, touched: Date.now(), turns: 0 }; sessions.set(key, s); }
      s.busy = true; active++; s.controller = new AbortController(); s.progress = '質問を読んでいるよ…';
      const abort = () => { if (!res.writableEnded) s.controller.abort(); };
      res.once('close', abort);
      let timer;
      const deadline = new Promise((_, reject) => { timer = setTimeout(() => { reject(new HttpError(504, 'Timed out')); s.controller.abort(); }, timeoutMs); });
      try {
        const work = (async () => {
          s.backend ??= Promise.resolve().then(() => provider.create());
          const backend = await s.backend;
          s.controller.signal.throwIfAborted();
          const knowledge = await knowledgeStore.open(body.knowledgeId);
          s.controller.signal.throwIfAborted();
          return backend.ask(input, s.controller.signal, { knowledge, inventory, memory, photo, scene, onProgress: message => {
            if (sessions.get(key) === s && !s.controller.signal.aborted && typeof message === 'string') s.progress = message;
          } });
        })();
        const answer = await Promise.race([work, deadline]);
        if (sessions.get(key) !== s || s.controller.signal.aborted) throw new HttpError(409, 'Session closed');
        if (typeof answer !== 'string' || !answer.trim() || answer.length > 12000) throw new HttpError(502, 'Invalid answer');
        s.turns++; reply(res, 200, { answer, memory: memory.notes });
      } catch (err) {
        console.warn(JSON.stringify({ event: 'chappy_request_failed', status: err.status ?? 502 }));
        await dispose(key, s);
        throw err;
      } finally { clearTimeout(timer); res.off('close', abort); s.busy = false; s.touched = Date.now(); active--; }
    } catch (err) {
      reply(res, err.status ?? 502, { error: err.status ? err.message : 'Guide backend unavailable' });
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  return {
    server,
    async close() {
      clearInterval(sweep);
      const stopped = new Promise(resolve => server.close(resolve));
      server.closeAllConnections();
      await Promise.allSettled([...sessions].map(([key, s]) => dispose(key, s)));
      await provider.close(); await stopped;
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.CHAPPY_BACKEND ?? 'mock';
  if (!['mock', 'codex'].includes(mode)) throw new Error('CHAPPY_BACKEND must be mock or codex');
  const provider = mode === 'mock' ? new MockProvider() : await CodexProvider.start();
  const paths = process.env.CHAPPY_KNOWLEDGE_FILES_JSON ? JSON.parse(process.env.CHAPPY_KNOWLEDGE_FILES_JSON) : undefined;
  const gateway = createGateway({ token: process.env.CHAPPY_GATEWAY_TOKEN, provider, backendName: mode, knowledgeStore: new KnowledgeStore(paths) });
  const port = Number(process.env.CHAPPY_PORT ?? 18765);
  gateway.server.listen(port, '127.0.0.1', () => console.log(`Chappy gateway: http://127.0.0.1:${port} (${mode})`));
  let stopping = false;
  provider.rpc?.once('failure', () => {
    if (!stopping) { console.error('Chappy app-server disconnected; supervisor restart required.'); process.exit(1); }
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
    if (stopping) return; stopping = true; await gateway.close();
  });
}
