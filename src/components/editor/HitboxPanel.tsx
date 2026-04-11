"use client";

import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { Button } from "@/components/ui/button";
import type { HitboxType, Hitbox } from "@/types";
import { Trash2, Copy, ArrowRight } from "lucide-react";
import { cn } from "@/utils";

const HITBOX_TYPES: { type: HitboxType; label: string; color: string }[] = [
  { type: "hitbox", label: "Hitbox", color: "bg-red-600" },
  { type: "hurtbox", label: "Hurtbox", color: "bg-green-600" },
  { type: "pushbox", label: "Pushbox", color: "bg-blue-600" },
];

export function HitboxPanel() {
  const showHitboxes = useEditorStore((s) => s.showHitboxes);
  const toggleHitboxes = useEditorStore((s) => s.toggleHitboxes);
  const activeHitboxType = useEditorStore((s) => s.activeHitboxType);
  const setActiveHitboxType = useEditorStore((s) => s.setActiveHitboxType);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  const currentAnimation = useProjectStore((s) => s.currentAnimation);
  const currentFrameIndex = useProjectStore((s) => s.currentFrameIndex);
  const updateFrame = useProjectStore((s) => s.updateFrame);

  const currentFrame = currentAnimation?.frames[currentFrameIndex] ?? null;
  const hitboxes = currentFrame?.hitboxes ?? [];

  function deleteHitbox(id: string) {
    if (!currentFrame) return;
    updateFrame(currentFrame.id, {
      hitboxes: hitboxes.filter((h) => h.id !== id),
    });
  }

  function copyToNextFrame() {
    if (!currentAnimation || !currentFrame) return;
    const nextIdx = currentFrameIndex + 1;
    if (nextIdx >= currentAnimation.frames.length) return;
    const nextFrame = currentAnimation.frames[nextIdx];
    updateFrame(nextFrame.id, {
      hitboxes: hitboxes.map((h) => ({ ...h, id: crypto.randomUUID() })),
    });
  }

  function copyToAllFrames() {
    if (!currentAnimation || !currentFrame) return;
    for (const frame of currentAnimation.frames) {
      if (frame.id === currentFrame.id) continue;
      updateFrame(frame.id, {
        hitboxes: hitboxes.map((h) => ({ ...h, id: crypto.randomUUID() })),
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle visibility */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Hitbox Overlay</span>
        <button
          onClick={toggleHitboxes}
          className={cn(
            "w-10 h-5 rounded-full transition-colors relative",
            showHitboxes ? "bg-accent" : "bg-surface-hover"
          )}
        >
          <div
            className={cn(
              "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform",
              showHitboxes ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {/* Hitbox type selector */}
      <div>
        <span className="text-xs text-muted block mb-1">Draw Type</span>
        <div className="flex gap-1">
          {HITBOX_TYPES.map(({ type, label, color }) => (
            <button
              key={type}
              onClick={() => {
                setActiveHitboxType(type);
                setTool("hitbox");
              }}
              className={cn(
                "flex-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                activeHitboxType === type && tool === "hitbox"
                  ? `${color} text-white`
                  : "bg-surface text-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hitbox list */}
      <div>
        <span className="text-xs text-muted block mb-1">
          Current Frame ({hitboxes.length})
        </span>
        {hitboxes.length === 0 ? (
          <p className="text-xs text-muted">
            No hitboxes. Select the hitbox tool and draw on the canvas.
          </p>
        ) : (
          <div className="space-y-1">
            {hitboxes.map((hb: Hitbox) => (
              <div
                key={hb.id}
                className="flex items-center justify-between bg-surface rounded px-2 py-1"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      hb.type === "hitbox" && "bg-red-500",
                      hb.type === "hurtbox" && "bg-green-500",
                      hb.type === "pushbox" && "bg-blue-500"
                    )}
                  />
                  <span className="text-xs text-foreground">
                    {hb.type} ({hb.rect.x},{hb.rect.y}) {hb.rect.width}×{hb.rect.height}
                  </span>
                </div>
                <button
                  onClick={() => deleteHitbox(hb.id)}
                  className="text-muted hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Propagation */}
      {hitboxes.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-muted block">Propagate</span>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={copyToNextFrame}
          >
            <ArrowRight className="h-3 w-3 mr-1" />
            Copy to Next Frame
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={copyToAllFrames}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy to All Frames
          </Button>
        </div>
      )}
    </div>
  );
}
