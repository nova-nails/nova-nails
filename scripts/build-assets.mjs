// Erzeugt Logo-SVG (Entwurf), Favicons, OG-Bild und Porträt aus den Originalen in brand/.
// Originale werden nie überschrieben. Aufruf: npm run assets
import sharp from 'sharp';
import potrace from 'potrace';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';

const trace = promisify(potrace.trace);
const LOGO = 'brand/logo-original.png';
const UEBER = 'brand/ueber-mich-original.jpeg';
const BLUSH = '#F3CFCE';
const AKZENT = '#EC698F'; // Logo überall Akzent (Runde 2, 2026-10-25)
const AKZENT_RGB = [0xec, 0x69, 0x8f];

// 1) Herz-Linie freistellen: Linie (Grünkanal tief) schwarz, Rest weiss
const HERZ = { left: 470, top: 255, width: 1080, height: 990 };
const lineMask = await sharp(LOGO)
  .extract(HERZ)
  .extractChannel('green')
  .threshold(160)
  .png()
  .toBuffer();
const svgRaw = await trace(lineMask, { threshold: 128, turdSize: 20, optTolerance: 0.4 });
const d = [...svgRaw.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
const vb = `0 0 ${HERZ.width} ${HERZ.height}`;

const herzSvg = (extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="currentColor"${extra}><path fill-rule="evenodd" d="${d}"/></svg>\n`;

await writeFile('src/assets/brand/herz.svg', herzSvg());
await writeFile('src/assets/brand/herz-path.json', JSON.stringify({ viewBox: vb, d }));

// Komplettes Logo (Entwurf): Linie als Pfad, Text als echte Schrift (Comfortaa)
await writeFile(
  'brand/logo-entwurf.svg',
  `<!-- ENTWURF: aus Logo.png per potrace nachgezeichnet. [TODO: Inhaberin um SVG oder transparentes PNG aus Canva bitten, dann ersetzen] -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1500" color="${AKZENT}">
  <g fill="currentColor"><path fill-rule="evenodd" d="${d}"/></g>
  <text x="540" y="1255" text-anchor="middle" font-family="Comfortaa, sans-serif" font-size="210" fill="${AKZENT}">Nova Nails</text>
  <text x="540" y="1420" text-anchor="middle" font-family="Comfortaa, sans-serif" font-size="72" fill="${AKZENT}">by Julia Tellenbach</text>
</svg>
`,
);

// 2) Favicon: Herz-Linie verdickt (Stroke), Akzent auf Blush
const fav = (size, pad) => {
  const s = HERZ.width + pad * 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-pad} ${-pad - (HERZ.width - HERZ.height) / 2} ${s} ${s}">
<rect x="${-pad}" y="${-pad - (HERZ.width - HERZ.height) / 2}" width="${s}" height="${s}" rx="${s * 0.22}" fill="${BLUSH}"/>
<path fill-rule="evenodd" fill="${AKZENT}" stroke="${AKZENT}" stroke-width="${size < 64 ? 34 : 14}" stroke-linejoin="round" d="${d}"/></svg>`,
  );
};
await writeFile('public/favicon.svg', fav(64, 90).toString().replace(/width="64" height="64" /, ''));
await sharp(fav(180, 110)).png().toFile('public/apple-touch-icon.png');
await sharp(fav(512, 110)).png().toFile('public/icon-512.png');
// favicon.ico = ICO-Container mit eingebettetem 32px-PNG
const png32 = await sharp(fav(32, 70)).png().toBuffer();
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png32.length, 14); ico.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([ico, png32]));

// 3) OG-Bild 1200×630: Originallogo (gleicher Blush-Hintergrund) mittig, Linie und Schrift einheitlich Akzent.
// Deckkraft je Pixel aus dem Grünkanal (Blush G=207, Pink G≈100), Kantenglättung bleibt erhalten.
const { data: og, info: ogInfo } = await sharp(LOGO)
  .extract({ left: 400, top: 230, width: 1200, height: 1470 })
  .resize({ height: 560 })
  .removeAlpha()
  .raw({ depth: 'uchar' })
  .toBuffer({ resolveWithObject: true });
const blush = [0xf3, 0xcf, 0xce];
for (let i = 0; i < og.length; i += 3) {
  const a = Math.min(1, Math.max(0, (blush[1] - og[i + 1]) / (blush[1] - 100)));
  for (let c = 0; c < 3; c++) og[i + c] = Math.round(blush[c] + (AKZENT_RGB[c] - blush[c]) * a);
}
const logoCrop = await sharp(og, { raw: { width: ogInfo.width, height: ogInfo.height, channels: 3 } }).png().toBuffer();
const { width: lw } = await sharp(logoCrop).metadata();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: BLUSH } })
  .composite([{ input: logoCrop, left: Math.round((1200 - lw) / 2), top: 35 }])
  .png()
  .toFile('public/og.png');

// 4) Porträt: Sticker (weisser Rand) freistellen, Text der Grafik entfernen
const P = { left: 590, top: 545, width: 490, height: 535 };
const { data, info } = await sharp(UEBER).extract(P).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const white = (i) => data[i * 3] > 228 && data[i * 3 + 1] > 228 && data[i * 3 + 2] > 228;
const outside = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const i = stack.pop();
  if (outside[i] || white(i)) continue;
  outside[i] = 1;
  const x = i % W, y = (i / W) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - W);
  if (y < H - 1) stack.push(i + W);
}
const alpha = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) alpha[i] = outside[i] ? 0 : 255;
const alphaSoft = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
  .blur(0.6)
  .extractChannel(0)
  .raw()
  .toBuffer();
const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  rgba[i * 4] = data[i * 3];
  rgba[i * 4 + 1] = data[i * 3 + 1];
  rgba[i * 4 + 2] = data[i * 3 + 2];
  rgba[i * 4 + 3] = alphaSoft[i];
}
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .trim()
  .toFile('src/assets/julia/julia-tellenbach.png');

console.log('Assets erstellt.');
