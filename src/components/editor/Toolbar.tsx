"use client";

import { useEditorStore } from "@/stores/editor-store";
import { Tooltip } from "@/components/ui/tooltip";
import type { Tool } from "@/types";
import {
  Pencil,
  Eraser,
  PaintBucket,
  Minus,
  Square,
  Circle,
  Pipette,
  Move,
  MousePointer,
  Box,
  FlipHorizontal,
  FlipVertical,
  Grid3X3,
  Layers,
} from "lucide-react";
import { cn } from "@/utils";

const TOOLS: { tool: Tool; icon: typeof Pencil; label: string; shortcut: string }[] = [
  { tool: "pencil", icon: Pencil, label: "Pencil", shortcut: "B" },
  { tool: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
  { tool: "fill", icon: PaintBucket, label: "Fill", shortcut: "G" },
  { tool: "line", icon: Minus, label: "Line", shortcut: "L" },
  { tool: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { tool: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { tool: "eyedropper", icon: Pipette, label: "Eyedropper", shortcut: "I" },
  { tool: "select", icon: MousePointer, label: "Select", shortcut: "S" },
  { tool: "move", icon: Move, label: "Move", shortcut: "V" },
  { tool: "hitbox", icon: Box, label: "Hitbox", shortcut: "H" },
];

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const brushSize = useEditorStore((s) => s.brushSize);
  const setBrushSize = useEditorStore((s) => s.setBrushSize);
  const mirrorX = useEditorStore((s) => s.mirrorX);
  const mirrorY = useEditorStore((s) => s.mirrorY);
  const toggleMirrorX = useEditorStore((s) => s.toggleMirrorX);
  const toggleMirrorY = useEditorStore((s) => s.toggleMirrorY);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const showOnionSkin = useEditorStore((s) => s.showOnionSkin);
  const toggleOnionSkin = useEditorStore((s) => s.toggleOnionSkin);
  const fillShape = useEditorStore((s) => s.fillShape);
  const toggleFillShape = useEditorStore((s) => s.toggleFillShape);

  return (
    <div className="flex flex-col items-center w-10 border-r border-border bg-surface py-2 gap-0.5 shrink-0">
      {/* Drawing tools */}
      {TOOLS.map(({ tool: t, icon: Icon, label, shortcut }) => (
        <Tooltip key={t} content={`${label} (${shortcut})`} side="right">
          <button
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded transition-colors",
              tool === t
                ? "bg-accent text-white"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            )}
            onClick={() => setTool(t)}
          >
            <Icon className="h-4 w-4" />
          </button>
        </Tooltip>
      ))}

      <div className="w-6 border-t border-border my-1" />

      {/* Brush size */}
      <Tooltip content={`Brush: ${brushSize}px`} side="right">
        <div className="flex flex-col items-center gap-0.5">
          <button
            className="w-8 h-6 text-xs text-muted hover:text-foreground"
            onClick={() => setBrushSize(brushSize + 1)}
          >
            +
          </button>
          <span className="text-[10px] text-muted font-mono">{brushSize}</span>
          <button
            className="w-8 h-6 text-xs text-muted hover:text-foreground"
            onClick={() => setBrushSize(brushSize - 1)}
          >
            -
          </button>
        </div>
      </Tooltip>

      <div className="w-6 border-t border-border my-1" />

      {/* Toggle buttons */}
      <Tooltip content={`Mirror X${mirrorX ? " (ON)" : ""}`} side="right">
        <button
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded transition-colors",
            mirrorX ? "bg-accent text-white" : "text-muted hover:bg-surface-hover"
          )}
          onClick={toggleMirrorX}
        >
          <FlipHorizontal className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content={`Mirror Y${mirrorY ? " (ON)" : ""}`} side="right">
        <button
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded transition-colors",
            mirrorY ? "bg-accent text-white" : "text-muted hover:bg-surface-hover"
          )}
          onClick={toggleMirrorY}
        >
          <FlipVertical className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content={`Grid${showGrid ? " (ON)" : ""}`} side="right">
        <button
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded transition-colors",
            showGrid ? "bg-accent text-white" : "text-muted hover:bg-surface-hover"
          )}
          onClick={toggleGrid}
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content={`Onion Skin${showOnionSkin ? " (ON)" : ""}`} side="right">
        <button
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded transition-colors",
            showOnionSkin ? "bg-accent text-white" : "text-muted hover:bg-surface-hover"
          )}
          onClick={toggleOnionSkin}
        >
          <Layers className="h-4 w-4" />
        </button>
      </Tooltip>

      {/* Fill toggle for shape tools */}
      {["rectangle", "ellipse"].includes(tool) && (
        <Tooltip content={fillShape ? "Filled" : "Outline"} side="right">
          <button
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded transition-colors",
              fillShape ? "bg-accent text-white" : "text-muted hover:bg-surface-hover"
            )}
            onClick={toggleFillShape}
          >
            <Square className={cn("h-4 w-4", fillShape && "fill-current")} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
