export const SCENE_TOOL = { type: 'function', name: 'minecraft_nearby_blocks',
  description: '質問者の送信時点の周辺ブロックと見ているブロック、状態、対応設備の蓄電量を確認する。写真撮影時とは異なる場合がある。',
  inputSchema: { type: 'object', properties: { blockId: { type: 'string' } }, additionalProperties: false } };
export function validateScene(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || !Array.isArray(value.blocks) || value.blocks.length > 128 || JSON.stringify(value).length > 80000) throw new Error('Invalid scene');
  return structuredClone(value);
}
export function readScene(scene, args) {
  if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(k => k !== 'blockId')
      || (args.blockId !== undefined && (typeof args.blockId !== 'string' || args.blockId.length > 256))) throw new Error('Invalid scene query');
  if (!scene) return { available: false };
  return { ...scene, blocks: scene.blocks.filter(b => !args.blockId || b.id === args.blockId) };
}
