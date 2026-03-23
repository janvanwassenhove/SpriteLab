"use client";

import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";

export function StatusBar() {
  const tool = useEditorStore((s) => s.tool);
  const zoom = useEditorStore((s) => s.zoom);
  const brushSize = useEditorStore((s) => s.brushSize);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const isDirty = useEditorStore((s) => s.isDirty);
  const mirrorX = useEditorStore((s) => s.mirrorX);
  const mirrorY = useEditorStore((s) => s.mirrorY);
  const currentAnimation = useProjectStore((s) => s.currentAnimation);
  const currentFrameIndex = useProjectStore((s) => s.currentFrameIndex);

  const frameCount = currentAnimation?.frames.length ?? 0;

  return (
    <footer className="flex items-center justify-between border-t border-border px-3 py-0.5 h-6 text-[10px] text-zinc-500 font-mono shrink-0 bg-surface">
      <div className="flex items-center gap-3">
        <span className="uppercase">{tool}</span>
        <span>Brush: {brushSize}px</span>
        <span>
          {canvasWidth}×{canvasHeight}
        </span>
        {mirrorX && <span className="text-indigo-400">MirrorX</span>}
        {mirrorY && <span className="text-indigo-400">MirrorY</span>}
      </div>
      <div className="flex items-center gap-3">
        <span>
          Frame {currentFrameIndex + 1}/{frameCount}
        </span>
        <span>Zoom: {zoom}x</span>
        {isDirty && <span className="text-amber-400">● Unsaved</span>}
      </div>
    </footer>
  );
}
