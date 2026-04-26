export async function isRealPNG(buffer: Buffer): Promise<boolean> {
  const bytes = new Uint8Array(buffer.subarray(0, 8));
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  return pngSignature.every((byte, i) => bytes[i] === byte);
}
