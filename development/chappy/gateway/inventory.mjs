export const INVENTORY_TOOL = {
  type: 'function', name: 'minecraft_player_inventory',
  description: '質問者本人の送信時点の持ち物を確認する。手持ち・装備・個数を調べたいときに使う。別プレイヤーは指定できない。',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
};

export function validateInventory(value) {
  if (value == null) return null;
  if (!Number.isInteger(value.selectedSlot) || value.selectedSlot < 0 || value.selectedSlot > 8
      || !Array.isArray(value.items) || value.items.length > 41) throw new Error('Invalid inventory');
  const seen = new Set();
  const items = value.items.map(item => {
    if (!item || !Number.isInteger(item.slot) || item.slot < 0 || item.slot > 40 || seen.has(item.slot)
        || typeof item.id !== 'string' || item.id.length > 256 || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(item.id)
        || typeof item.name !== 'string' || item.name.length > 512
        || !Number.isInteger(item.count) || item.count < 1 || item.count > 2147483647) throw new Error('Invalid inventory item');
    seen.add(item.slot);
    return { slot: item.slot, id: item.id, name: item.name, count: item.count };
  });
  return { available: true, capturedAt: 'question_submission', selectedSlot: value.selectedSlot,
    slotLayout: '0-8 hotbar, 9-35 backpack, 36 feet, 37 legs, 38 chest, 39 head, 40 offhand; selectedSlot is main hand',
    limits: 'Empty slots omitted. Container contents, item components and other players are unavailable.', items };
}

export function readInventory(inventory, args) {
  if (!args || Array.isArray(args) || typeof args !== 'object' || Object.keys(args).length) throw new Error('No arguments allowed');
  return inventory ?? { available: false, reason: '質問者の持ち物情報は未取得です。' };
}
