import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createWorkerImageProcessor } from './worker-processor.mjs';

// Read request bindings when an operation runs; Next can import this module during its build.
const processor = () => createWorkerImageProcessor(getCloudflareContext().env.IMAGES);
export const imageInfo = (...args) => processor().imageInfo(...args);
export const toPng = (...args) => processor().toPng(...args);
export const rawToPng = (...args) => processor().rawToPng(...args);
export const derivedImage = (...args) => processor().derivedImage(...args);
export const visionImage = (...args) => processor().visionImage(...args);
