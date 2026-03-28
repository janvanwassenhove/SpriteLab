"use client";

import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useProjectStore } from "@/stores/project-store";
import { useAIStore } from "@/stores/ai-store";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Swords,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Minus,
  Plus,
} from "lucide-react";
import { ANIMATION_TEMPLATES, getTemplate } from "@/lib/fighter-pack/templates";
import { estimateFighterPackCost, formatCost } from "@/lib/ai/cost-estimator";
import type { AIProvider, AnimationType } from "@/types";

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
];

export function FighterPackPanel() {
  const [fighterName, setFighterName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [keyFramesOnly, setKeyFramesOnly] = useState(true);
  const [selectedAnims, setSelectedAnims] = useState<AnimationType[]>(
    ANIMATION_TEMPLATES.map((t) => t.type)
  );
  const [frameCountOverrides, setFrameCountOverrides] = useState<Partial<Record<AnimationType, number>>>(
    {}
  );

  const isGenerating = useAIStore((s) => s.isGenerating);
  const batchProgress = useAIStore((s) => s.batchProgress);
  const setIsGenerating = useAIStore((s) => s.setIsGenerating);
  const updateBatchProgress = useAIStore((s) => s.updateBatchProgress);

  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);

  const costEstimate = estimateFighterPackCost(provider, selectedAnims, keyFramesOnly, quality, undefined, undefined, frameCountOverrides);

  function toggleAnim(type: AnimationType) {
    setSelectedAnims((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function startGeneration() {
    if (!fighterName.trim() || !description.trim() || isGenerating) return;

    setIsGenerating(true);

    // Collect generated frame images keyed by animationType
    const frameImages = new Map<string, Map<number, string>>();

    try {
      const response = await fetch("/api/ai/fighter-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fighterName: fighterName.trim(),
          description: description.trim(),
          provider,
          quality,
          keyFramesOnly,
          animations: selectedAnims,
          width: canvasWidth,
          height: canvasHeight,
          frameCountOverrides,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Fighter pack generation failed");
      }

      // Stream progress and collect image data
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n").filter(Boolean);

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.animationType && data.progress !== undefined) {
                  updateBatchProgress(data.animationType, data.progress);
                }
                // Collect image data for each frame
                if (data.imageData && data.animationType != null && data.frameIndex != null) {
                  if (!frameImages.has(data.animationType)) {
                    frameImages.set(data.animationType, new Map());
                  }
                  frameImages.get(data.animationType)!.set(data.frameIndex, data.imageData);
                }
              } catch {
                // ignore parse errors for partial chunks
              }
            }
          }
        }
      }

      // Build animations from collected image data
      if (frameImages.size > 0) {
        await buildAnimationsFromImages(frameImages);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  }

  /** Convert base64 images into pixel data and add as animations to the project */
  async function buildAnimationsFromImages(
    frameImages: Map<string, Map<number, string>>
  ) {
    const { addAnimation, setCurrentAnimation } = useProjectStore.getState();
    const w = canvasWidth;
    const h = canvasHeight;

    let firstAnim: import("@/types").Animation | null = null;

    for (const [animType, frames] of frameImages) {
      const template = getTemplate(animType as AnimationType);
      const sortedIndices = Array.from(frames.keys()).sort((a, b) => a - b);

      const builtFrames: import("@/types").Frame[] = [];

      for (const frameIndex of sortedIndices) {
        const base64 = frames.get(frameIndex)!;
        const pixelData = await base64ToPixelData(base64, w, h);

        builtFrames.push({
          id: uuid(),
          layers: [
            {
              id: uuid(),
              name: "Layer 1",
              data: pixelData,
              visible: true,
              opacity: 1,
              blendMode: "normal",
              width: w,
              height: h,
            },
          ],
          delay: template.defaultDelay,
          hitboxes: [],
        });
      }

      if (builtFrames.length > 0) {
        const anim: import("@/types").Animation = {
          id: uuid(),
          name: template.label,
          frames: builtFrames,
          loop: template.defaultLoop,
        };
        addAnimation(anim);
        if (!firstAnim) firstAnim = anim;
      }
    }

    // Switch to the first generated animation so the user sees results
    if (firstAnim) {
      setCurrentAnimation(firstAnim);
    }
  }

  /** Decode a base64 PNG into Uint8ClampedArray pixel data at exact canvas size */
  function base64ToPixelData(
    base64: string,
    w: number,
    h: number
  ): Promise<Uint8ClampedArray> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        resolve(new Uint8ClampedArray(imgData.data));
      };
      img.src = `data:image/png;base64,${base64}`;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Swords className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">Fighter Pack Generator</span>
      </div>

      {/* Fighter info */}
      <div>
        <Label>Fighter Name</Label>
        <Input
          value={fighterName}
          onChange={(e) => setFighterName(e.target.value)}
          placeholder="e.g. Shadow Ninja"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Description</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the fighter's appearance, style, colors..."
          className="mt-1 w-full h-20 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Provider</Label>
          <Select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            options={PROVIDERS}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Quality</Label>
          <Select
            value={quality}
            onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
            className="mt-1"
          />
        </div>
      </div>

      {/* Key frames only toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={keyFramesOnly}
          onChange={(e) => setKeyFramesOnly(e.target.checked)}
          className="accent-indigo-500"
        />
        <span className="text-xs text-zinc-300">
          Key frames only (saves cost, interpolate rest)
        </span>
      </label>

      {/* Animation selection */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Animations</Label>
          <button
            onClick={() =>
              setSelectedAnims(
                selectedAnims.length === ANIMATION_TEMPLATES.length
                  ? []
                  : ANIMATION_TEMPLATES.map((t) => t.type)
              )
            }
            className="text-[10px] text-indigo-400 hover:text-indigo-300"
          >
            {selectedAnims.length === ANIMATION_TEMPLATES.length ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ANIMATION_TEMPLATES.map((tmpl) => {
            const selected = selectedAnims.includes(tmpl.type);
            const progress = batchProgress.get(tmpl.type);
            const customCount = frameCountOverrides[tmpl.type] ?? tmpl.defaultFrameCount;

            return (
              <div
                key={tmpl.type}
                className={`rounded-md border transition-colors ${
                  selected
                    ? "bg-zinc-700/60 text-zinc-200 border-zinc-600"
                    : "bg-zinc-800/50 text-zinc-500 border-transparent"
                }`}
              >
                {/* Toggle row */}
                <button
                  onClick={() => !isGenerating && toggleAnim(tmpl.type)}
                  className="flex items-center gap-1.5 w-full px-2 pt-1.5 pb-0.5 text-xs"
                >
                  {progress !== undefined ? (
                    progress >= 100 ? (
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-400 shrink-0" />
                    )
                  ) : (
                    <div
                      className={`w-3 h-3 rounded-sm shrink-0 border ${
                        selected
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-zinc-600"
                      }`}
                    />
                  )}
                  <span className="truncate font-medium">{tmpl.label}</span>
                </button>

                {/* Frame stepper */}
                <div className="flex items-center justify-end gap-0.5 px-1.5 pb-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (customCount > 1) {
                        setFrameCountOverrides((prev) => ({ ...prev, [tmpl.type]: customCount - 1 }));
                      }
                    }}
                    disabled={isGenerating || customCount <= 1}
                    className="w-4 h-4 rounded flex items-center justify-center bg-zinc-800 hover:bg-zinc-600 text-zinc-400 transition-colors disabled:opacity-30"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <span className="w-5 text-center text-[10px] font-mono text-zinc-300 tabular-nums">
                    {customCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (customCount < 30) {
                        setFrameCountOverrides((prev) => ({ ...prev, [tmpl.type]: customCount + 1 }));
                      }
                    }}
                    disabled={isGenerating || customCount >= 30}
                    className="w-4 h-4 rounded flex items-center justify-center bg-zinc-800 hover:bg-zinc-600 text-zinc-400 transition-colors disabled:opacity-30"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                  <span className="text-[9px] text-zinc-500 ml-0.5">f</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost estimate */}
      <div className="bg-zinc-800 rounded-md p-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Estimated Total
          </span>
          <span className="text-zinc-200 font-medium">
            {formatCost(costEstimate.estimatedCost)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>
             {selectedAnims.length} animations, ~{costEstimate.generationCount} frames
          </span>
          <span>
            ~{costEstimate.generationCount} API calls
          </span>
        </div>
      </div>

      {/* Generate button */}
      <Button
        className="w-full"
        onClick={startGeneration}
        disabled={isGenerating || !fighterName.trim() || !description.trim() || selectedAnims.length === 0}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Pack...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Generate Fighter Pack
          </>
        )}
      </Button>

      {/* Overall progress */}
      {isGenerating && batchProgress.size > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Overall Progress</span>
            <span>
              {Array.from(batchProgress.values()).filter((v) => v >= 100).length}/
              {selectedAnims.length}
            </span>
          </div>
          <Progress
            value={
              (Array.from(batchProgress.values()).reduce((a, b) => a + b, 0) /
                (selectedAnims.length * 100)) *
              100
            }
          />
        </div>
      )}
    </div>
  );
}
