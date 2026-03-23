import type { Frame } from "@/types";
import { flattenLayers } from "@/lib/canvas/layer";

interface GifOptions {
  width: number;
  height: number;
  scale?: number;
  loop?: boolean;
  quality?: number; // 1-20, lower is better
}

/**
 * Create an animated GIF from frames.
 * Uses gif.js worker-based encoder.
 */
export async function createAnimatedGif(
  frames: Frame[],
  options: GifOptions
): Promise<Blob> {
  const { default: GIF } = await import("gif.js");

  const { width, height, scale = 1, loop = true, quality = 10 } = options;
  const outWidth = width * scale;
  const outHeight = height * scale;

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality,
      width: outWidth,
      height: outHeight,
      workerScript: "/gif.worker.js",
      repeat: loop ? 0 : -1,
    });

    for (const frame of frames) {
      const flat = flattenLayers(frame.layers, width, height);

      // Create a canvas for this frame
      const canvas = document.createElement("canvas");
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext("2d")!;

      // Disable image smoothing for crisp pixel art scaling
      ctx.imageSmoothingEnabled = false;

      if (scale === 1) {
        const copy = new Uint8ClampedArray(flat.length);
        copy.set(flat);
        const imgData = new ImageData(copy, width, height);
        ctx.putImageData(imgData, 0, 0);
      } else {
        // Create a temp canvas at original size, then draw scaled
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d")!;
        const copy = new Uint8ClampedArray(flat.length);
        copy.set(flat);
        const imgData = new ImageData(copy, width, height);
        tempCtx.putImageData(imgData, 0, 0);

        ctx.drawImage(tempCanvas, 0, 0, outWidth, outHeight);
      }

      gif.addFrame(canvas, { delay: frame.delay, copy: true });
    }

    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("error", (err: Error) => reject(err));
    gif.render();
  });
}

/**
 * Create a PNG sequence as individual blobs.
 */
export async function createPngSequence(
  frames: Frame[],
  width: number,
  height: number,
  scale: number = 1
): Promise<{ blob: Blob; filename: string }[]> {
  const results: { blob: Blob; filename: string }[] = [];

  for (let i = 0; i < frames.length; i++) {
    const flat = flattenLayers(frames[i].layers, width, height);
    const outWidth = width * scale;
    const outHeight = height * scale;

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    if (scale === 1) {
      const copy = new Uint8ClampedArray(flat.length);
      copy.set(flat);
      const imgData = new ImageData(copy, width, height);
      ctx.putImageData(imgData, 0, 0);
    } else {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d")!;
      const copy = new Uint8ClampedArray(flat.length);
      copy.set(flat);
      const imgData = new ImageData(copy, width, height);
      tempCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, outWidth, outHeight);
    }

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/png");
    });

    results.push({
      blob,
      filename: `frame_${String(i).padStart(3, "0")}.png`,
    });
  }

  return results;
}
