import type { Layer, Color, Point, BlendMode } from "@/types";
import { createEmptyPixelData, getPixelIndex, clamp } from "@/utils";

/**
 * Core pixel art canvas engine.
 * Manages layers, compositing, zoom/pan, grid overlay, and display rendering.
 */
export class CanvasEngine {
  private displayCanvas: HTMLCanvasElement;
  private displayCtx: CanvasRenderingContext2D;
  private layers: Layer[] = [];
  private width: number;
  private height: number;
  private _zoom = 8;
  private _panOffset: Point = { x: 0, y: 0 };
  private _showGrid = true;
  private _gridThreshold = 4; // show grid when zoom >= this
  private compositeBuffer: Uint8ClampedArray;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.displayCanvas = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get 2d context");
    this.displayCtx = ctx;
    this.width = width;
    this.height = height;
    this.compositeBuffer = createEmptyPixelData(width, height);
    // Disable image smoothing for crisp pixel art
    this.displayCtx.imageSmoothingEnabled = false;
  }

  get canvasWidth() { return this.width; }
  get canvasHeight() { return this.height; }
  get zoom() { return this._zoom; }
  get panOffset() { return this._panOffset; }
  get showGrid() { return this._showGrid; }

  setZoom(z: number) {
    this._zoom = clamp(z, 1, 64);
  }

  setPan(offset: Point) {
    this._panOffset = offset;
  }

  setShowGrid(show: boolean) {
    this._showGrid = show;
  }

  setLayers(layers: Layer[]) {
    this.layers = layers;
  }

  getLayers(): Layer[] {
    return this.layers;
  }

  /** Return the underlying 2D rendering context for overlay drawing. */
  getContext(): CanvasRenderingContext2D {
    return this.displayCtx;
  }

  /** Resize the sprite canvas (not the display canvas). */
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.compositeBuffer = createEmptyPixelData(width, height);
  }

  /** Convert display coordinates (relative to canvas element) to sprite pixel coordinates. */
  displayToPixel(displayX: number, displayY: number): Point {
    return {
      x: Math.floor((displayX - this._panOffset.x) / this._zoom),
      y: Math.floor((displayY - this._panOffset.y) / this._zoom),
    };
  }

  /** Check if pixel coordinates are within sprite bounds. */
  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** Composite all visible layers into the composite buffer using alpha blending. */
  composite(): Uint8ClampedArray {
    const buf = this.compositeBuffer;
    buf.fill(0);
    const total = this.width * this.height * 4;

    for (const layer of this.layers) {
      if (!layer.visible || layer.opacity === 0) continue;
      const src = layer.data;
      const opacity = layer.opacity;

      for (let i = 0; i < total; i += 4) {
        const sa = (src[i + 3] / 255) * opacity;
        if (sa === 0) continue;

        const da = buf[i + 3] / 255;
        const outA = sa + da * (1 - sa);
        if (outA === 0) continue;

        if (layer.blendMode === "normal") {
          buf[i] = (src[i] * sa + buf[i] * da * (1 - sa)) / outA;
          buf[i + 1] = (src[i + 1] * sa + buf[i + 1] * da * (1 - sa)) / outA;
          buf[i + 2] = (src[i + 2] * sa + buf[i + 2] * da * (1 - sa)) / outA;
        } else {
          const blended = applyBlendMode(
            layer.blendMode,
            { r: src[i], g: src[i + 1], b: src[i + 2] },
            { r: buf[i], g: buf[i + 1], b: buf[i + 2] }
          );
          buf[i] = (blended.r * sa + buf[i] * da * (1 - sa)) / outA;
          buf[i + 1] = (blended.g * sa + buf[i + 1] * da * (1 - sa)) / outA;
          buf[i + 2] = (blended.b * sa + buf[i + 2] * da * (1 - sa)) / outA;
        }
        buf[i + 3] = outA * 255;
      }
    }
    return buf;
  }

  /** Render the composited sprite to the display canvas with zoom, pan, and grid. */
  render(onionSkinData?: { data: Uint8ClampedArray; tint: Color; opacity: number }[]) {
    const ctx = this.displayCtx;
    const dw = this.displayCanvas.width;
    const dh = this.displayCanvas.height;

    ctx.clearRect(0, 0, dw, dh);
    ctx.imageSmoothingEnabled = false;

    // Draw checkerboard background (transparency indicator)
    this.drawCheckerboard(ctx);

    // Draw onion skin layers
    if (onionSkinData) {
      for (const os of onionSkinData) {
        this.drawPixelData(ctx, os.data, os.opacity);
      }
    }

    // Composite and draw main sprite
    const composited = this.composite();
    this.drawPixelData(ctx, composited, 1);

    // Draw grid overlay
    if (this._showGrid && this._zoom >= this._gridThreshold) {
      this.drawGrid(ctx);
    }
  }

  private drawPixelData(ctx: CanvasRenderingContext2D, data: Uint8ClampedArray, opacity: number) {
    // Create an offscreen canvas at sprite resolution
    const offscreen = new OffscreenCanvas(this.width, this.height);
    const offCtx = offscreen.getContext("2d")!;
    const imgData = offCtx.createImageData(this.width, this.height);
    imgData.data.set(data);
    offCtx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(this._panOffset.x, this._panOffset.y);
    ctx.scale(this._zoom, this._zoom);
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  }

  private drawCheckerboard(ctx: CanvasRenderingContext2D) {
    const checkSize = Math.max(4, this._zoom);
    const ox = this._panOffset.x;
    const oy = this._panOffset.y;
    const sw = this.width * this._zoom;
    const sh = this.height * this._zoom;

    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, sw, sh);
    ctx.clip();

    for (let y = 0; y < sh; y += checkSize) {
      for (let x = 0; x < sw; x += checkSize) {
        const isLight = ((Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2) === 0;
        ctx.fillStyle = isLight ? "#2a2a2a" : "#1a1a1a";
        ctx.fillRect(ox + x, oy + y, checkSize, checkSize);
      }
    }
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    const z = this._zoom;
    const ox = this._panOffset.x;
    const oy = this._panOffset.y;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x++) {
      const dx = ox + x * z + 0.5;
      ctx.beginPath();
      ctx.moveTo(dx, oy);
      ctx.lineTo(dx, oy + this.height * z);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y++) {
      const dy = oy + y * z + 0.5;
      ctx.beginPath();
      ctx.moveTo(ox, dy);
      ctx.lineTo(ox + this.width * z, dy);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Flatten all visible layers into a single pixel data array (for export). */
  flatten(): Uint8ClampedArray {
    return this.composite().slice();
  }

  /** Export the flattened sprite as a PNG data URL. */
  toDataURL(): string {
    const offscreen = new OffscreenCanvas(this.width, this.height);
    const ctx = offscreen.getContext("2d")!;
    const imgData = ctx.createImageData(this.width, this.height);
    imgData.data.set(this.flatten());
    ctx.putImageData(imgData, 0, 0);

    // Convert OffscreenCanvas to blob then data URL
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    const c = canvas.getContext("2d")!;
    c.drawImage(offscreen, 0, 0);
    return canvas.toDataURL("image/png");
  }
}

// ---- Blend Mode Helpers ----

function applyBlendMode(
  mode: BlendMode,
  src: { r: number; g: number; b: number },
  dst: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  switch (mode) {
    case "multiply":
      return {
        r: (src.r * dst.r) / 255,
        g: (src.g * dst.g) / 255,
        b: (src.b * dst.b) / 255,
      };
    case "screen":
      return {
        r: 255 - ((255 - src.r) * (255 - dst.r)) / 255,
        g: 255 - ((255 - src.g) * (255 - dst.g)) / 255,
        b: 255 - ((255 - src.b) * (255 - dst.b)) / 255,
      };
    case "overlay":
      return {
        r: dst.r < 128 ? (2 * src.r * dst.r) / 255 : 255 - (2 * (255 - src.r) * (255 - dst.r)) / 255,
        g: dst.g < 128 ? (2 * src.g * dst.g) / 255 : 255 - (2 * (255 - src.g) * (255 - dst.g)) / 255,
        b: dst.b < 128 ? (2 * src.b * dst.b) / 255 : 255 - (2 * (255 - src.b) * (255 - dst.b)) / 255,
      };
    case "darken":
      return {
        r: Math.min(src.r, dst.r),
        g: Math.min(src.g, dst.g),
        b: Math.min(src.b, dst.b),
      };
    case "lighten":
      return {
        r: Math.max(src.r, dst.r),
        g: Math.max(src.g, dst.g),
        b: Math.max(src.b, dst.b),
      };
    default:
      return src;
  }
}
