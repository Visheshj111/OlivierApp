/**
 * Generates PNG icons for Olivier app (tray + app icon)
 * Creates a dark rounded square with a white "O" ring — clean and recognizable.
 * No external dependencies — uses only Node.js built-in zlib.
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ── CRC-32 (needed by PNG format) ──
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function createPNG(w, h, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter byte: None
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = y * (1 + w * 4) + 1 + x * 4;
      raw[di] = pixels[si]; raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2]; raw[di + 3] = pixels[si + 3];
    }
  }
  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Smooth distance helpers ──
function sdf_roundedRect(x, y, cx, cy, halfW, halfH, r) {
  const dx = Math.max(Math.abs(x - cx) - (halfW - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (halfH - r), 0);
  return Math.sqrt(dx * dx + dy * dy) - r;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function generateIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const aa = Math.max(1, size / 128); // anti-alias width

  // Colors
  const bgR = 17, bgG = 24, bgB = 39;       // #111827
  const fgR = 255, fgG = 255, fgB = 255;     // white

  // Dimensions
  const rectHalf = size * 0.46;
  const cornerR = size * 0.20;
  const ringOuterR = size * 0.30;
  const ringInnerR = size * 0.18;

  // Small dot at bottom-right (like a notification indicator)
  const dotCx = cx + size * 0.22;
  const dotCy = cy - size * 0.22;
  const dotR = size * 0.09;
  const dotColR = 99, dotColG = 102, dotColB = 241; // #6366F1 indigo

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rounded rectangle SDF
      const rectDist = sdf_roundedRect(x, y, cx, cy, rectHalf, rectHalf, cornerR);
      const rectAlpha = Math.max(0, Math.min(1, 0.5 - rectDist / aa));

      if (rectAlpha <= 0) {
        px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 0;
        continue;
      }

      // Start with background color
      let r = bgR, g = bgG, b = bgB, a = rectAlpha;

      // "O" ring
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ringOuter = 0.5 - (dist - ringOuterR) / aa;
      const ringInner = 0.5 + (dist - ringInnerR) / aa;
      const ringAlpha = Math.max(0, Math.min(1, ringOuter)) * Math.max(0, Math.min(1, ringInner));

      if (ringAlpha > 0) {
        r = lerp(bgR, fgR, ringAlpha);
        g = lerp(bgG, fgG, ringAlpha);
        b = lerp(bgB, fgB, ringAlpha);
      }

      // Small accent dot (top-right)
      const ddx = x - dotCx, ddy = y - dotCy;
      const dotDist = Math.sqrt(ddx * ddx + ddy * ddy);
      const dotAlpha = Math.max(0, Math.min(1, 0.5 - (dotDist - dotR) / aa));
      if (dotAlpha > 0) {
        r = lerp(r, dotColR, dotAlpha);
        g = lerp(g, dotColG, dotAlpha);
        b = lerp(b, dotColB, dotAlpha);
      }

      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
      px[i + 3] = Math.round(a * 255);
    }
  }

  return createPNG(size, size, px);
}

// ── Create ICO file (multi-resolution) ──
function createICO(pngBuffers) {
  // ICO format: header + directory entries + PNG data
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = count * dirEntrySize;
  let offset = headerSize + dirSize;

  // Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(count, 4);

  const entries = [];
  const sizes = [16, 32, 48, 256];

  for (let i = 0; i < count; i++) {
    const entry = Buffer.alloc(dirEntrySize);
    const sz = sizes[i] === 256 ? 0 : sizes[i]; // 0 = 256
    entry[0] = sz; // width
    entry[1] = sz; // height
    entry[2] = 0;  // color palette
    entry[3] = 0;  // reserved
    entry.writeUInt16LE(1, 4);  // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8); // size of PNG data
    entry.writeUInt32LE(offset, 12); // offset
    offset += pngBuffers[i].length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

// ── Generate all icons ──
const root = path.join(__dirname, "..");

// build/ directory for electron-builder
const buildDir = path.join(root, "build");
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

// electron/ directory for runtime tray icon
const electronDir = path.join(root, "electron");

// Generate PNGs at multiple sizes
const png16 = generateIcon(16);
const png32 = generateIcon(32);
const png48 = generateIcon(48);
const png256 = generateIcon(256);

// Save 256x256 PNG for electron-builder
fs.writeFileSync(path.join(buildDir, "icon.png"), png256);
console.log("✓ build/icon.png (256×256)");

// Save ICO (multi-res) for Windows
const ico = createICO([png16, png32, png48, png256]);
fs.writeFileSync(path.join(buildDir, "icon.ico"), ico);
console.log("✓ build/icon.ico (16+32+48+256)");

// Save tray icon (32×32 PNG) in electron/
fs.writeFileSync(path.join(electronDir, "tray-icon.png"), png32);
console.log("✓ electron/tray-icon.png (32×32)");

// Save app icon (48×48) in electron/ for window use
fs.writeFileSync(path.join(electronDir, "icon.png"), png48);
console.log("✓ electron/icon.png (48×48)");

console.log("\nDone! Icons generated successfully.");
