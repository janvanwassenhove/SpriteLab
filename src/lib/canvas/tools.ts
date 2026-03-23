import type { Color, Point } from "@/types";
import { getPixel, setPixel, colorMatch } from "@/utils";

// ---- Tool Interface ----

export interface ToolContext {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  color: Color;
  brushSize: number;
  mirrorX: boolean;
  mirrorY: boolean;
}

function inBounds(x: number, y: number, w: number, h: number) {
  return x >= 0 && x < w && y >= 0 && y < h;
}

function drawBrush(ctx: ToolContext, cx: number, cy: number) {
  const half = Math.floor(ctx.brushSize / 2);
  for (let dy = -half; dy < ctx.brushSize - half; dy++) {
    for (let dx = -half; dx < ctx.brushSize - half; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      setMirroredPixel(ctx, px, py, ctx.color);
    }
  }
}

function setMirroredPixel(ctx: ToolContext, x: number, y: number, color: Color) {
  if (inBounds(x, y, ctx.width, ctx.height)) {
    setPixel(ctx.data, x, y, ctx.width, color);
  }
  if (ctx.mirrorX) {
    const mx = ctx.width - 1 - x;
    if (inBounds(mx, y, ctx.width, ctx.height)) {
      setPixel(ctx.data, mx, y, ctx.width, color);
    }
  }
  if (ctx.mirrorY) {
    const my = ctx.height - 1 - y;
    if (inBounds(x, my, ctx.width, ctx.height)) {
      setPixel(ctx.data, x, my, ctx.width, color);
    }
  }
  if (ctx.mirrorX && ctx.mirrorY) {
    const mx = ctx.width - 1 - x;
    const my = ctx.height - 1 - y;
    if (inBounds(mx, my, ctx.width, ctx.height)) {
      setPixel(ctx.data, mx, my, ctx.width, color);
    }
  }
}

// ---- Pencil Tool ----

export function pencilStroke(ctx: ToolContext, points: Point[]) {
  if (points.length === 0) return;
  if (points.length === 1) {
    drawBrush(ctx, points[0].x, points[0].y);
    return;
  }
  // Bresenham between consecutive points for smooth strokes
  for (let i = 0; i < points.length - 1; i++) {
    bresenhamLine(ctx, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, (x, y) => {
      drawBrush(ctx, x, y);
    });
  }
}

// ---- Eraser Tool ----

export function eraserStroke(ctx: ToolContext, points: Point[]) {
  const eraseColor: Color = { r: 0, g: 0, b: 0, a: 0 };
  const eraseCtx = { ...ctx, color: eraseColor };
  if (points.length === 0) return;
  if (points.length === 1) {
    drawBrush(eraseCtx, points[0].x, points[0].y);
    return;
  }
  for (let i = 0; i < points.length - 1; i++) {
    bresenhamLine(eraseCtx, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, (x, y) => {
      drawBrush(eraseCtx, x, y);
    });
  }
}

// ---- Flood Fill ----

export function floodFill(ctx: ToolContext, startX: number, startY: number, tolerance = 0) {
  const { data, width, height, color } = ctx;
  if (!inBounds(startX, startY, width, height)) return;

  const targetColor = getPixel(data, startX, startY, width);
  if (colorMatch(targetColor, color, 0)) return;

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const idx = y * width + x;
    if (visited[idx]) continue;
    if (!inBounds(x, y, width, height)) continue;

    const px = getPixel(data, x, y, width);
    if (!colorMatch(px, targetColor, tolerance)) continue;

    visited[idx] = 1;
    setPixel(data, x, y, width, color);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

// ---- Line Tool (Bresenham) ----

function bresenhamLine(
  ctx: ToolContext,
  x0: number, y0: number,
  x1: number, y1: number,
  plot: (x: number, y: number) => void
) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  let x = x0, y = y0;
  while (true) {
    plot(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

export function drawLine(ctx: ToolContext, x0: number, y0: number, x1: number, y1: number) {
  bresenhamLine(ctx, x0, y0, x1, y1, (x, y) => drawBrush(ctx, x, y));
}

// ---- Rectangle Tool ----

export function drawRect(ctx: ToolContext, x0: number, y0: number, x1: number, y1: number, filled: boolean) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  if (filled) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        setMirroredPixel(ctx, x, y, ctx.color);
      }
    }
  } else {
    // Top and bottom edges
    for (let x = minX; x <= maxX; x++) {
      setMirroredPixel(ctx, x, minY, ctx.color);
      setMirroredPixel(ctx, x, maxY, ctx.color);
    }
    // Left and right edges
    for (let y = minY + 1; y < maxY; y++) {
      setMirroredPixel(ctx, minX, y, ctx.color);
      setMirroredPixel(ctx, maxX, y, ctx.color);
    }
  }
}

// ---- Ellipse Tool (Midpoint) ----

export function drawEllipse(ctx: ToolContext, x0: number, y0: number, x1: number, y1: number, filled: boolean) {
  const cx = Math.round((x0 + x1) / 2);
  const cy = Math.round((y0 + y1) / 2);
  const rx = Math.abs(Math.round((x1 - x0) / 2));
  const ry = Math.abs(Math.round((y1 - y0) / 2));

  if (rx === 0 && ry === 0) {
    setMirroredPixel(ctx, cx, cy, ctx.color);
    return;
  }

  if (filled) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x * ry * ry + y * y * rx * rx) <= rx * rx * ry * ry) {
          setMirroredPixel(ctx, cx + x, cy + y, ctx.color);
        }
      }
    }
  } else {
    // Midpoint ellipse algorithm
    let x = 0, y = ry;
    let d1 = ry * ry - rx * rx * ry + 0.25 * rx * rx;
    let dx = 2 * ry * ry * x;
    let dy = 2 * rx * rx * y;

    const plotEllipsePoints = (px: number, py: number) => {
      setMirroredPixel(ctx, cx + px, cy + py, ctx.color);
      setMirroredPixel(ctx, cx - px, cy + py, ctx.color);
      setMirroredPixel(ctx, cx + px, cy - py, ctx.color);
      setMirroredPixel(ctx, cx - px, cy - py, ctx.color);
    };

    while (dx < dy) {
      plotEllipsePoints(x, y);
      x++;
      dx += 2 * ry * ry;
      if (d1 < 0) {
        d1 += dx + ry * ry;
      } else {
        y--;
        dy -= 2 * rx * rx;
        d1 += dx - dy + ry * ry;
      }
    }

    let d2 = ry * ry * (x + 0.5) * (x + 0.5) + rx * rx * (y - 1) * (y - 1) - rx * rx * ry * ry;
    while (y >= 0) {
      plotEllipsePoints(x, y);
      y--;
      dy -= 2 * rx * rx;
      if (d2 > 0) {
        d2 += rx * rx - dy;
      } else {
        x++;
        dx += 2 * ry * ry;
        d2 += dx - dy + rx * rx;
      }
    }
  }
}

// ---- Eyedropper Tool ----

export function eyedropper(data: Uint8ClampedArray, x: number, y: number, width: number, height: number): Color | null {
  if (!inBounds(x, y, width, height)) return null;
  return getPixel(data, x, y, width);
}
