import { derivedImage } from '@teacherlab/images';

export const MAX_DERIVED_IMAGES = 100;
export const MAX_DERIVED_IMAGE_BYTES = 2 * 1024 * 1024;
const DERIVED_IMAGE_ATTEMPTS = [
  { dimension: 2048, quality: 82 },
  { dimension: 1600, quality: 70 },
  { dimension: 1280, quality: 60 },
  { dimension: 960, quality: 50 },
] as const;

export interface PreparedDerivedImage {
  buffer: Buffer;
  mime: 'image/webp';
  width?: number;
  height?: number;
}

export function limitDerivedImages<T>(assets: readonly T[]): { selected: T[]; skipped: number } {
  return {
    selected: assets.slice(0, MAX_DERIVED_IMAGES),
    skipped: Math.max(0, assets.length - MAX_DERIVED_IMAGES),
  };
}

/** Downsample and progressively compress one extracted image to the shared 2MB cap. */
export async function prepareDerivedImage(buffer: Buffer): Promise<PreparedDerivedImage | null> {
  const output = await derivedImage(buffer, DERIVED_IMAGE_ATTEMPTS, MAX_DERIVED_IMAGE_BYTES);
  return output
    ? { buffer: output.data, mime: 'image/webp', width: output.width, height: output.height }
    : null;
}
