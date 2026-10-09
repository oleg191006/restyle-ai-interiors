export type Photo = { blob: Blob; preview: string; width: number; height: number };

const MAX_SIDE = 504; // model input must be < 512 px; a multiple of 8 (ADR 0005)

/**
 * Resize in the browser: the model needs < 512 px anyway, uploads shrink from megabytes to
 * kilobytes, and re-encoding through a canvas drops EXIF, including GPS coordinates.
 * The caller owns `preview` (an object URL) and revokes it when the photo is replaced.
 */
export async function preparePhoto(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9),
  );
  return { blob, preview: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
}
