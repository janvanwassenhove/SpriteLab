"use client";

import { useRef, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import { createEmptyPixelData } from "@/utils";
import { flattenLayers } from "@/lib/canvas/layer";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/utils";
import type { Frame, Layer } from "@/types";

export function Timeline() {
  const currentAnimation = useProjectStore((s) => s.currentAnimation);
  const currentFrameIndex = useProjectStore((s) => s.currentFrameIndex);
  const setCurrentFrameIndex = useProjectStore((s) => s.setCurrentFrameIndex);
  const addFrame = useProjectStore((s) => s.addFrame);
  const deleteFrame = useProjectStore((s) => s.deleteFrame);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const playbackSpeed = useProjectStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useProjectStore((s) => s.setPlaybackSpeed);
  const updateFrame = useProjectStore((s) => s.updateFrame);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const setLayers = useEditorStore((s) => s.setLayers);

  const frames = currentAnimation?.frames ?? [];
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Playback
  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      const delay = (frames[currentFrameIndex]?.delay ?? 100) / playbackSpeed;
      playIntervalRef.current = setInterval(() => {
        useProjectStore.setState((s) => {
          const isLooping = s.currentAnimation?.loop === "loop" || s.currentAnimation?.loop === "ping-pong";
          const nextIdx = isLooping
              ? (s.currentFrameIndex + 1) % (s.currentAnimation?.frames.length ?? 1)
              : Math.min(s.currentFrameIndex + 1, (s.currentAnimation?.frames.length ?? 1) - 1);

          // Stop at end for non-looping
          if (!isLooping && nextIdx === s.currentFrameIndex) {
            setIsPlaying(false);
          }

          return { currentFrameIndex: nextIdx };
        });
      }, delay);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, currentFrameIndex, playbackSpeed, frames.length]);

  // Sync layers when frame changes
  useEffect(() => {
    const frame = frames[currentFrameIndex];
    if (frame) {
      setLayers(frame.layers);
      const { activeLayerId } = useEditorStore.getState();
      if (!activeLayerId || !frame.layers.find((l) => l.id === activeLayerId)) {
        useEditorStore.getState().setActiveLayerId(frame.layers[0]?.id ?? null);
      }
    }
  }, [currentFrameIndex, currentAnimation?.id]);

  function addNewFrame() {
    const newLayer: Layer = {
      id: uuid(),
      name: "Layer 1",
      data: createEmptyPixelData(canvasWidth, canvasHeight),
      width: canvasWidth,
      height: canvasHeight,
      visible: true,
      opacity: 1,
      blendMode: "normal",
    };
    const newFrame: Frame = {
      id: uuid(),
      layers: [newLayer],
      delay: 100,
    };
    addFrame(newFrame);
    setCurrentFrameIndex(frames.length);
  }

  function duplicateCurrentFrame() {
    const frame = frames[currentFrameIndex];
    if (!frame) return;
    const newFrame: Frame = {
      id: uuid(),
      layers: frame.layers.map((l) => ({
        ...l,
        id: uuid(),
        data: new Uint8ClampedArray(l.data),
      })),
      delay: frame.delay,
    };
    addFrame(newFrame);
    setCurrentFrameIndex(frames.length);
  }

  function removeCurrentFrame() {
    if (frames.length <= 1) return;
    const frame = frames[currentFrameIndex];
    if (frame) deleteFrame(frame.id);
  }

  function goTo(idx: number) {
    if (isPlaying) return;
    setCurrentFrameIndex(Math.max(0, Math.min(idx, frames.length - 1)));
  }

  return (
    <div className="flex flex-col h-full bg-surface border-t border-border">
      {/* Controls bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border shrink-0">
        {/* Playback controls */}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => goTo(0)}>
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => goTo(currentFrameIndex - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={isPlaying ? "secondary" : "ghost"}
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => goTo(currentFrameIndex + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => goTo(frames.length - 1)}
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Speed */}
        <span className="text-[10px] text-zinc-500">Speed:</span>
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          className="h-5 text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1 text-zinc-300"
        >
          <option value={0.25}>0.25x</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>

        {/* Frame delay */}
        {frames[currentFrameIndex] && (
          <>
            <span className="text-[10px] text-zinc-500 ml-2">Delay:</span>
            <input
              type="number"
              value={frames[currentFrameIndex].delay}
              onChange={(e) => {
                const frame = frames[currentFrameIndex];
                updateFrame(frame.id, { delay: Math.max(10, parseInt(e.target.value) || 100) });
              }}
              className="w-12 h-5 text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1 text-zinc-300 text-center"
            />
            <span className="text-[10px] text-zinc-500">ms</span>
          </>
        )}

        <div className="flex-1" />

        {/* Frame actions */}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addNewFrame}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={duplicateCurrentFrame}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCurrentFrame}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <span className="text-[10px] text-zinc-500 ml-1 font-mono">
          {currentFrameIndex + 1}/{frames.length}
        </span>
      </div>

      {/* Frame thumbnails */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1 px-2 py-1 overflow-x-auto"
      >
        {frames.map((frame, i) => (
          <FrameThumbnail
            key={frame.id}
            frame={frame}
            index={i}
            isActive={i === currentFrameIndex}
            width={canvasWidth}
            height={canvasHeight}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

function FrameThumbnail({
  frame,
  index,
  isActive,
  width,
  height,
  onClick,
}: {
  frame: Frame;
  index: number;
  isActive: boolean;
  width: number;
  height: number;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const thumbSize = 48;
    canvas.width = thumbSize;
    canvas.height = thumbSize;
    const ctx = canvas.getContext("2d")!;

    // Checkerboard background
    const checkSize = 4;
    for (let y = 0; y < thumbSize; y += checkSize) {
      for (let x = 0; x < thumbSize; x += checkSize) {
        ctx.fillStyle = (x + y) % (checkSize * 2) === 0 ? "#2a2a2e" : "#1e1e22";
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Render flattened frame
    const flat = flattenLayers(frame.layers, width, height);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d")!;
    const imgData = new ImageData(new Uint8ClampedArray(flat.slice().buffer), width, height);
    tempCtx.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, thumbSize, thumbSize);
  }, [frame.layers, width, height]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex flex-col items-center gap-0.5 rounded transition-colors",
        isActive ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-zinc-600"
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-12 h-12 rounded"
        style={{ imageRendering: "pixelated" }}
      />
      <span className="text-[9px] text-zinc-500 font-mono">{index + 1}</span>
    </button>
  );
}
