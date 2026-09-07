import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryContext } from './memory.mjs';
import { validatePhoto } from './photo.mjs';
import { validateScene, readScene } from './scene.mjs';

test('memories are copied per request, bounded, and deduplicated', () => {
  const saved = ['拠点は白樺港']; const a = memoryContext(saved), b = memoryContext(saved);
  a.remember({ note: '西側に倉庫' }); assert.equal(saved.length, 1); assert.equal(b.notes.length, 1);
  a.remember({ note: '西側に倉庫' }); assert.equal(a.notes.length, 2);
  assert.throws(() => a.remember({ note: 'x', playerId: 'other' }));
  assert.throws(() => memoryContext(['x'.repeat(301)]));
  const full = memoryContext(Array.from({length:20}, (_,i) => String(i)));
  assert.equal(full.remember({note:'more'}).saved, false);
});
test('photos reject URLs, large dimensions and invalid image headers', () => {
  assert.equal(validatePhoto(null), null);
  for (const value of ['file:///private.png', 'https://example.com/photo.png', 'data:image/png;base64,AAAA']) assert.throws(() => validatePhoto(value));
  const bytes = Buffer.alloc(33); Buffer.from('89504e470d0a1a0a','hex').copy(bytes); bytes.write('IHDR',12); bytes.writeUInt32BE(513,16); bytes.writeUInt32BE(1,20);
  assert.throws(() => validatePhoto('data:image/png;base64,' + bytes.toString('base64')));
});
test('scene queries cannot choose another player or position and do not mutate snapshots', () => {
  const raw = { blocks: [{id:'minecraft:furnace',properties:{lit:'true'}}], lookingAt: {id:'minecraft:furnace'} };
  const scene = validateScene(raw); raw.blocks.length = 0;
  assert.equal(readScene(scene, {blockId:'minecraft:furnace'}).blocks.length, 1);
  assert.equal(readScene(scene, {blockId:'minecraft:stone'}).blocks.length, 0);
  assert.throws(() => readScene(scene, {x:100}));
  assert.throws(() => validateScene({blocks:Array(129).fill({})}));
});
