import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const idPattern = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
const unavailable = { available: false, reason: 'この会話元のサーバー情報はまだ取得できていない。一般知識と区別して回答する。' };
const integer = (n, fallback, max) => n === undefined ? fallback : Number.isInteger(n) && n >= 0 && n <= max ? n : (() => { throw new Error('Invalid pagination'); })();
const schema = properties => ({ type: 'object', properties, additionalProperties: false });
const string = description => ({ type: 'string', description });
export const KNOWLEDGE_TOOLS = [
  { type: 'function', name: 'minecraft_search_documents', description: '導入版と一致するMod説明書・日本語tooltip・数値設定を検索する。使い方や設定を調べるときに使う。',
    inputSchema: { ...schema({ query: string('Mod名、アイテム名、キーワード。日本語または英語。'), modId: string('任意のMod ID'), offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 20, description: '1〜20件。省略時6件。20超は20件に制限。続きはnextOffsetを使う。' } }), required: ['query'] } },
  { type: 'function', name: 'minecraft_document_detail', description: '検索した説明書の本文と導入版・出典を確認する。',
    inputSchema: { ...schema({ documentId: string('検索結果のdocument id') }), required: ['documentId'] } },
  { type: 'function', name: 'minecraft_search_items', description: '現在のサーバーに登録されたアイテムを日本語名・英語名・IDで検索する。曖昧なら候補を確認する。',
    inputSchema: { ...schema({ query: string('名前またはID。部分一致。'), offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 20, description: '1〜20件。省略時6件。20超は20件に制限。続きはnextOffsetを使う。' } }), required: ['query'] } },
  { type: 'function', name: 'minecraft_item_recipes', description: 'サーバーに読み込まれたレシピから、そのアイテムの作り方(producing)または材料としての用途(using)を検索する。',
    inputSchema: { ...schema({ itemId: string('namespace:item'), direction: { type: 'string', enum: ['producing', 'using'] }, offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 20, description: '1〜20件。省略時6件。20超は20件に制限。続きはnextOffsetを使う。' } }), required: ['itemId', 'direction'] } },
  { type: 'function', name: 'minecraft_recipe_detail', description: 'レシピIDから実際の材料・個数・配置・処理条件を取得する。答える前に使用するレシピの詳細を確認する。',
    inputSchema: { ...schema({ recipeId: string('検索結果にあるレシピID') }), required: ['recipeId'] } },
  { type: 'function', name: 'minecraft_loaded_mods', description: 'このサーバーで読み込まれたModとバージョンを確認する。Modの使い方の資料自体ではない。',
    inputSchema: schema({ query: string('任意のMod名・ID'), offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 20, description: '1〜20件。省略時6件。20超は20件に制限。続きはnextOffsetを使う。' } }) },
];
export const PROGRESS = {
  minecraft_search_documents: '説明書と設定を探しているよ…', minecraft_document_detail: '使い方の資料を読んでいるよ…',
  minecraft_search_items: 'アイテムを探しているよ…', minecraft_item_recipes: 'この世界のレシピを調べているよ…',
  minecraft_recipe_detail: '材料と作り方を確認しているよ…', minecraft_loaded_mods: '入っているModを確認しているよ…',
};

export class Knowledge {
  constructor(snapshot, translations = {}) {
    if (snapshot.schemaVersion !== 1 || snapshot.source !== 'loaded_server_registries' || typeof snapshot.snapshotId !== 'string'
      || !Array.isArray(snapshot.items) || !Array.isArray(snapshot.recipes) || !Array.isArray(snapshot.mods)) throw new Error('Invalid registry snapshot');
    this.snapshot = snapshot;
    translations = { ...translations, ...snapshot.translations };
    this.documents = (snapshot.documents ?? []).filter(d => snapshot.mods.some(m => m.id === d.modId && m.version === d.version));
    this.items = new Map(snapshot.items.map(i => [i.id, { ...i, japaneseName: translations[i.translationKey] ?? null }]));
    this.recipes = new Map(snapshot.recipes.map(r => [r.id, r]));
    this.producing = new Map(); this.using = new Map();
    const push = (map, key, recipe) => { if (!map.has(key)) map.set(key, []); map.get(key).push(recipe); };
    for (const r of snapshot.recipes) {
      if (r.result?.id) push(this.producing, r.result.id, r);
      const ids = new Set((r.ingredients ?? []).flatMap(i => i.candidates ?? []));
      for (const id of ids) push(this.using, id, r);
    }
    this.coverage = {
      unreadableRecipes: snapshot.unreadableRecipes?.length ?? 0,
      recipesWithUnregisteredType: snapshot.recipes.filter(r => r.typeUnavailable).length,
      recipesWithoutFixedOutput: snapshot.recipes.filter(r => !r.result).length,
      recipesWithTruncatedInputs: snapshot.recipes.filter(r => r.ingredients?.some(i => i.truncated)).length,
      limits: 'RecipeManagerに登録されたレシピのみ。金床・醸造・採掘・取引・ドロップや一部の独自加工、内部状態は対象外。候補材料の一覧はカスタム条件の完全な判定ではない。',
    };
  }
  summary() {
    return { available: true, snapshotId: this.snapshot.snapshotId, capturedAt: this.snapshot.capturedAt,
      minecraftVersion: this.snapshot.minecraftVersion, source: this.snapshot.source,
      documents: this.documents.length, documentCoverage: this.snapshot.documentCoverage, items: this.items.size, recipes: this.recipes.size, coverage: this.coverage };
  }
  item(id) { return this.items.get(id) ?? { id, name: id }; }
  execute(name, args) {
    if (!args || Array.isArray(args) || typeof args !== 'object') throw new Error('Invalid tool arguments');
    const spec = KNOWLEDGE_TOOLS.find(t => t.name === name);
    if (!spec || Object.keys(args).some(k => !(k in spec.inputSchema.properties))) throw new Error('Unknown tool or argument');
    const offset = integer(args.offset, 0, 100000);
    if (args.limit !== undefined && (!Number.isSafeInteger(args.limit) || args.limit < 1)) throw new Error('limit must be a positive integer; use 1 to 20');
    // Oversized page requests are safe to clamp; never make the model retry the whole lookup.
    const limit = Math.min(args.limit ?? 6, 20);
    if (limit < 1) throw new Error('Invalid limit');
    const page = rows => ({ matches: rows.slice(offset, offset + limit), total: rows.length,
      nextOffset: offset + limit < rows.length ? offset + limit : null, snapshotId: this.snapshot.snapshotId });
    const query = () => {
      if (typeof args.query !== 'string' || !args.query.trim() || args.query.length > 120) throw new Error('Invalid query');
      return args.query.trim().toLowerCase();
    };
    const checkId = id => { if (typeof id !== 'string' || id.length > 256 || !idPattern.test(id)) throw new Error('Invalid registry ID'); };
    switch (name) {
      case 'minecraft_search_documents': {
        const q = query(), terms = q.split(/\s+/);
        if (args.modId !== undefined && (typeof args.modId !== 'string' || args.modId.length > 80)) throw new Error('Invalid mod ID');
        const matches = this.documents.filter(d => (!args.modId || d.modId === args.modId) && terms.every(t => (d.modId + ' ' + d.text).toLowerCase().includes(t)));
        return { ...page(matches.map(d => ({ id: d.id, modId: d.modId, version: d.version, source: d.source, kind: d.kind, excerpt: d.text.slice(Math.max(0, d.text.toLowerCase().indexOf(terms[0]) - 80), Math.max(0, d.text.toLowerCase().indexOf(terms[0]) - 80) + 350) }))), coverage: this.snapshot.documentCoverage };
      }
      case 'minecraft_document_detail': {
        if (typeof args.documentId !== 'string' || args.documentId.length > 512) throw new Error('Invalid document ID');
        return this.documents.find(d => d.id === args.documentId) ?? { found: false };
      }
      case 'minecraft_search_items': {
        const q = query();
        const results = [...this.items.values()].filter(i => [i.id, i.name, i.japaneseName].some(v => v?.toLowerCase().includes(q)));
        results.sort((a, b) => Number(b.id === q || b.japaneseName === q || b.name?.toLowerCase() === q) - Number(a.id === q || a.japaneseName === q || a.name?.toLowerCase() === q) || a.id.localeCompare(b.id));
        return page(results);
      }
      case 'minecraft_item_recipes': {
        checkId(args.itemId);
        if (!['producing', 'using'].includes(args.direction)) throw new Error('Invalid recipe direction');
        if (!this.items.has(args.itemId)) return { found: false, coverage: this.coverage };
        const recipes = (args.direction === 'producing' ? this.producing : this.using).get(args.itemId) ?? [];
        return { item: this.item(args.itemId), direction: args.direction, ...page(recipes.map(r => ({ id: r.id, type: r.type,
          result: r.result ? { ...r.result, name: this.item(r.result.id).japaneseName ?? this.item(r.result.id).name } : null, special: r.special, typeUnavailable: r.typeUnavailable }))),
          coverage: this.coverage, warning: recipes.length ? undefined : '該当する登録レシピを確認できない。入手不可能・用途なしという意味ではない。' };
      }
      case 'minecraft_recipe_detail': {
        checkId(args.recipeId); const r = this.recipes.get(args.recipeId);
        if (!r) return { found: false };
        const result = { ...r, ingredients: (r.ingredients ?? []).map(i => ({ ...i, candidates: i.candidates.slice(0, 16),
          shownCandidatesTruncated: i.candidates.length > 16, names: i.candidates.slice(0, 16).map(id => ({ id, name: this.item(id).japaneseName ?? this.item(id).name })) })),
          source: { snapshotId: this.snapshot.snapshotId, recipeId: r.id, capturedAt: this.snapshot.capturedAt } };
        if (JSON.stringify(result).length > 22000) return { id: r.id, type: r.type, result: r.result, detailUnavailable: true,
          warning: 'レシピ詳細が大きすぎるため表示できない。材料・配置・条件を推測しない。', source: result.source };
        return result;
      }
      case 'minecraft_loaded_mods': {
        const q = args.query === undefined ? '' : query();
        return page(this.snapshot.mods.filter(m => `${m.id} ${m.name}`.toLowerCase().includes(q)));
      }
      default: throw new Error('Unknown tool');
    }
  }
}

export class KnowledgeStore {
  constructor(paths = [resolve(import.meta.dirname, '../runtime/server/chappy-knowledge.json')], languageFile = resolve(import.meta.dirname, '../runtime/knowledge/ja_jp.json')) {
    if (!Array.isArray(paths) || paths.length > 4 || paths.some(p => typeof p !== 'string')) throw new Error('Invalid knowledge file configuration');
    this.paths = paths.map(p => resolve(p)); this.languageFile = languageFile; this.cache = new Map();
  }
  async open(snapshotId) {
    if (!snapshotId) return null; // Never substitute another world's snapshot or a previous boot.
    let translations = {};
    try { translations = JSON.parse(await readFile(this.languageFile, 'utf8')); } catch { /* English/ID search still works. */ }
    for (const path of this.paths) {
      try {
        const st = await stat(path);
        if (st.size > 64 * 1024 * 1024) continue;
        let cached = this.cache.get(path);
        if (!cached || cached.mtime !== st.mtimeMs || cached.size !== st.size) {
          const snapshot = JSON.parse(await readFile(path, 'utf8'));
          cached = { mtime: st.mtimeMs, size: st.size, knowledge: new Knowledge(snapshot, translations) }; this.cache.set(path, cached);
        }
        if (cached.knowledge.snapshot.snapshotId === snapshotId) return cached.knowledge;
      } catch { /* Missing/invalid data yields an explicit unavailable context, never a fallback. */ }
    }
    return null;
  }
}
export function knowledgeSummary(knowledge) { return knowledge?.summary() ?? unavailable; }
