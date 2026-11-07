export interface ImageInfo {
  format?: string;
  width?: number;
  height?: number;
}
export interface EncodedImage {
  data: Buffer;
  width: number;
  height: number;
}
export interface VisionImageResult extends EncodedImage {
  mime: string;
  transformed: boolean;
  sourceWidth: number;
  sourceHeight: number;
}
export interface VisionOptions {
  mime: string;
  declaredWidth?: number;
  declaredHeight?: number;
  maxDimension: number;
  maxBase64Bytes: number;
}
export function imageInfo(bytes: Buffer): Promise<ImageInfo>;
export function toPng(bytes: Buffer): Promise<Buffer>;
export function rawToPng(
  bytes: Buffer,
  options: { width: number; height: number; channels: number },
): Promise<Buffer>;
export function derivedImage(
  bytes: Buffer,
  attempts: ReadonlyArray<{ dimension: number; quality: number }>,
  maxBytes: number,
): Promise<EncodedImage | null>;
export function visionImage(bytes: Buffer, options: VisionOptions): Promise<VisionImageResult>;
