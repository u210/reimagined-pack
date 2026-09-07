export function validatePhoto(value) {
  if (value == null) return null;
  if (typeof value !== 'string' || value.length > 1500000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Invalid photo');
  const bytes = Buffer.from(value.slice(22), 'base64');
  if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width > 512 || height > 512) throw new Error('Invalid dimensions');
  return value;
}
