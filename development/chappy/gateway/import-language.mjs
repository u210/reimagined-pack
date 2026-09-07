// Read only the official cached Minecraft Japanese language asset; no package installation/network download.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const assets = join(process.env.APPDATA, 'PrismLauncher/assets');
const index = JSON.parse(await readFile(join(assets, 'indexes/17.json'), 'utf8'));
const hash = index.objects['minecraft/lang/ja_jp.json']?.hash;
if (!/^[a-f0-9]{40}$/.test(hash ?? '')) throw new Error('Minecraft 1.21.1 Japanese language asset was not found');
const bytes = await readFile(join(assets, 'objects', hash.slice(0, 2), hash));
if (createHash('sha1').update(bytes).digest('hex') !== hash) throw new Error('Language asset hash mismatch');
const strings = JSON.parse(bytes.toString('utf8'));
const selected = Object.fromEntries(Object.entries(strings).filter(([key, value]) => /^(item|block)\./.test(key) && typeof value === 'string'));
const output = resolve(import.meta.dirname, '../runtime/knowledge');
await mkdir(output, { recursive: true });
await writeFile(join(output, 'ja_jp.json'), JSON.stringify(selected));
console.log(`Imported ${Object.keys(selected).length} Japanese item/block names from the verified Minecraft asset.`);
