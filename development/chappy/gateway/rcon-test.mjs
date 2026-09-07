// Local isolated test-server console only. This intentionally cannot address production ports/hosts.
import net from 'node:net';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function testConsole(command) {
  if (!['reload', 'stop'].includes(command)) throw new Error('Only reload/stop are supported by the test console');
  const text = await readFile(resolve(import.meta.dirname, '../runtime/knowledge-test-server/server.properties'), 'utf8');
  const password = text.match(/^rcon.password=(.+)$/m)?.[1]?.trim();
  if (!password) throw new Error('Test console password missing');
  const socket = net.createConnection({ host: '127.0.0.1', port: 25586 });
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('Test console timeout')); }, 10000);
    let bytes = Buffer.alloc(0), authenticated = false;
    const packet = (id, type, body) => {
      const data = Buffer.from(body); const out = Buffer.alloc(data.length + 14);
      out.writeInt32LE(data.length + 10, 0); out.writeInt32LE(id, 4); out.writeInt32LE(type, 8); data.copy(out, 12); socket.write(out);
    };
    socket.on('connect', () => packet(1, 3, password));
    socket.on('error', e => { clearTimeout(timer); reject(e); });
    socket.on('data', data => {
      bytes = Buffer.concat([bytes, data]);
      while (bytes.length >= 4 && bytes.length >= bytes.readInt32LE(0) + 4) {
        const length = bytes.readInt32LE(0), frame = bytes.subarray(4, 4 + length); bytes = bytes.subarray(4 + length);
        const id = frame.readInt32LE(0), type = frame.readInt32LE(4);
        if (id === -1) { clearTimeout(timer); socket.destroy(); return reject(new Error('Test console authentication failed')); }
        if (!authenticated && id === 1 && type === 2) { authenticated = true; packet(2, 2, command); }
        else if (id === 2) { clearTimeout(timer); socket.end(); resolve(frame.subarray(8, -2).toString('utf8')); }
      }
    });
  });
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2]) console.log(await testConsole(process.argv[2]));
}
