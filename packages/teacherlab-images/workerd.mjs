import { env } from 'cloudflare:workers';
import { createWorkerImageProcessor } from './worker-processor.mjs';

const processor = () => createWorkerImageProcessor(env.IMAGES);
export const imageInfo = (...args) => processor().imageInfo(...args);
export const toPng = (...args) => processor().toPng(...args);
export const rawToPng = (...args) => processor().rawToPng(...args);
export const derivedImage = (...args) => processor().derivedImage(...args);
export const visionImage = (...args) => processor().visionImage(...args);
