import type { Hitbox, HitboxType, Rect, FrameHitboxes } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function createHitbox(type: HitboxType, rect: Rect, label?: string): Hitbox {
  return {
    id: uuidv4(),
    type,
    rect,
    label: label ?? type,
    damageMultiplier: type === "hitbox" ? 1.0 : undefined,
    priority: type === "hitbox" ? 0 : undefined,
  };
}

export function hitboxColor(type: HitboxType): string {
  switch (type) {
    case "hitbox": return "rgba(255, 60, 60, 0.4)";
    case "hurtbox": return "rgba(60, 255, 60, 0.4)";
    case "pushbox": return "rgba(60, 60, 255, 0.4)";
  }
}

export function hitboxBorderColor(type: HitboxType): string {
  switch (type) {
    case "hitbox": return "#ff3c3c";
    case "hurtbox": return "#3cff3c";
    case "pushbox": return "#3c3cff";
  }
}

export function renderHitboxes(
  ctx: CanvasRenderingContext2D,
  hitboxes: Hitbox[],
  zoom: number,
  panOffset: { x: number; y: number }
) {
  for (const hb of hitboxes) {
    const x = panOffset.x + hb.rect.x * zoom;
    const y = panOffset.y + hb.rect.y * zoom;
    const w = hb.rect.width * zoom;
    const h = hb.rect.height * zoom;

    ctx.fillStyle = hitboxColor(hb.type);
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = hitboxBorderColor(hb.type);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Label
    if (hb.label) {
      ctx.fillStyle = hitboxBorderColor(hb.type);
      ctx.font = `${Math.max(10, zoom)}px monospace`;
      ctx.fillText(hb.label, x + 2, y + Math.max(12, zoom));
    }
  }
}

/** Copy hitboxes from one frame to another, generating new IDs. */
export function propagateHitboxes(source: FrameHitboxes): FrameHitboxes {
  return {
    frameId: "", // caller should set target frameId
    hitboxes: source.hitboxes.map((hb) => ({
      ...hb,
      id: uuidv4(),
      rect: { ...hb.rect },
    })),
  };
}

/** Shift all hitboxes in a frame by dx, dy. */
export function shiftHitboxes(hitboxes: Hitbox[], dx: number, dy: number): Hitbox[] {
  return hitboxes.map((hb) => ({
    ...hb,
    rect: { ...hb.rect, x: hb.rect.x + dx, y: hb.rect.y + dy },
  }));
}

/** Scale all hitboxes in a frame by sx, sy. */
export function scaleHitboxes(hitboxes: Hitbox[], sx: number, sy: number): Hitbox[] {
  return hitboxes.map((hb) => ({
    ...hb,
    rect: {
      x: Math.round(hb.rect.x * sx),
      y: Math.round(hb.rect.y * sy),
      width: Math.round(hb.rect.width * sx),
      height: Math.round(hb.rect.height * sy),
    },
  }));
}
