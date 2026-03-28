import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function colorToHex(r: number | { r: number; g: number; b: number }, g?: number, b?: number): string {
  if (typeof r === "object") {
    return `#${((1 << 24) | (r.r << 16) | (r.g << 8) | r.b).toString(16).slice(1)}`;
  }
  return `#${((1 << 24) | (r << 16) | ((g ?? 0) << 8) | (b ?? 0)).toString(16).slice(1)}`;
}

export function hexToColor(hex: string): { r: number; g: number; b: number; a: number } {
  const v = parseInt(hex.replace("#", ""), 16);
  return {
    r: (v >> 16) & 255,
    g: (v >> 8) & 255,
    b: v & 255,
    a: 255,
  };
}

export function colorMatch(
  a: { r: number; g: number; b: number; a: number },
  b: { r: number; g: number; b: number; a: number },
  tolerance = 0
): boolean {
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance &&
    Math.abs(a.a - b.a) <= tolerance
  );
}

export function createEmptyPixelData(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

/**
 * Decode a base64 PNG into RGBA pixel data by drawing it onto an offscreen canvas.
 */
export function base64ToPixelData(
  base64: string,
  targetWidth: number,
  targetHeight: number
): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      resolve(new Uint8ClampedArray(imageData.data));
    };
    img.onerror = reject;
    img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  });
}

export function getPixelIndex(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

export function getPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): { r: number; g: number; b: number; a: number } {
  const i = getPixelIndex(x, y, width);
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

export function setPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  color: { r: number; g: number; b: number; a: number }
): void {
  const i = getPixelIndex(x, y, width);
  data[i] = color.r;
  data[i + 1] = color.g;
  data[i + 2] = color.b;
  data[i + 3] = color.a;
}
