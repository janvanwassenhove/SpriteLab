"use client";

import { v4 as uuid } from "uuid";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { createEmptyPixelData } from "@/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/utils";
import type { Layer } from "@/types";

export function LayerPanel() {
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const setLayers = useEditorStore((s) => s.setLayers);
  const setActiveLayerId = useEditorStore((s) => s.setActiveLayerId);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const currentFrame = useProjectStore((s) => {
    const anim = s.currentAnimation;
    if (!anim) return null;
    return anim.frames[s.currentFrameIndex] ?? null;
  });
  const updateFrame = useProjectStore((s) => s.updateFrame);

  function addLayer() {
    const newLayer: Layer = {
      id: uuid(),
      name: `Layer ${layers.length + 1}`,
      data: createEmptyPixelData(canvasWidth, canvasHeight),
      visible: true,
      opacity: 1,
      blendMode: "normal",
      width: canvasWidth,
      height: canvasHeight,
    };
    const newLayers = [newLayer, ...layers];
    setLayers(newLayers);
    setActiveLayerId(newLayer.id);
    syncToFrame(newLayers);
  }

  function duplicateLayer(id: string) {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const copy: Layer = {
      ...layer,
      id: uuid(),
      name: `${layer.name} copy`,
      data: new Uint8ClampedArray(layer.data),
    };
    const idx = layers.findIndex((l) => l.id === id);
    const newLayers = [...layers];
    newLayers.splice(idx, 0, copy);
    setLayers(newLayers);
    setActiveLayerId(copy.id);
    syncToFrame(newLayers);
  }

  function deleteLayer(id: string) {
    if (layers.length <= 1) return;
    const newLayers = layers.filter((l) => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) {
      setActiveLayerId(newLayers[0]?.id ?? null);
    }
    syncToFrame(newLayers);
  }

  function moveLayer(id: string, direction: "up" | "down") {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= layers.length) return;
    const newLayers = [...layers];
    [newLayers[idx], newLayers[newIdx]] = [newLayers[newIdx], newLayers[idx]];
    setLayers(newLayers);
    syncToFrame(newLayers);
  }

  function syncToFrame(newLayers: Layer[]) {
    if (currentFrame) {
      updateFrame(currentFrame.id, { layers: newLayers });
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">
          Layers
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addLayer}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0.5">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={cn(
                "flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer transition-colors",
                activeLayerId === layer.id
                  ? "bg-surface-hover text-foreground"
                  : "text-muted hover:bg-surface-hover"
              )}
              onClick={() => setActiveLayerId(layer.id)}
            >
              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { visible: !layer.visible });
                }}
                className="shrink-0 hover:text-foreground"
              >
                {layer.visible ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3 text-muted" />
                )}
              </button>

              {/* Layer name */}
              <span className="flex-1 truncate text-[11px]">{layer.name}</span>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, "up");
                  }}
                  className="hover:text-foreground"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, "down");
                  }}
                  className="hover:text-foreground"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateLayer(layer.id);
                  }}
                  className="hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  className="hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Layer opacity */}
      {activeLayerId && (
        <div className="px-2 py-1.5 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted">Opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((layers.find((l) => l.id === activeLayerId)?.opacity ?? 1) * 100)}
              onChange={(e) =>
                updateLayer(activeLayerId, { opacity: parseInt(e.target.value) / 100 })
              }
              className="flex-1 h-1 accent-accent"
            />
            <span className="text-[10px] text-muted w-7 text-right font-mono">
              {Math.round((layers.find((l) => l.id === activeLayerId)?.opacity ?? 1) * 100)}
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
