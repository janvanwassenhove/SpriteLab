"use client";

import { useEditorStore } from "@/stores/editor-store";
import { colorToHex, hexToColor } from "@/utils";
import { PRESET_PALETTES } from "@/lib/canvas/palette";
import { useState } from "react";

export function ColorPanel() {
  const primaryColor = useEditorStore((s) => s.primaryColor);
  const secondaryColor = useEditorStore((s) => s.secondaryColor);
  const setPrimaryColor = useEditorStore((s) => s.setPrimaryColor);
  const setSecondaryColor = useEditorStore((s) => s.setSecondaryColor);
  const swapColors = useEditorStore((s) => s.swapColors);
  const [activePalette, setActivePalette] = useState("pico8");

  const palette = PRESET_PALETTES.find((p) => p.id === activePalette) ?? PRESET_PALETTES[0];

  return (
    <div className="p-2 border-b border-border">
      {/* Primary / Secondary color */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative w-12 h-12">
          {/* Secondary (back) */}
          <div
            className="absolute bottom-0 right-0 w-7 h-7 rounded border border-zinc-600 cursor-pointer"
            style={{ backgroundColor: colorToHex(secondaryColor) }}
            title="Secondary color (right-click)"
          />
          {/* Primary (front) */}
          <input
            type="color"
            value={colorToHex(primaryColor)}
            onChange={(e) => setPrimaryColor(hexToColor(e.target.value))}
            className="absolute top-0 left-0 w-8 h-8 rounded border-2 border-zinc-500 cursor-pointer"
          />
        </div>
        <button
          onClick={swapColors}
          className="text-xs text-zinc-400 hover:text-zinc-200 px-1"
          title="Swap colors (X)"
        >
          ⇄
        </button>
        <input
          type="color"
          value={colorToHex(secondaryColor)}
          onChange={(e) => setSecondaryColor(hexToColor(e.target.value))}
          className="w-6 h-6 rounded border border-zinc-600 cursor-pointer"
        />
      </div>

      {/* Palette selector */}
      <div className="flex items-center gap-1 mb-1">
        <select
          value={activePalette}
          onChange={(e) => setActivePalette(e.target.value)}
          className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-300"
        >
          {PRESET_PALETTES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Palette grid */}
      <div className="grid grid-cols-8 gap-0.5">
        {palette.colors.map((color, i) => (
          <button
            key={i}
            className="w-full aspect-square rounded-sm border border-zinc-700 hover:border-zinc-400 transition-colors"
            style={{ backgroundColor: colorToHex(color) }}
            onClick={() => setPrimaryColor(color)}
            onContextMenu={(e) => {
              e.preventDefault();
              setSecondaryColor(color);
            }}
            title={colorToHex(color)}
          />
        ))}
      </div>
    </div>
  );
}
