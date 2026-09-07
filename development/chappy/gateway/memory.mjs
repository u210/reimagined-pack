export const MEMORY_TOOL = { type: 'function', name: 'minecraft_remember',
  description: '質問者の拠点・目標・呼び方など、今後の相談に役立つ短いメモを保存する。会話全体や秘密情報、推測は保存しない。',
  inputSchema: { type: 'object', properties: { note: { type: 'string', maxLength: 300 } }, required: ['note'], additionalProperties: false } };
export function memoryContext(value = []) {
  if (!Array.isArray(value) || value.length > 20 || value.some(s => typeof s !== 'string' || !s.trim() || s.length > 300 || /[\x00-\x1f]/.test(s))) throw new Error('Invalid memory');
  return { notes: [...value], remember(args) {
    if (!args || Object.keys(args).some(k => k !== 'note') || typeof args.note !== 'string'
        || !args.note.trim() || args.note.length > 300 || /[\x00-\x1f]/.test(args.note)) throw new Error('Invalid note');
    const note = args.note.trim();
    if (!this.notes.includes(note)) { if (this.notes.length >= 20) return { saved: false, reason: '記憶がいっぱい。/chappy forget で全削除できる。' }; this.notes.push(note); }
    return { saved: true, note };
  } };
}
