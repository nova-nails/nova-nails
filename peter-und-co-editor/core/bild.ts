// Bild-Prüfung auf dem Server: nur JPEG/WebP, Grösse, Masse aus dem Dateikopf (ohne Bibliothek).

export interface BildInfo { typ: 'jpg' | 'webp'; breite: number; hoehe: number }

export function bildInfo(b: Buffer): BildInfo | null {
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const art = b.toString('ascii', 12, 16);
    if (art === 'VP8 ' && b.length > 30) return { typ: 'webp', breite: b.readUInt16LE(26) & 0x3fff, hoehe: b.readUInt16LE(28) & 0x3fff };
    if (art === 'VP8L' && b.length > 25) {
      const bits = b.readUInt32LE(21);
      return { typ: 'webp', breite: (bits & 0x3fff) + 1, hoehe: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (art === 'VP8X' && b.length > 30) return { typ: 'webp', breite: b.readUIntLE(24, 3) + 1, hoehe: b.readUIntLE(27, 3) + 1 };
    return null;
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      // SOF0–SOF15 ohne DHT (C4), JPG (C8), DAC (CC)
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { typ: 'jpg', hoehe: b.readUInt16BE(i + 5), breite: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
  return null;
}
