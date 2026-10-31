import sharp from 'sharp';

export const imageInfo = (bytes) => sharp(bytes, { failOn: 'none' }).metadata();
export const toPng = (bytes) => sharp(bytes).png().toBuffer();
export const rawToPng = (bytes, raw) => sharp(bytes, { raw }).png().toBuffer();

export async function derivedImage(bytes, attempts, maxBytes) {
  for (const { dimension, quality } of attempts) {
    const output = await sharp(bytes, { failOn: 'none' })
      .rotate()
      .resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (output.data.byteLength <= maxBytes) {
      return { data: output.data, width: output.info.width, height: output.info.height };
    }
  }
  return null;
}

const FORMATS = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpeg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export async function visionImage(bytes, options) {
  const metadata = await imageInfo(bytes);
  const { width, height } = metadata;
  if (!width || !height) throw new Error('Missing image dimensions');
  const base = { sourceWidth: width, sourceHeight: height };
  if (
    FORMATS.get(options.mime) === metadata.format &&
    Math.ceil(bytes.byteLength / 3) * 4 <= options.maxBase64Bytes &&
    (metadata.pages ?? 1) === 1 &&
    (metadata.space === 'srgb' || metadata.space === 'b-w') &&
    metadata.depth === 'uchar' &&
    Math.max(width, height, options.declaredWidth ?? 0, options.declaredHeight ?? 0) <=
      options.maxDimension
  ) {
    await sharp(bytes, { failOn: 'error' }).raw().toBuffer();
    return { ...base, data: bytes, width, height, mime: options.mime, transformed: false };
  }
  const pixels = await sharp(bytes, { failOn: 'error' })
    .rotate()
    .resize({
      width: options.maxDimension,
      height: options.maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .flatten({ background: '#ffffff' })
    .toColourspace('srgb')
    .raw({ depth: 'uchar' })
    .toBuffer({ resolveWithObject: true });
  for (const quality of [82, 65, 45, 30, 20]) {
    const output = await sharp(pixels.data, {
      raw: { width: pixels.info.width, height: pixels.info.height, channels: pixels.info.channels },
    })
      .jpeg({ quality })
      .toBuffer({ resolveWithObject: true });
    if (Math.ceil(output.data.byteLength / 3) * 4 <= options.maxBase64Bytes) {
      return {
        ...base,
        data: output.data,
        width: output.info.width,
        height: output.info.height,
        mime: 'image/jpeg',
        transformed: true,
      };
    }
  }
  throw new Error('Encoded image exceeds the vision base64 payload cap');
}
