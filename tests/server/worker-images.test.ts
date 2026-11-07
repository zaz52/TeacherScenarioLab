import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { encodeRawPng } from '../../packages/teacherlab-images/raw-png.mjs';
import { createWorkerImageProcessor } from '../../packages/teacherlab-images/worker-processor.mjs';

const png = () =>
  sharp({ create: { width: 40, height: 20, channels: 4, background: 'red' } })
    .png()
    .toBuffer();

// This contract double runs real codecs on Node. The workerd smoke test exercises the binding.
function imageBinding() {
  const calls: Array<Record<string, unknown>> = [];
  const input = vi.fn((stream: ReadableStream) => {
    const parameters: Record<string, unknown> = {};
    const chain = {
      transform(options: Record<string, unknown>) {
        Object.assign(parameters, options);
        return chain;
      },
      async output(options: { format: string; quality?: number; anim: boolean }) {
        calls.push({ ...parameters, ...options });
        const bytes = Buffer.from(await new Response(stream).arrayBuffer());
        let image = sharp(bytes, { failOn: 'error' }).rotate();
        if (parameters.width) {
          image = image.resize({
            width: Number(parameters.width),
            height: Number(parameters.height),
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
        if (parameters.background)
          image = image.flatten({ background: String(parameters.background) });
        const data = await image
          .toFormat(options.format.replace('image/', '') as 'jpeg', { quality: options.quality })
          .toBuffer();
        return {
          response: () =>
            new Response(new Uint8Array(data), { headers: { 'content-type': options.format } }),
        };
      },
    };
    return chain;
  });
  return {
    input,
    calls,
    info: vi.fn(async (stream: ReadableStream) => {
      const metadata = await sharp(
        Buffer.from(await new Response(stream).arrayBuffer()),
      ).metadata();
      return { width: metadata.width, height: metadata.height, format: `image/${metadata.format}` };
    }),
  };
}

describe('Workers image boundary', () => {
  it.each([1, 2, 3, 4])('encodes %i-channel PDF pixels into a decodable PNG', async (channels) => {
    const bytes = Buffer.from(Array.from({ length: 6 * channels }, (_, i) => (i * 19) % 256));
    const encoded = encodeRawPng(bytes, { width: 3, height: 2, channels });
    const actual = await sharp(encoded).ensureAlpha().raw().toBuffer();
    const reference = await sharp(bytes, {
      raw: { width: 3, height: 2, channels: channels as 1 | 2 | 3 | 4 },
    })
      .png()
      .toBuffer();
    expect(actual).toEqual(await sharp(reference).ensureAlpha().raw().toBuffer());
  });

  it.each([
    { width: -1, height: 2, channels: 3 },
    { width: 2, height: 2, channels: 5 },
    { width: 1000000, height: 1000000, channels: 3 },
  ])('rejects invalid raw dimensions before allocation: %j', (options) => {
    expect(() => encodeRawPng(Buffer.alloc(1), options)).toThrow('Invalid raw image');
  });

  it('rejects a short pixel buffer', () => {
    expect(() => encodeRawPng(Buffer.alloc(2), { width: 1, height: 1, channels: 3 })).toThrow();
  });

  it('rejects raw pixels beyond the Workers memory budget before PNG allocation', () => {
    expect(() =>
      encodeRawPng(Buffer.alloc(21 * 1024 * 1024), { width: 7168, height: 1024, channels: 3 }),
    ).toThrow('Invalid raw image');
  });

  it('normalizes vision pixels, bounds output, and preserves input bytes', async () => {
    const binding = imageBinding();
    const source = await png();
    const copy = Buffer.from(source);
    const output = await createWorkerImageProcessor(binding).visionImage(source, {
      maxDimension: 16,
      maxBase64Bytes: 2000,
    });
    expect(await sharp(output.data).metadata()).toMatchObject({
      format: 'jpeg',
      width: 16,
      height: 8,
      space: 'srgb',
    });
    expect(output).toMatchObject({ transformed: true, sourceWidth: 40, sourceHeight: 20 });
    expect(source).toEqual(copy);
    expect(binding.calls[0]).toMatchObject({
      fit: 'scale-down',
      background: '#ffffff',
      anim: false,
    });
  });

  it('fails after the finite quality ladder when the payload cannot fit', async () => {
    const binding = imageBinding();
    await expect(
      createWorkerImageProcessor(binding).visionImage(await png(), {
        maxDimension: 16,
        maxBase64Bytes: 1,
      }),
    ).rejects.toThrow('payload cap');
    expect(binding.calls.map((c) => c.quality)).toEqual([82, 65, 45, 30, 20]);
  });

  it('returns a bounded WebP derivative and rejects a spent byte budget', async () => {
    const processor = createWorkerImageProcessor(imageBinding());
    const output = await processor.derivedImage(
      await png(),
      [{ dimension: 16, quality: 82 }],
      1000,
    );
    expect(await sharp(output!.data).metadata()).toMatchObject({
      format: 'webp',
      width: 16,
      height: 8,
    });
    expect(
      await processor.derivedImage(await png(), [{ dimension: 16, quality: 82 }], 1),
    ).toBeNull();
  });

  it('propagates quota and decoding failures', async () => {
    const binding = imageBinding();
    binding.input.mockImplementation(() => {
      throw new Error('quota 9422');
    });
    await expect(createWorkerImageProcessor(binding).toPng(await png())).rejects.toThrow(
      'quota 9422',
    );
    await expect(
      createWorkerImageProcessor(imageBinding()).visionImage(Buffer.from('truncated'), {
        maxDimension: 16,
        maxBase64Bytes: 1000,
      }),
    ).rejects.toThrow();
  });

  it('rejects missing bindings and oversized input', async () => {
    expect(() => createWorkerImageProcessor(undefined)).toThrow('binding');
    const binding = imageBinding();
    await expect(
      createWorkerImageProcessor(binding).toPng(Buffer.alloc(20 * 1024 * 1024 + 1)),
    ).rejects.toThrow('input limit');
    expect(binding.input).not.toHaveBeenCalled();
  });
});
