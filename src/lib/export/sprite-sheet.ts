import { MaxRectsPacker, type Rectangle } from "maxrects-packer";
import type { Frame, SpriteSheetMetadata, Rect } from "@/types";
import { flattenLayers } from "@/lib/canvas/layer";

interface PackedFrame {
  frame: Frame;
  rect: Rect;
  flatData: Uint8ClampedArray;
}

/**
 * Pack animation frames into a sprite sheet using MaxRects algorithm.
 */
export function packSpriteSheet(
  frames: Frame[],
  spriteWidth: number,
  spriteHeight: number,
  layout: "auto" | "horizontal" | "vertical" = "auto"
): { imageData: ImageData; metadata: SpriteSheetMetadata; width: number; height: number } {
  if (layout === "horizontal") {
    return packHorizontalStrip(frames, spriteWidth, spriteHeight);
  }
  if (layout === "vertical") {
    return packVerticalStrip(frames, spriteWidth, spriteHeight);
  }

  // Auto layout: use MaxRects bin packing
  const packer = new MaxRectsPacker(4096, 4096, 1, {
    smart: true,
    pot: false,
    square: false,
  });

  const rects = frames.map((frame, i) => ({
    width: spriteWidth,
    height: spriteHeight,
    data: { index: i },
  }));

  packer.addArray(rects as unknown as Rectangle[]);

  const bin = packer.bins[0];
  if (!bin) throw new Error("Failed to pack sprites");

  const sheetWidth = bin.width;
  const sheetHeight = bin.height;
  const imageData = new ImageData(sheetWidth, sheetHeight);

  const packedFrames: PackedFrame[] = [];

  for (const rect of bin.rects) {
    const data = rect.data as { index: number };
    const frame = frames[data.index];
    const flat = flattenLayers(frame.layers, spriteWidth, spriteHeight);

    // Copy pixel data to the sheet
    for (let y = 0; y < spriteHeight; y++) {
      for (let x = 0; x < spriteWidth; x++) {
        const srcIdx = (y * spriteWidth + x) * 4;
        const dstIdx = ((rect.y + y) * sheetWidth + (rect.x + x)) * 4;
        imageData.data[dstIdx] = flat[srcIdx];
        imageData.data[dstIdx + 1] = flat[srcIdx + 1];
        imageData.data[dstIdx + 2] = flat[srcIdx + 2];
        imageData.data[dstIdx + 3] = flat[srcIdx + 3];
      }
    }

    packedFrames.push({
      frame,
      rect: { x: rect.x, y: rect.y, width: spriteWidth, height: spriteHeight },
      flatData: flat,
    });
  }

  const metadata: SpriteSheetMetadata = {
    frames: packedFrames.map((pf, i) => ({
      filename: `frame_${String(i).padStart(3, "0")}.png`,
      frame: pf.rect,
      duration: pf.frame.delay,
    })),
    meta: {
      image: "spritesheet.png",
      size: { w: sheetWidth, h: sheetHeight },
      format: "RGBA8888",
      scale: 1,
    },
  };

  return { imageData, metadata, width: sheetWidth, height: sheetHeight };
}

function packHorizontalStrip(
  frames: Frame[],
  spriteWidth: number,
  spriteHeight: number
): { imageData: ImageData; metadata: SpriteSheetMetadata; width: number; height: number } {
  const sheetWidth = spriteWidth * frames.length;
  const sheetHeight = spriteHeight;
  const imageData = new ImageData(sheetWidth, sheetHeight);

  const metaFrames: SpriteSheetMetadata["frames"] = [];

  frames.forEach((frame, i) => {
    const flat = flattenLayers(frame.layers, spriteWidth, spriteHeight);
    const offsetX = i * spriteWidth;

    for (let y = 0; y < spriteHeight; y++) {
      for (let x = 0; x < spriteWidth; x++) {
        const srcIdx = (y * spriteWidth + x) * 4;
        const dstIdx = (y * sheetWidth + offsetX + x) * 4;
        imageData.data[dstIdx] = flat[srcIdx];
        imageData.data[dstIdx + 1] = flat[srcIdx + 1];
        imageData.data[dstIdx + 2] = flat[srcIdx + 2];
        imageData.data[dstIdx + 3] = flat[srcIdx + 3];
      }
    }

    metaFrames.push({
      filename: `frame_${String(i).padStart(3, "0")}.png`,
      frame: { x: offsetX, y: 0, width: spriteWidth, height: spriteHeight },
      duration: frame.delay,
    });
  });

  return {
    imageData,
    metadata: {
      frames: metaFrames,
      meta: {
        image: "spritesheet.png",
        size: { w: sheetWidth, h: sheetHeight },
        format: "RGBA8888",
        scale: 1,
      },
    },
    width: sheetWidth,
    height: sheetHeight,
  };
}

function packVerticalStrip(
  frames: Frame[],
  spriteWidth: number,
  spriteHeight: number
): { imageData: ImageData; metadata: SpriteSheetMetadata; width: number; height: number } {
  const sheetWidth = spriteWidth;
  const sheetHeight = spriteHeight * frames.length;
  const imageData = new ImageData(sheetWidth, sheetHeight);

  const metaFrames: SpriteSheetMetadata["frames"] = [];

  frames.forEach((frame, i) => {
    const flat = flattenLayers(frame.layers, spriteWidth, spriteHeight);
    const offsetY = i * spriteHeight;

    for (let y = 0; y < spriteHeight; y++) {
      for (let x = 0; x < spriteWidth; x++) {
        const srcIdx = (y * spriteWidth + x) * 4;
        const dstIdx = ((offsetY + y) * sheetWidth + x) * 4;
        imageData.data[dstIdx] = flat[srcIdx];
        imageData.data[dstIdx + 1] = flat[srcIdx + 1];
        imageData.data[dstIdx + 2] = flat[srcIdx + 2];
        imageData.data[dstIdx + 3] = flat[srcIdx + 3];
      }
    }

    metaFrames.push({
      filename: `frame_${String(i).padStart(3, "0")}.png`,
      frame: { x: 0, y: offsetY, width: spriteWidth, height: spriteHeight },
      duration: frame.delay,
    });
  });

  return {
    imageData,
    metadata: {
      frames: metaFrames,
      meta: {
        image: "spritesheet.png",
        size: { w: sheetWidth, h: sheetHeight },
        format: "RGBA8888",
        scale: 1,
      },
    },
    width: sheetWidth,
    height: sheetHeight,
  };
}

/**
 * Convert ImageData to PNG data URL.
 */
export function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Convert ImageData to Blob.
 */
export async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}
