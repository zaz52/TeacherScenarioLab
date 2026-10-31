import { deflateSync } from 'node:zlib';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, bytes) {
  const body = Buffer.concat([Buffer.from(type), bytes]);
  const output = Buffer.alloc(body.length + 8);
  output.writeUInt32BE(bytes.length, 0);
  body.copy(output, 4);
  output.writeUInt32BE(crc32(body), body.length + 4);
  return output;
}

// PDF extractors provide tightly packed, unsigned 8-bit samples, including grayscale/alpha.
export function encodeRawPng(bytes, { width, height, channels }) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    ![1, 2, 3, 4].includes(channels) ||
    bytes.byteLength > 20 * 1024 * 1024 ||
    width * height > 268402689 ||
    bytes.length !== width * height * channels
  ) {
    throw new Error('Invalid raw image dimensions or byte length');
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = [0, 0, 4, 2, 6][channels];
  const stride = width * channels;
  const pixels = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row++) {
    bytes.copy(pixels, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
