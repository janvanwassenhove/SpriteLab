import type { Palette, Color } from "@/types";
import { nearestPaletteColor } from "@/lib/canvas/palette";

/**
 * Style descriptor extracted from a base character sprite.
 * Used to maintain consistency across all generated frames.
 */
export interface StyleDescriptor {
  palette: Palette;
  dominantColors: Color[];
  hasOutline: boolean;
  outlineColor?: Color;
  description: string; // free-text AI-generated description
}

/**
 * Extract dominant colors from pixel data using frequency counting.
 */
export function extractDominantColors(data: Uint8ClampedArray, maxColors = 16): Color[] {
  const colorMap = new Map<string, { color: Color; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent

    // Quantize to reduce similar colors
    const r = Math.round(data[i] / 8) * 8;
    const g = Math.round(data[i + 1] / 8) * 8;
    const b = Math.round(data[i + 2] / 8) * 8;
    const key = `${r},${g},${b}`;

    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { color: { r, g, b, a: 255 }, count: 1 });
    }
  }

  return Array.from(colorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((e) => e.color);
}

/**
 * Detect if the sprite has an outline (dark border around the character).
 */
export function detectOutline(data: Uint8ClampedArray, width: number, height: number): { hasOutline: boolean; color?: Color } {
  // Check adjacent to transparent pixels for consistent dark pixels
  let outlinePixelCount = 0;
  let totalBorderPixels = 0;
  let rSum = 0, gSum = 0, bSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;

      // Check if this pixel is adjacent to a transparent pixel
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
      ];
      let isEdge = false;
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          isEdge = true;
          break;
        }
        const ni = (ny * width + nx) * 4;
        if (data[ni + 3] < 128) {
          isEdge = true;
          break;
        }
      }

      if (isEdge) {
        totalBorderPixels++;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness < 80) {
          outlinePixelCount++;
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
        }
      }
    }
  }

  if (totalBorderPixels === 0) return { hasOutline: false };

  const outlineRatio = outlinePixelCount / totalBorderPixels;
  if (outlineRatio > 0.5) {
    return {
      hasOutline: true,
      color: {
        r: Math.round(rSum / outlinePixelCount),
        g: Math.round(gSum / outlinePixelCount),
        b: Math.round(bSum / outlinePixelCount),
        a: 255,
      },
    };
  }

  return { hasOutline: false };
}

/**
 * Enforce palette consistency: remap any off-palette colors to the nearest palette color.
 */
export function enforcePalette(data: Uint8ClampedArray, palette: Palette): Uint8ClampedArray {
  const result = data.slice();
  for (let i = 0; i < result.length; i += 4) {
    if (result[i + 3] < 128) {
      result[i] = result[i + 1] = result[i + 2] = 0;
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

/**
 * Score visual consistency between two frames (0-1, higher = more consistent).
 */
export function consistencyScore(
  frame1: Uint8ClampedArray,
  frame2: Uint8ClampedArray,
  width: number,
  height: number
): number {
  let totalDiff = 0;
  let pixelCount = 0;
  const total = width * height * 4;

  for (let i = 0; i < total; i += 4) {
    // Only compare non-transparent pixels present in both
    const a1 = frame1[i + 3] > 128;
    const a2 = frame2[i + 3] > 128;

    if (a1 && a2) {
      const dr = Math.abs(frame1[i] - frame2[i]);
      const dg = Math.abs(frame1[i + 1] - frame2[i + 1]);
      const db = Math.abs(frame1[i + 2] - frame2[i + 2]);
      totalDiff += (dr + dg + db) / (3 * 255);
      pixelCount++;
    }
  }

  if (pixelCount === 0) return 0;
  return 1 - totalDiff / pixelCount;
}
