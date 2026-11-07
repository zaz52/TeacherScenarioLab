import { visionImage } from '@teacherlab/images';
import { parseBase64DataUrl, type GenerationLogger } from '@openmaic/generation';
import {
  MAX_VISION_IMAGE_BASE64_BYTES,
  MAX_VISION_IMAGE_DIMENSION,
} from '@/lib/constants/generation';

interface VisionImage {
  id: string;
  src: string;
  width?: number;
  height?: number;
}

/** Bound only inline vision attachments, leaving source assets and their ids intact. */
export async function prepareVisionImages<T extends VisionImage>(
  images: readonly T[],
  log: Pick<GenerationLogger, 'info' | 'warn'>,
): Promise<Array<T & VisionImage>> {
  const safeImages: Array<T & VisionImage> = [];
  // Sequential decoding bounds peak memory to one source image and its output.
  for (const image of images) {
    const parsed = parseBase64DataUrl(image.src);
    if (!parsed) {
      safeImages.push(image);
      continue;
    }
    let originalBytes = 0;
    try {
      const buffer = Buffer.from(parsed.base64, 'base64');
      originalBytes = buffer.byteLength;
      const declaredMime = parsed.mimeType.toLowerCase();
      const mime = declaredMime === 'image/jpg' ? 'image/jpeg' : declaredMime;
      const output = await visionImage(buffer, {
        mime,
        declaredWidth: image.width,
        declaredHeight: image.height,
        maxDimension: MAX_VISION_IMAGE_DIMENSION,
        maxBase64Bytes: MAX_VISION_IMAGE_BASE64_BYTES,
      });
      if (!output.transformed) {
        safeImages.push({
          ...image,
          src: `data:${mime};base64,${parsed.base64}`,
        });
        continue;
      }
      safeImages.push({
        ...image,
        src: `data:${output.mime};base64,${output.data.toString('base64')}`,
        width: output.width,
        height: output.height,
      });
      log.info('Transformed vision image', {
        id: image.id,
        from: {
          mime: parsed.mimeType,
          bytes: originalBytes,
          width: output.sourceWidth,
          height: output.sourceHeight,
        },
        to: {
          mime: output.mime,
          bytes: output.data.byteLength,
          width: output.width,
          height: output.height,
        },
      });
    } catch (error) {
      log.warn('Dropped vision image', {
        id: image.id,
        mime: parsed.mimeType,
        bytes: originalBytes,
        reason: error instanceof Error ? error.message : 'Image preparation failed',
      });
    }
  }
  return safeImages;
}
