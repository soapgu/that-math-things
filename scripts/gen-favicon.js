import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

const BG = [0x16, 0x77, 0xff, 0xff];
const FG = [0xff, 0xff, 0xff, 0xff];

function genPixels(W, H) {
  const raw = Buffer.alloc(4 * W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inside = Math.abs(x - (W - 1) / 2) + Math.abs(y - (H - 1) / 2) <= W * 0.35;
      const px = inside ? FG : BG;
      const off = (y * W + x) * 4;
      raw[off] = px[0];
      raw[off + 1] = px[1];
      raw[off + 2] = px[2];
      raw[off + 3] = px[3];
    }
  }
  return raw;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function genPng(W, H, pixels) {
  const raw = Buffer.alloc((1 + W * 4) * H);
  for (let y = 0; y < H; y++) {
    const rowOff = y * (1 + W * 4);
    raw[rowOff] = 0;
    for (let x = 0; x < W; x++) {
      const off = (y * W + x) * 4;
      const pxOff = rowOff + 1 + x * 4;
      raw[pxOff] = pixels[off];
      raw[pxOff + 1] = pixels[off + 1];
      raw[pxOff + 2] = pixels[off + 2];
      raw[pxOff + 3] = pixels[off + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}

function genIco(W, H, pixels) {
  const rowSize = W * 4;
  const xorSize = rowSize * H;
  const andRowBytes = Math.ceil(W / 8);
  const andRowPad = (4 - andRowBytes % 4) % 4;
  const andSize = (andRowBytes + andRowPad) * H;
  const dataSize = 40 + xorSize + andSize;
  const imgOffset = 6 + 16;

  const bmp = Buffer.alloc(dataSize);
  bmp.writeUInt32LE(40, 0);
  bmp.writeUInt32LE(W, 4);
  bmp.writeUInt32LE(H * 2, 8);
  bmp.writeUInt16LE(1, 12);
  bmp.writeUInt16LE(32, 14);
  bmp.writeUInt32LE(0, 16);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const srcOff = ((H - 1 - y) * W + x) * 4;
      const dstOff = 40 + y * rowSize + x * 4;
      bmp[dstOff] = pixels[srcOff + 2];
      bmp[dstOff + 1] = pixels[srcOff + 1];
      bmp[dstOff + 2] = pixels[srcOff];
      bmp[dstOff + 3] = pixels[srcOff + 3];

      const andOff = 40 + xorSize + y * (andRowBytes + andRowPad) + Math.floor(x / 8);
      if (pixels[srcOff + 3] < 128) bmp[andOff] |= 1 << (7 - x % 8);
    }
  }

  const entry = Buffer.alloc(16);
  entry.writeUInt8(W >= 256 ? 0 : W, 0);
  entry.writeUInt8(H >= 256 ? 0 : H, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(dataSize, 8);
  entry.writeUInt32LE(imgOffset, 12);

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  const entry2 = Buffer.alloc(16);
  const imgOffset2 = 6 + 16 + 16;
  entry2.writeUInt8(32, 0);
  entry2.writeUInt8(32, 1);
  entry2.writeUInt8(0, 2);
  entry2.writeUInt8(0, 3);
  entry2.writeUInt16LE(1, 4);
  entry2.writeUInt16LE(32, 6);
  entry2.writeUInt32LE(dataSize, 8);
  entry2.writeUInt32LE(imgOffset2, 12);

  return Buffer.concat([header, entry, entry2, bmp, bmp]);
}

const px192 = genPixels(192, 192);
const px512 = genPixels(512, 512);
const px64 = genPixels(64, 64);

writeFileSync('public/logo192.png', genPng(192, 192, px192));
writeFileSync('public/logo512.png', genPng(512, 512, px512));
writeFileSync('public/favicon.ico', genIco(64, 64, px64));
console.log('Generated: public/favicon.ico logo192.png logo512.png');
