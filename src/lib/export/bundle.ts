import JSZip from "jszip";
import type { Animation, Frame, FighterPack, FighterPackManifest, AnimationType } from "@/types";
import { packSpriteSheet, imageDataToBlob } from "./sprite-sheet";
import { createAnimatedGif, createPngSequence } from "./gif";

interface BundleOptions {
  includeMetadata: boolean;
  includePngSequence: boolean;
  includeSpriteSheet: boolean;
  includeGif: boolean;
  spriteSheetLayout: "auto" | "horizontal" | "vertical";
  scale: number;
}

const defaultBundleOptions: BundleOptions = {
  includeMetadata: true,
  includePngSequence: true,
  includeSpriteSheet: true,
  includeGif: true,
  spriteSheetLayout: "horizontal",
  scale: 1,
};

/**
 * Export a single animation as a zip bundle.
 */
export async function exportAnimationBundle(
  animation: Animation,
  spriteWidth: number,
  spriteHeight: number,
  options: Partial<BundleOptions> = {}
): Promise<Blob> {
  const opts = { ...defaultBundleOptions, ...options };
  const zip = new JSZip();
  const folder = zip.folder(sanitizeName(animation.name))!;

  await addAnimationToZip(folder, animation, spriteWidth, spriteHeight, opts);

  return zip.generateAsync({ type: "blob" });
}

/**
 * Export a complete fighter pack as a zip bundle.
 */
export async function exportFighterPackBundle(
  pack: FighterPack,
  animations: (Animation & { type: AnimationType })[],
  spriteWidth: number,
  spriteHeight: number,
  options: Partial<BundleOptions> = {}
): Promise<Blob> {
  const opts = { ...defaultBundleOptions, ...options };
  const zip = new JSZip();
  const root = zip.folder(sanitizeName(pack.name))!;

  // Create manifest
  const manifest: FighterPackManifest = {
    name: pack.name,
    version: "1.0.0",
    spriteSize: { width: spriteWidth, height: spriteHeight },
    animations: animations.map((anim) => ({
      type: anim.type,
      frameCount: anim.frames.length,
      frameDelay: anim.frames[0]?.delay ?? 100,
      loop: anim.loop,
      spriteSheet: `${sanitizeName(anim.name)}/spritesheet.png`,
    })),
  };

  if (opts.includeMetadata) {
    root.file("manifest.json", JSON.stringify(manifest, null, 2));
  }

  // Export each animation
  for (const animation of animations) {
    const animFolder = root.folder(sanitizeName(animation.name))!;
    await addAnimationToZip(animFolder, animation, spriteWidth, spriteHeight, opts);
  }

  return zip.generateAsync({ type: "blob" });
}

async function addAnimationToZip(
  folder: JSZip,
  animation: Animation & { type?: AnimationType },
  spriteWidth: number,
  spriteHeight: number,
  opts: BundleOptions
): Promise<void> {
  const frames = animation.frames;
  if (frames.length === 0) return;

  // Sprite sheet
  if (opts.includeSpriteSheet) {
    const { imageData, metadata } = packSpriteSheet(
      frames,
      spriteWidth,
      spriteHeight,
      opts.spriteSheetLayout
    );
    const blob = await imageDataToBlobHelper(imageData);
    folder.file("spritesheet.png", blob);

    if (opts.includeMetadata) {
      folder.file("metadata.json", JSON.stringify(metadata, null, 2));
    }
  }

  // PNG sequence
  if (opts.includePngSequence) {
    const pngs = await createPngSequence(frames, spriteWidth, spriteHeight, opts.scale);
    const pngFolder = folder.folder("frames")!;
    for (const png of pngs) {
      pngFolder.file(png.filename, png.blob);
    }
  }

  // Animated GIF
  if (opts.includeGif) {
    const gifBlob = await createAnimatedGif(frames, {
      width: spriteWidth,
      height: spriteHeight,
      scale: opts.scale,
      loop: animation.loop === "loop" || animation.loop === "ping-pong",
    });
    folder.file("preview.gif", gifBlob);
  }

  // Animation data
  if (opts.includeMetadata) {
    const animData = {
      name: animation.name,
      type: animation.type,
      frameCount: frames.length,
      loop: animation.loop,
      frames: frames.map((f: Frame, i: number) => ({
        index: i,
        delay: f.delay,
        hitboxes: f.hitboxes,
      })),
    };
    folder.file("animation.json", JSON.stringify(animData, null, 2));
  }
}

async function imageDataToBlobHelper(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

/**
 * Trigger a browser download for a blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
