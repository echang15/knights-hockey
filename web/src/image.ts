/** Downscale to a JPEG in the browser so uploads stay small and fast. Returns base64 (no data: prefix). */
export async function toJpeg(file: File, maxSide: number, quality: number): Promise<string> {
  const bmp = await createImageBitmap(file); // honors EXIF orientation in modern browsers
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL('image/jpeg', quality).split(',')[1];
}
