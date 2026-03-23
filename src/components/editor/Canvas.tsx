"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { CanvasEngine } from "@/lib/canvas/engine";
import {
  pencilStroke,
  eraserStroke,
  floodFill,
  drawLine,
  drawRect,
  drawEllipse,
  eyedropper,
  type ToolContext,
} from "@/lib/canvas/tools";
import { renderHitboxes } from "@/lib/canvas/hitbox";
import { flattenLayers } from "@/lib/canvas/layer";
import type { Point, Color, Hitbox } from "@/types";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const isDrawingRef = useRef(false);
  const lastPixelRef = useRef<Point | null>(null);
  const shapeStartRef = useRef<Point | null>(null);
  const beforeSnapshotRef = useRef<{ layerId: string; data: Uint8ClampedArray } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  const {
    tool,
    primaryColor,
    secondaryColor,
    brushSize,
    zoom,
    panOffset,
    setZoom,
    setPanOffset,
    showGrid,
    mirrorX,
    mirrorY,
    showOnionSkin,
    layers,
    activeLayerId,
    setLayers,
    showHitboxes,
    fillShape,
    canvasWidth,
    canvasHeight,
    pushHistory,
    setDirty,
    setPrimaryColor,
  } = useEditorStore();

  const currentAnimation = useProjectStore((s) => s.currentAnimation);
  const currentFrameIndex = useProjectStore((s) => s.currentFrameIndex);
  const updateFrame = useProjectStore((s) => s.updateFrame);

  // Get current frame
  const currentFrame = currentAnimation?.frames[currentFrameIndex] ?? null;

  // Sync layers from the current frame
  useEffect(() => {
    if (currentFrame) {
      setLayers(currentFrame.layers);
      if (!activeLayerId && currentFrame.layers.length > 0) {
        useEditorStore.getState().setActiveLayerId(currentFrame.layers[0].id);
      }
    }
  }, [currentFrame?.id]);

  // Initialize canvas engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = containerSize.w;
    canvas.height = containerSize.h;

    engineRef.current = new CanvasEngine(canvas, canvasWidth, canvasHeight);
    render();
  }, [canvasWidth, canvasHeight, containerSize]);

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setContainerSize({ w: Math.floor(width), h: Math.floor(height) });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Re-render when state changes
  useEffect(() => {
    render();
  }, [layers, zoom, panOffset, showGrid, showHitboxes, showOnionSkin, activeLayerId]);

  const render = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setZoom(zoom);
    engine.setPan(panOffset);

    // Gather onion skin frames if enabled
    let onionSkinData: { data: Uint8ClampedArray; tint: Color; opacity: number }[] | undefined;
    if (showOnionSkin && currentAnimation) {
      const { onionSkinFrames } = useEditorStore.getState();
      onionSkinData = [];
      for (let i = 1; i <= onionSkinFrames; i++) {
        const prevIdx = currentFrameIndex - i;
        if (prevIdx >= 0) {
          const prevFrame = currentAnimation.frames[prevIdx];
          if (prevFrame && prevFrame.layers.length > 0) {
            const flat = flattenLayers(prevFrame.layers, canvasWidth, canvasHeight);
            onionSkinData.push({
              data: flat,
              tint: { r: 0, g: 128, b: 255, a: 128 },
              opacity: 0.3 / i,
            });
          }
        }
      }
    }

    engine.setLayers(layers);
    engine.setShowGrid(showGrid);
    engine.render(onionSkinData);

    // Render hitboxes overlay
    if (showHitboxes && currentFrame?.hitboxes && currentFrame.hitboxes.length > 0) {
      const ctx = engine.getContext();
      renderHitboxes(ctx, currentFrame.hitboxes, zoom, panOffset);
    }
  }, [
    layers,
    zoom,
    panOffset,
    showGrid,
    showHitboxes,
    showOnionSkin,
    currentAnimation,
    currentFrameIndex,
    currentFrame,
  ]);

  // Get pixel coordinate from mouse event
  function getPixel(e: React.MouseEvent): Point | null {
    const engine = engineRef.current;
    if (!engine) return null;
    const rect = canvasRef.current!.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    return engine.displayToPixel(displayX, displayY);
  }

  function getActiveLayerData(): Uint8ClampedArray | null {
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || !layer.visible) return null;
    return layer.data;
  }

  function makeToolContext(data: Uint8ClampedArray, color: Color): ToolContext {
    return { data, width: canvasWidth, height: canvasHeight, color, brushSize, mirrorX, mirrorY };
  }

  function applyTool(pixel: Point, color: Color, button: number) {
    const data = getActiveLayerData();
    if (!data) return;

    const c = button === 2 ? secondaryColor : color;
    const ctx = makeToolContext(data, c);

    switch (tool) {
      case "pencil":
        if (lastPixelRef.current) {
          pencilStroke(ctx, [lastPixelRef.current, pixel]);
        } else {
          pencilStroke(ctx, [pixel]);
        }
        break;

      case "eraser":
        if (lastPixelRef.current) {
          eraserStroke(ctx, [lastPixelRef.current, pixel]);
        } else {
          eraserStroke(ctx, [pixel]);
        }
        break;

      case "fill":
        floodFill(ctx, pixel.x, pixel.y);
        break;

      case "eyedropper": {
        const picked = eyedropper(data, pixel.x, pixel.y, canvasWidth, canvasHeight);
        if (picked) {
          if (button === 2) {
            useEditorStore.getState().setSecondaryColor(picked);
          } else {
            setPrimaryColor(picked);
          }
        }
        return; // Don't mark dirty or update layers
      }

      case "line":
        if (!shapeStartRef.current) return;
        return;

      case "rectangle":
        if (!shapeStartRef.current) return;
        return;

      case "ellipse":
        if (!shapeStartRef.current) return;
        return;

      default:
        break;
    }

    // Update layers in store
    const newLayers = layers.map((l) =>
      l.id === activeLayerId ? { ...l, data: new Uint8ClampedArray(data) } : l
    );
    setLayers(newLayers);
    setDirty(true);
  }

  function finishShape(end: Point, button: number) {
    const start = shapeStartRef.current;
    if (!start) return;

    const data = getActiveLayerData();
    if (!data) return;

    const c = button === 2 ? secondaryColor : primaryColor;
    const ctx = makeToolContext(data, c);

    switch (tool) {
      case "line":
        drawLine(ctx, start.x, start.y, end.x, end.y);
        break;
      case "rectangle":
        drawRect(ctx, start.x, start.y, end.x, end.y, fillShape);
        break;
      case "ellipse":
        drawEllipse(ctx, start.x, start.y, end.x, end.y, fillShape);
        break;
    }

    const newLayers = layers.map((l) =>
      l.id === activeLayerId ? { ...l, data: new Uint8ClampedArray(data) } : l
    );
    setLayers(newLayers);
    setDirty(true);
  }

  // Mouse handlers
  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const pixel = getPixel(e);
    if (!pixel) return;

    // Middle mouse for panning
    if (e.button === 1) {
      isDrawingRef.current = false;
      return;
    }

    // Handle hitbox tool separately
    if (tool === "hitbox") {
      shapeStartRef.current = pixel;
      isDrawingRef.current = true;
      return;
    }

    // Save undo snapshot (before state)
    const data = getActiveLayerData();
    if (data && activeLayerId && tool !== "eyedropper") {
      beforeSnapshotRef.current = {
        layerId: activeLayerId,
        data: new Uint8ClampedArray(data),
      };
    }

    isDrawingRef.current = true;
    lastPixelRef.current = null;
    shapeStartRef.current = pixel;

    if (tool === "fill" || tool === "eyedropper") {
      applyTool(pixel, primaryColor, e.button);
      isDrawingRef.current = false;
    } else {
      applyTool(pixel, primaryColor, e.button);
      lastPixelRef.current = pixel;
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    // Panning with middle mouse
    if (e.buttons === 4) {
      setPanOffset({
        x: panOffset.x + e.movementX,
        y: panOffset.y + e.movementY,
      });
      return;
    }

    if (!isDrawingRef.current) return;
    const pixel = getPixel(e);
    if (!pixel) return;

    if (tool === "hitbox") return; // Hitbox drag handled on mouse up

    if (["line", "rectangle", "ellipse"].includes(tool)) {
      // Preview (render current shape) — we could render a preview here
      // For now we just track the position
      return;
    }

    applyTool(pixel, primaryColor, e.buttons === 2 ? 2 : 0);
    lastPixelRef.current = pixel;
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (!isDrawingRef.current) return;

    const pixel = getPixel(e);
    if (pixel && ["line", "rectangle", "ellipse"].includes(tool)) {
      finishShape(pixel, e.button);
    }

    if (pixel && tool === "hitbox" && shapeStartRef.current) {
      const start = shapeStartRef.current;
      const x = Math.min(start.x, pixel.x);
      const y = Math.min(start.y, pixel.y);
      const w = Math.abs(pixel.x - start.x) + 1;
      const h = Math.abs(pixel.y - start.y) + 1;

      if (currentFrame && w > 1 && h > 1) {
        const { activeHitboxType } = useEditorStore.getState();
        const newHitbox: Hitbox = {
          id: crypto.randomUUID(),
          type: activeHitboxType,
          rect: { x, y, width: w, height: h },
        };
        updateFrame(currentFrame.id, {
          hitboxes: [...(currentFrame.hitboxes ?? []), newHitbox],
        });
      }
    }

    // Push undo command with before/after snapshots
    if (activeLayerId && tool !== "eyedropper" && tool !== "hitbox" && beforeSnapshotRef.current) {
      const finalData = getActiveLayerData();
      if (finalData) {
        pushHistory({
          label: `${tool} stroke`,
          layerId: beforeSnapshotRef.current.layerId,
          before: beforeSnapshotRef.current.data,
          after: new Uint8ClampedArray(finalData),
        });
      }
      beforeSnapshotRef.current = null;
    }

    // Sync layers back to frame
    if (currentFrame && tool !== "eyedropper") {
      updateFrame(currentFrame.id, { layers });
    }

    isDrawingRef.current = false;
    lastPixelRef.current = null;
    shapeStartRef.current = null;
  }

  // Zoom with scroll wheel
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(1, Math.min(64, zoom + delta));
    setZoom(newZoom);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-zinc-950 overflow-hidden cursor-crosshair"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={containerSize.w}
        height={containerSize.h}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDrawingRef.current = false;
          lastPixelRef.current = null;
        }}
        onWheel={handleWheel}
      />
      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 bg-zinc-800/80 px-2 py-0.5 rounded text-xs text-zinc-400 font-mono">
        {zoom}x
      </div>
    </div>
  );
}
