import { derivedImage, imageInfo, rawToPng, toPng, visionImage } from '@teacherlab/images';

const worker = {
  async fetch() {
    const bytes = Buffer.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
    const png = await rawToPng(bytes, { width: 2, height: 2, channels: 3 });
    const metadata = await imageInfo(png);
    const converted = await toPng(png);
    const webp = await derivedImage(png, [{ dimension: 1, quality: 82 }], 1024);
    const vision = await visionImage(png, {
      mime: 'image/png',
      maxDimension: 1,
      maxBase64Bytes: 2048,
    });
    let rejected = false;
    try {
      await toPng(Buffer.from('invalid image'));
    } catch {
      rejected = true;
    }
    const webpInfo = webp && (await imageInfo(webp.data));
    const visionInfo = await imageInfo(vision.data);
    const passed =
      metadata.width === 2 &&
      metadata.height === 2 &&
      (await imageInfo(converted)).format === 'png' &&
      webpInfo?.format === 'webp' &&
      webpInfo.width === 1 &&
      visionInfo.format === 'jpeg' &&
      visionInfo.width === 1 &&
      rejected;
    return Response.json(
      { passed, metadata, webpInfo, visionInfo, invalidRejected: rejected },
      { status: passed ? 200 : 500 },
    );
  },
};

export default worker;
