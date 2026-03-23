"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { Tool } from "@/types";

const TOOL_SHORTCUTS: Record<string, Tool> = {
  b: "pencil",
  e: "eraser",
  g: "fill",
  l: "line",
  r: "rectangle",
  o: "ellipse",
  i: "eyedropper",
  s: "select",
  v: "move",
  h: "hitbox",
};

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Don't intercept when typing in inputs
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const store = useEditorStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Ctrl+Z — Undo
      if (ctrl && key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y — Redo
      if ((ctrl && key === "z" && e.shiftKey) || (ctrl && key === "y")) {
        e.preventDefault();
        store.redo();
        return;
      }

      // Ctrl+S — Save (prevent default browser save)
      if (ctrl && key === "s") {
        e.preventDefault();
        // Dispatch custom event for save handlers
        window.dispatchEvent(new CustomEvent("sprite-lab:save"));
        return;
      }

      // Don't handle other shortcuts with ctrl/alt
      if (ctrl || e.altKey) return;

      // Tool shortcuts
      if (TOOL_SHORTCUTS[key]) {
        e.preventDefault();
        store.setTool(TOOL_SHORTCUTS[key]);
        return;
      }

      // X — Swap colors
      if (key === "x") {
        e.preventDefault();
        store.swapColors();
        return;
      }

      // +/= — Increase brush size
      if (key === "=" || key === "+") {
        e.preventDefault();
        store.setBrushSize(Math.min(store.brushSize + 1, 64));
        return;
      }

      // - — Decrease brush size
      if (key === "-") {
        e.preventDefault();
        store.setBrushSize(Math.max(store.brushSize - 1, 1));
        return;
      }

      // [ — Zoom out
      if (key === "[") {
        e.preventDefault();
        store.setZoom(Math.max(store.zoom - 1, 1));
        return;
      }

      // ] — Zoom in
      if (key === "]") {
        e.preventDefault();
        store.setZoom(Math.min(store.zoom + 1, 64));
        return;
      }

      // Delete — Clear active layer
      if (key === "delete") {
        e.preventDefault();
        // Clear the pixels of the active layer
        const layers = store.layers.map((layer) => {
          if (layer.id === store.activeLayerId) {
            const data = new Uint8ClampedArray(layer.data.length);
            return { ...layer, data };
          }
          return layer;
        });
        store.setLayers(layers);
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
