"use client";

/**
 * Client-side image preparation.
 *
 * Two jobs, both of which have to happen before the bytes leave the device:
 *
 *  1. Downscale. A modern phone camera produces files far past Vercel's ~4.5MB
 *     request ceiling, and on a throttled connection uploading the full frame
 *     costs more of the golden hour than the extraction itself.
 *  2. Strip metadata. Re-encoding through a canvas drops EXIF, which on a
 *     phone photo includes GPS coordinates. The upload control says the image
 *     is read and discarded; this is the part that makes that true of location
 *     data too.
 */

/** Long edge. Bank SMS and UPI screenshots stay readable well below this. */
const MAX_EDGE = 1600;
const QUALITY = 0.72;

export type PreparedImage = { mimeType: string; data: string; bytes: number };

const toBase64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari and some Android browsers refuse HEIC here. Fall through.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("could not decode image"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readRaw(file: File): Promise<PreparedImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });

  const data = toBase64(dataUrl);
  return { mimeType: file.type || "image/jpeg", data, bytes: data.length };
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  try {
    const source = await decode(file);
    const width = "width" in source ? source.width : 0;
    const height = "height" in source ? source.height : 0;
    if (!width || !height) throw new Error("zero-sized image");

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    context.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);

    if ("close" in source) source.close();

    const data = toBase64(canvas.toDataURL("image/jpeg", QUALITY));
    return { mimeType: "image/jpeg", data, bytes: data.length };
  } catch {
    // A format the browser can't decode may still be readable by the model.
    // Send it untouched rather than lose the evidence entirely.
    return readRaw(file);
  }
}
