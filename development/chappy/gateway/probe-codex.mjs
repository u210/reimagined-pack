// Read-only protocol smoke test: no account login and no inference request.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Rpc } from './codex.mjs';

const home = resolve(import.meta.dirname, '../runtime/protocol-probe');
await mkdir(home, { recursive: true });
const env = { ...process.env, CODEX_HOME: home };
delete env.OPENAI_API_KEY; delete env.CHAPPY_GATEWAY_TOKEN;
const child = spawn(process.env.CHAPPY_CODEX_BIN ?? 'codex', ['app-server', '--stdio'], {
  env, cwd: home, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
});
child.stderr.resume();
const rpc = new Rpc(child);
try {
  const init = await rpc.request('initialize', { clientInfo: { name: 'chappy_probe', version: '0.1.0' }, capabilities: { experimentalApi: true } });
  rpc.send({ method: 'initialized', params: {} });
  const account = await rpc.request('account/read', { refreshToken: false });
  if (account.account) throw new Error('Probe unexpectedly has an account');
  console.log(JSON.stringify({ initialized: true, userAgent: init.userAgent, isolatedAccount: account.account === null }));
} finally { await rpc.close(); }
