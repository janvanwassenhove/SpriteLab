import type { Color, Palette } from "@/types";
import { nearestPaletteColor } from "@/lib/canvas/palette";

/**
 * AI-to-pixel-art conversion pipeline.
 * Takes an arbitrary AI-generated image and converts it to clean pixel art.
 */

/** Downscale an image to target sprite dimensions using area averaging. */
export function downscale(
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const xRatio = sourceWidth / targetWidth;
  const yRatio = sourceHeight / targetHeight;

  for (let ty = 0; ty < targetHeight; ty++) {
    for (let tx = 0; tx < targetWidth; tx++) {
      // Area averaging: sample all source pixels that map to this target pixel
      const sx0 = Math.floor(tx * xRatio);
      const sy0 = Math.floor(ty * yRatio);
      const sx1 = Math.min(Math.floor((tx + 1) * xRatio), sourceWidth);
      const sy1 = Math.min(Math.floor((ty + 1) * yRatio), sourceHeight);

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      let count = 0;

      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const si = (sy * sourceWidth + sx) * 4;
          rSum += sourceData[si];
          gSum += sourceData[si + 1];
          bSum += sourceData[si + 2];
          aSum += sourceData[si + 3];
          count++;
        }
      }

      if (count === 0) continue;
      const ti = (ty * targetWidth + tx) * 4;
      result[ti] = Math.round(rSum / count);
      result[ti + 1] = Math.round(gSum / count);
      result[ti + 2] = Math.round(bSum / count);
      result[ti + 3] = Math.round(aSum / count);
    }
  }
  return result;
}

/** Quantize colors to a limited palette using nearest-color mapping. */
export function quantize(data: Uint8ClampedArray, palette: Palette): Uint8ClampedArray {
  const result = data.slice();
  for (let i = 0; i < result.length; i += 4) {
    if (result[i + 3] < 128) {
      // Make near-transparent pixels fully transparent
      result[i] = 0;
      result[i + 1] = 0;
      result[i + 2] = 0;
      result[i + 3] = 0;
      continue;
    }
    const color: Color = { r: result[i], g: result[i + 1], b: result[i + 2], a: 255 };
    const nearest = nearestPaletteColor(color, palette);
    result[i] = nearest.r;
    result[i + 1] = nearest.g;
    result[i + 2] = nearest.b;
    result[i + 3] = 255;
  }
  return result;
}

/** Remove background using alpha threshold. */
export function removeBackground(data: Uint8ClampedArray, threshold = 240): Uint8ClampedArray {
  const result = data.slice();
  for (let i = 0; i < result.length; i += 4) {
    // If pixel is near-white or near-black with low saturation, treat as background
    const r = result[i], g = result[i + 1], b = result[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;

    if (lightness > threshold) {
      result[i] = 0;
      result[i + 1] = 0;
      result[i + 2] = 0;
      result[i + 3] = 0;
    }
  }
  return result;
}

/** Full pixelizer pipeline: downscale → remove background → quantize to palette. */
export function pixelize(
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  palette: Palette
): Uint8ClampedArray {
  let data = downscale(sourceData, sourceWidth, sourceHeight, targetWidth, targetHeight);
  data = removeBackground(data);
  data = quantize(data, palette);
  return data;
}

/** Convert a base64 PNG to pixel data. Runs in browser. */
export async function base64ToPixelData(base64: string): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve({
        data: imageData.data,
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64}`;
  });
}
