import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Knowledge, KnowledgeStore } from './knowledge.mjs';

const snapshot = (id = 'snapshot-a') => ({ schemaVersion: 1, source: 'loaded_server_registries', snapshotId: id,
  capturedAt: '2026-09-07T00:00:00Z', minecraftVersion: '1.21.1', mods: [{ id: 'minecraft', name: 'Minecraft', version: '1.21.1' }],
  items: [{ id: 'minecraft:crafting_table', name: 'Crafting Table', translationKey: 'block.minecraft.crafting_table', tags: [] },
    { id: 'minecraft:cobblestone', name: 'Cobblestone', translationKey: 'block.minecraft.cobblestone', tags: ['minecraft:stone_crafting_materials'] }],
  recipes: [{ id: 'minecraft:crafting_table', type: 'minecraft:crafting', special: false,
    result: { id: 'minecraft:crafting_table', count: 1 }, ingredients: [{ candidates: ['minecraft:cobblestone'], candidateCount: 1, truncated: false }],
    data: { type: 'minecraft:crafting_shaped', pattern: ['##', '##'], key: { '#': { item: 'minecraft:cobblestone' } }, result: { id: 'minecraft:crafting_table', count: 1 } } }],
  unreadableRecipes: ['example:unsupported'] });
test('Japanese names resolve to exact registry IDs and the loaded recipe overrides general knowledge', () => {
  const k = new Knowledge(snapshot(), { 'block.minecraft.crafting_table': '作業台' });
  assert.equal(k.execute('minecraft_search_items', { query: '作業台' }).matches[0].id, 'minecraft:crafting_table');
  assert.equal(k.execute('minecraft_item_recipes', { itemId: 'minecraft:cobblestone', direction: 'using' }).total, 1);
  const detail = k.execute('minecraft_recipe_detail', { recipeId: 'minecraft:crafting_table' });
  assert.equal(detail.data.key['#'].item, 'minecraft:cobblestone');
  assert.deepEqual(detail.data.pattern, ['##', '##']);
});
test('missing recipes and incomplete coverage do not imply unobtainable items', () => {
  const k = new Knowledge(snapshot());
  const result = k.execute('minecraft_item_recipes', { itemId: 'minecraft:cobblestone', direction: 'producing' });
  assert.equal(result.total, 0); assert.ok(result.warning); assert.equal(result.coverage.unreadableRecipes, 1);
  assert.throws(() => k.execute('minecraft_recipe_detail', { recipeId: '../../auth.json' }));
  assert.throws(() => k.execute('shell', { command: 'whoami' }));
  assert.throws(() => k.execute('minecraft_search_items', { query: 'stone', path: 'secret' }));
});
test('snapshot identity prevents mixing worlds and reload replaces removed recipes', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'chappy-knowledge-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'snapshot.json'); await writeFile(path, JSON.stringify(snapshot()));
  const store = new KnowledgeStore([path], join(dir, 'missing-language.json'));
  assert.equal(await store.open('another-world'), null); assert.equal(await store.open(null), null);
  const before = await store.open('snapshot-a'); assert.equal(before.recipes.size, 1);
  const updated = snapshot('snapshot-b'); updated.recipes = []; await writeFile(path, JSON.stringify(updated));
  assert.equal(await store.open('snapshot-a'), null);
  assert.equal((await store.open('snapshot-b')).recipes.size, 0);
  assert.equal(before.recipes.size, 1); // Already-running turns keep their original immutable view.
});

test('documents only use matching installed versions and preserve provenance', () => {
  const s = snapshot(); s.documents = [
    { id:'guide',modId:'minecraft',version:'1.21.1',source:'manual.json',kind:'bundled_guide',text:'作業台の説明書です' },
    { id:'old',modId:'minecraft',version:'1.20.1',text:'古い作業台' },
    { id:'absent',modId:'absent',version:'1',text:'作業台' }
  ];
  const k = new Knowledge(s);
  assert.equal(k.execute('minecraft_search_documents',{query:'作業台'}).total,1);
  assert.equal(k.execute('minecraft_document_detail',{documentId:'guide'}).source,'manual.json');
  assert.equal(k.execute('minecraft_document_detail',{documentId:'old'}).found,false);
});

test('oversized document pages are clamped and remaining matches are accessible', () => {
  const s = snapshot();
  s.documents = Array.from({ length: 25 }, (_, i) => ({ id: `doc-${i}`, modId: 'minecraft', version: '1.21.1', text: 'Globe' }));
  const k = new Knowledge(s);
  const first = k.execute('minecraft_search_documents', { query: 'Globe', limit: 50 });
  assert.equal(first.matches.length, 20); assert.equal(first.nextOffset, 20);
  const next = k.execute('minecraft_search_documents', { query: 'Globe', limit: 50, offset: first.nextOffset });
  assert.equal(next.matches.length, 5); assert.equal(next.nextOffset, null);
  for (const limit of [0, -1, 1.5, '50', null]) assert.throws(() => k.execute('minecraft_search_documents', { query: 'Globe', limit }));
});
