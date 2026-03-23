import type { Palette, Color } from "@/types";
import { v4 as uuidv4 } from "uuid";

// ---- Preset Palettes ----

export const PRESET_PALETTES: Palette[] = [
  {
    id: "pico8",
    name: "PICO-8",
    builtin: true,
    colors: hex(["000000","1D2B53","7E2553","008751","AB5236","5F574F","C2C3C7","FFF1E8","FF004D","FFA300","FFEC27","00E436","29ADFF","83769C","FF77A8","FFCCAA"]),
  },
  {
    id: "gameboy",
    name: "Game Boy",
    builtin: true,
    colors: hex(["0F380F","306230","8BAC0F","9BBC0F"]),
  },
  {
    id: "nes",
    name: "NES",
    builtin: true,
    colors: hex(["000000","FCFCFC","F8F8F8","BCBCBC","7C7C7C","A4E4FC","3CBCFC","0078F8","0000FC","B8B8F8","6888FC","0058F8","0000BC","D8B8F8","9878F8","6844FC","4428BC","F8B8F8","F878F8","D800CC","940084","F8A4C0","F85898","E40058","A80020","F0D0B0","F87858","F83800","A81000","FCE0A8","FCA044","E45C10","881400","F8D878","F8B800","AC7C00","503000","D8F878","B8F818","00B800","007800","B8F8B8","58D854","00A800","006800","B8F8D8","58F898","00A844","005800","00FCFC","00E8D8","008888","004058","F8D8F8","787878"]),
  },
  {
    id: "endesga32",
    name: "Endesga 32",
    builtin: true,
    colors: hex(["be4a2f","d77643","ead4aa","e4a672","b86f50","733e39","3e2731","a22633","e43b44","f77622","feae34","fee761","63c74d","3e8948","265c42","193c3e","124e89","0099db","2ce8f5","ffffff","c0cbdc","8b9bb4","5a6988","3a4466","262b44","181425","ff0044","68386c","b55088","f6757a","e8b796","c28569"]),
  },
  {
    id: "snes",
    name: "SNES Basic",
    builtin: true,
    colors: hex(["000000","808080","C0C0C0","FFFFFF","800000","FF0000","808000","FFFF00","008000","00FF00","008080","00FFFF","000080","0000FF","800080","FF00FF"]),
  },
];

function hex(hexColors: string[]): Color[] {
  return hexColors.map((h) => {
    const v = parseInt(h, 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255, a: 255 };
  });
}

export function createCustomPalette(name: string, colors: Color[]): Palette {
  return { id: uuidv4(), name, colors, builtin: false };
}

/** Find the nearest color in a palette using Euclidean distance in RGB space. */
export function nearestPaletteColor(color: Color, palette: Palette): Color {
  let best = palette.colors[0];
  let bestDist = Infinity;
  for (const c of palette.colors) {
    const dist = (c.r - color.r) ** 2 + (c.g - color.g) ** 2 + (c.b - color.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return { ...best, a: color.a };
}

/** Quantize pixel data to the given palette. */
export function quantizeToPalette(data: Uint8ClampedArray, palette: Palette): Uint8ClampedArray {
  const result = data.slice();
  for (let i = 0; i < result.length; i += 4) {
    if (result[i + 3] === 0) continue; // skip transparent
    const color: Color = { r: result[i], g: result[i + 1], b: result[i + 2], a: result[i + 3] };
    const nearest = nearestPaletteColor(color, palette);
    result[i] = nearest.r;
    result[i + 1] = nearest.g;
    result[i + 2] = nearest.b;
  }
  return result;
}
