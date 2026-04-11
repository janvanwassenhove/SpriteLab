"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { ANIMATION_TEMPLATES } from "@/lib/fighter-pack/templates";
import { Label } from "@/components/ui/label";
import type { AnimationType } from "@/types";
import { CheckCircle, Minus, Plus, Film } from "lucide-react";

const ANIM_CATEGORIES: { label: string; types: AnimationType[] }[] = [
  {
    label: "Movement",
    types: ["idle", "walk", "run", "jump", "crouch"] as AnimationType[],
  },
  {
    label: "Attacks",
    types: ["punch", "kick", "special"] as AnimationType[],
  },
  {
    label: "Reactions",
    types: ["hurt", "ko", "block"] as AnimationType[],
  },
  {
    label: "Cinematic",
    types: ["intro", "win"] as AnimationType[],
  },
];

export function StepAnimations() {
  const selectedAnimations = useWizardStore((s) => s.selectedAnimations);
  const toggleAnimation = useWizardStore((s) => s.toggleAnimation);
  const selectAllAnimations = useWizardStore((s) => s.selectAllAnimations);
  const deselectAllAnimations = useWizardStore((s) => s.deselectAllAnimations);
  const keyFramesOnly = useWizardStore((s) => s.keyFramesOnly);
  const toggleKeyFramesOnly = useWizardStore((s) => s.toggleKeyFramesOnly);
  const frameCountOverrides = useWizardStore((s) => s.frameCountOverrides);
  const setFrameCount = useWizardStore((s) => s.setFrameCount);

  function getFrameCount(tmpl: (typeof ANIMATION_TEMPLATES)[number]) {
    const base = frameCountOverrides[tmpl.type] ?? tmpl.defaultFrameCount;
    return keyFramesOnly ? Math.min(base, tmpl.defaultFrameCount) : base;
  }

  const totalFrames = selectedAnimations.reduce((sum, type) => {
    const tmpl = ANIMATION_TEMPLATES.find((t) => t.type === type);
    if (!tmpl) return sum;
    return sum + getFrameCount(tmpl);
  }, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Select Animations</h2>
        <p className="text-muted text-sm">
          Choose which animations to generate for your character.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={selectAllAnimations}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Select All
          </button>
          <span className="text-xs text-muted">|</span>
          <button
            onClick={deselectAllAnimations}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Deselect All
          </button>
        </div>
        <span className="text-xs text-muted">
          {selectedAnimations.length} animations, ~{totalFrames} frames
        </span>
      </div>

      {/* Animation categories */}
      <div className="space-y-4">
        {ANIM_CATEGORIES.map((category) => (
          <div key={category.label}>
            <Label className="text-xs uppercase tracking-wider text-muted mb-2 block">
              {category.label}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {category.types.map((type) => {
                const tmpl = ANIMATION_TEMPLATES.find((t) => t.type === type);
                if (!tmpl) return null;
                const selected = selectedAnimations.includes(type);
                const customCount = frameCountOverrides[type] ?? tmpl.defaultFrameCount;
                const frames = getFrameCount(tmpl);

                return (
                  <div
                    key={type}
                    className={`rounded-lg border transition-all ${
                      selected
                        ? "border-accent/50 bg-accent/10"
                        : "border-border bg-surface/50 hover:border-muted"
                    }`}
                  >
                    {/* Toggle row */}
                    <button
                      onClick={() => toggleAnimation(type)}
                      className="flex items-center gap-3 w-full p-3 pb-1.5 text-left"
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                          selected ? "bg-accent text-white" : "border border-border"
                        }`}
                      >
                        {selected && <CheckCircle className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-medium ${selected ? "text-foreground" : "text-muted"}`}>
                          {tmpl.label}
                        </span>
                        <p className="text-[11px] text-muted line-clamp-1">
                          {tmpl.description}
                        </p>
                      </div>
                    </button>

                    {/* Frame count stepper */}
                    <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                      <span className="text-[10px] text-muted flex items-center gap-1">
                        <Film className="h-3 w-3" />
                        {frames}f &middot; {tmpl.defaultDelay}ms
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (customCount > 1) setFrameCount(type, customCount - 1);
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center bg-surface hover:bg-surface-hover text-foreground transition-colors disabled:opacity-30"
                          disabled={customCount <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-mono text-foreground tabular-nums">
                          {customCount}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (customCount < 30) setFrameCount(type, customCount + 1);
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center bg-surface hover:bg-surface-hover text-foreground transition-colors disabled:opacity-30"
                          disabled={customCount >= 30}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Key frames toggle */}
      <div className="bg-surface/50 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={keyFramesOnly}
            onChange={toggleKeyFramesOnly}
            className="accent-accent mt-0.5"
          />
          <div>
            <span className="text-sm font-medium text-foreground">Key Frames Only</span>
            <p className="text-xs text-muted mt-0.5">
              Generate only 3 key frames per animation (start, peak, end) and interpolate the rest.
              Significantly reduces cost and generation time.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
