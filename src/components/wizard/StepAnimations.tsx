"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { ANIMATION_TEMPLATES } from "@/lib/fighter-pack/templates";
import { Label } from "@/components/ui/label";
import type { AnimationType } from "@/types";
import { CheckCircle } from "lucide-react";

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

  const totalFrames = selectedAnimations.reduce((sum, type) => {
    const tmpl = ANIMATION_TEMPLATES.find((t) => t.type === type);
    if (!tmpl) return sum;
    return sum + (keyFramesOnly ? Math.min(3, tmpl.defaultFrameCount) : tmpl.defaultFrameCount);
  }, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Select Animations</h2>
        <p className="text-zinc-400 text-sm">
          Choose which animations to generate for your character.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={selectAllAnimations}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Select All
          </button>
          <span className="text-xs text-zinc-600">|</span>
          <button
            onClick={deselectAllAnimations}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Deselect All
          </button>
        </div>
        <span className="text-xs text-zinc-400">
          {selectedAnimations.length} animations, ~{totalFrames} frames
        </span>
      </div>

      {/* Animation categories */}
      <div className="space-y-4">
        {ANIM_CATEGORIES.map((category) => (
          <div key={category.label}>
            <Label className="text-xs uppercase tracking-wider text-zinc-500 mb-2 block">
              {category.label}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {category.types.map((type) => {
                const tmpl = ANIMATION_TEMPLATES.find((t) => t.type === type);
                if (!tmpl) return null;
                const selected = selectedAnimations.includes(type);
                const frames = keyFramesOnly
                  ? Math.min(3, tmpl.defaultFrameCount)
                  : tmpl.defaultFrameCount;

                return (
                  <button
                    key={type}
                    onClick={() => toggleAnimation(type)}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selected
                        ? "border-indigo-500/50 bg-indigo-500/10 text-zinc-100"
                        : "border-zinc-700 bg-zinc-800/30 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                        selected ? "bg-indigo-500 text-white" : "border border-zinc-600"
                      }`}
                    >
                      {selected && <CheckCircle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tmpl.label}</span>
                        <span className="text-[10px] text-zinc-500">
                          {frames}f &middot; {tmpl.defaultDelay}ms
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Key frames toggle */}
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={keyFramesOnly}
            onChange={toggleKeyFramesOnly}
            className="accent-indigo-500 mt-0.5"
          />
          <div>
            <span className="text-sm font-medium text-zinc-200">Key Frames Only</span>
            <p className="text-xs text-zinc-500 mt-0.5">
              Generate only 3 key frames per animation (start, peak, end) and interpolate the rest.
              Significantly reduces cost and generation time.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
