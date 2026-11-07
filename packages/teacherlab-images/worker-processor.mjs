import { encodeRawPng } from './raw-png.mjs';

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const FORMATS = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpeg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/avif', 'avif'],
]);

function stream(bytes) {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_INPUT_BYTES) {
    throw new Error('Image is empty or exceeds the Workers image input limit');
  }
  return new Blob([new Uint8Array(bytes)]).stream();
}

function dimensions(info) {
  if (
    !Number.isSafeInteger(info.width) ||
    !Number.isSafeInteger(info.height) ||
    info.width <= 0 ||
    info.height <= 0
  ) {
    throw new Error('Missing image dimensions');
  }
  return { width: info.width, height: info.height };
}

export function createWorkerImageProcessor(binding) {
  if (!binding?.input || !binding?.info) throw new Error('IMAGES binding is not configured');

  async function imageInfo(bytes) {
    const info = await binding.info(stream(bytes));
    return { ...dimensions(info), format: FORMATS.get(info.format) ?? info.format };
  }

  async function encode(bytes, { format, quality, dimension, background }) {
    let image = binding.input(stream(bytes));
    if (dimension) {
      image = image.transform({ width: dimension, height: dimension, fit: 'scale-down' });
    }
    if (background) image = image.transform({ background });
    const result = await image.output({ format, ...(quality ? { quality } : {}), anim: false });
    const response = result.response();
    if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== format) {
      throw new Error('Image transformation failed');
    }
    const data = Buffer.from(await response.arrayBuffer());
    const info = await imageInfo(data);
    if (dimension && Math.max(info.width, info.height) > dimension) {
      throw new Error('Image transformation exceeded the dimension limit');
    }
    return { data, width: info.width, height: info.height };
  }

  return {
    imageInfo,
    toPng: async (bytes) => (await encode(bytes, { format: 'image/png' })).data,
    rawToPng: async (bytes, raw) => encodeRawPng(bytes, raw),
    async derivedImage(bytes, attempts, maxBytes) {
      for (const { dimension, quality } of attempts) {
        const output = await encode(bytes, { format: 'image/webp', quality, dimension });
        if (output.data.byteLength <= maxBytes) return output;
      }
      return null;
    },
    async visionImage(bytes, options) {
      const source = await imageInfo(bytes);
      // info() does not establish bit depth, colour space or full pixel validity.
      // Decode/normalize with the image service before returning any vision attachment.
      for (const quality of [82, 65, 45, 30, 20]) {
        const output = await encode(bytes, {
          format: 'image/jpeg',
          quality,
          dimension: options.maxDimension,
          background: '#ffffff',
        });
        if (Math.ceil(output.data.byteLength / 3) * 4 <= options.maxBase64Bytes) {
          return {
            ...output,
            mime: 'image/jpeg',
            transformed: true,
            sourceWidth: source.width,
            sourceHeight: source.height,
          };
        }
      }
      throw new Error('Encoded image exceeds the vision base64 payload cap');
    },
  };
}
