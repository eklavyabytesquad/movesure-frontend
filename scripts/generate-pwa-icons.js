/**
 * Generates PNG icon files for the MoveSure PWA manifest.
 * Run once: node scripts/generate-pwa-icons.js
 *
 * Creates:
 *   public/icons/icon-192.png  (192×192)
 *   public/icons/icon-512.png  (512×512)
 *
 * No external dependencies — uses only Node.js built-ins (zlib, fs, path).
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC-32 table ──────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const crcInput  = Buffer.concat([typeBytes, data]);
  const crcBuf    = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Creates a minimal RGB PNG of the given size with a solid fill + centred letter "M".
 *
 * Because we have no font rendering here we draw the letter via pixel painting
 * using a simple bitmap font (7×9 grid).
 */
function buildPNG(size) {
  const W  = size;
  const H  = size;

  // Background: #1a56db  (blue)
  const BG  = [0x1a, 0x56, 0xdb];
  // Letter colour: white
  const FG  = [0xff, 0xff, 0xff];

  // Build raw RGB scanlines (filter byte 0 = None per row)
  const raw = Buffer.alloc(H * (1 + W * 3));

  // Fill background
  for (let y = 0; y < H; y++) {
    const row = y * (1 + W * 3);
    raw[row] = 0; // filter byte
    for (let x = 0; x < W; x++) {
      raw[row + 1 + x * 3]     = BG[0];
      raw[row + 1 + x * 3 + 1] = BG[1];
      raw[row + 1 + x * 3 + 2] = BG[2];
    }
  }

  // Rounded corner mask — darken pixels outside a circle
  const R = W / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - R + 0.5;
      const dy = y - R + 0.5;
      if (dx * dx + dy * dy > (R - 1) * (R - 1)) {
        const row = y * (1 + W * 3);
        raw[row + 1 + x * 3]     = 0xff;
        raw[row + 1 + x * 3 + 1] = 0xff;
        raw[row + 1 + x * 3 + 2] = 0xff;
      }
    }
  }

  // Draw letter "M" — bitmap 7 cols × 9 rows (scaled to ~40% of icon size)
  const LETTER_M = [
    [1,0,0,0,0,0,1],
    [1,1,0,0,0,1,1],
    [1,1,1,0,1,1,1],
    [1,0,1,1,1,0,1],
    [1,0,0,1,0,0,1],
    [1,0,0,0,0,0,1],
    [1,0,0,0,0,0,1],
    [1,0,0,0,0,0,1],
    [1,0,0,0,0,0,1],
  ];
  const COLS = 7, ROWS = 9;
  const cellW = Math.floor(W * 0.07);
  const cellH = Math.floor(H * 0.07);
  const offX  = Math.floor((W - COLS * cellW) / 2);
  const offY  = Math.floor((H - ROWS * cellH) / 2);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!LETTER_M[r][c]) continue;
      for (let dy = 0; dy < cellH; dy++) {
        for (let dx = 0; dx < cellW; dx++) {
          const px = offX + c * cellW + dx;
          const py = offY + r * cellH + dy;
          if (px < 0 || px >= W || py < 0 || py >= H) continue;
          const row = py * (1 + W * 3);
          raw[row + 1 + px * 3]     = FG[0];
          raw[row + 1 + px * 3 + 1] = FG[1];
          raw[row + 1 + px * 3 + 2] = FG[2];
        }
      }
    }
  }

  // Compress raw data
  const compressed = zlib.deflateSync(raw, { level: 9 });

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // colour type: RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const png  = buildPNG(size);
  const dest = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓ ${dest}  (${(png.length / 1024).toFixed(1)} KB)`);
}

console.log('\nPWA icons generated. Commit public/icons/ to your repository.\n');
