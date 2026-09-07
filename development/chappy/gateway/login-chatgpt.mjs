import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CodexProvider, authenticate } from './codex.mjs';

const loginFile = resolve(import.meta.dirname, '../runtime/browser-login.json');
const { rpc } = await CodexProvider.connect();
try {
  await authenticate(rpc, {
    interactive: true,
    onLogin: async ({ authUrl }) => {
      const url = new URL(authUrl);
      if (url.protocol !== 'https:' || !['auth.openai.com', 'chatgpt.com'].includes(url.hostname)) throw new Error('Unexpected authentication origin');
      await writeFile(loginFile, JSON.stringify({ authUrl }), { mode: 0o600 });
      console.log('ChatGPT login ready. Open the URL from runtime/browser-login.json in your browser.');
    },
  });
  console.log('ChatGPT login saved for Chappy. No API key is required.');
} finally {
  await unlink(loginFile).catch(() => {});
  await rpc.close();
}
