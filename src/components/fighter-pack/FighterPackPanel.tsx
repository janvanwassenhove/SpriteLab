"use client";

import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useProjectStore } from "@/stores/project-store";
import { useAIStore } from "@/stores/ai-store";
import { useEditorStore } from "@/stores/editor-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Minus,
  Plus,
  Swords,
  Gamepad2,
  Shield,
  SmilePlus,
  User,
  Monitor,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { ANIMATION_TEMPLATES, ANIMATION_TYPE_MAP, getTemplate } from "@/lib/fighter-pack/templates";
import { estimateFighterPackCost, formatCost } from "@/lib/ai/cost-estimator";
import { evaluateFullConsistency } from "@/lib/ai/consistency-evaluator";
import type { FrameInput } from "@/lib/ai/consistency-evaluator";
import { enforcePalette } from "@/lib/fighter-pack/consistency";
import { ConsistencyReportView } from "@/components/consistency/ConsistencyReport";
import type { AIProvider, AnimationType, CharacterStyle, ConsistencyReport, ConsistencyIssue } from "@/types";

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
];

const CHARACTER_STYLES: { value: CharacterStyle; label: string; icon: React.ElementType }[] = [
  { value: "fighter", label: "Fighter", icon: Swords },
  { value: "platformer", label: "Platformer", icon: Gamepad2 },
  { value: "rpg", label: "RPG", icon: Shield },
  { value: "chibi", label: "Chibi", icon: SmilePlus },
  { value: "realistic", label: "Realistic", icon: User },
  { value: "retro", label: "Retro", icon: Monitor },
];

export function FighterPackPanel() {
  const [characterStyle, setCharacterStyle] = useState<CharacterStyle>("fighter");
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [keyFramesOnly, setKeyFramesOnly] = useState(true);
  const [selectedAnims, setSelectedAnims] = useState<AnimationType[]>(
    ANIMATION_TYPE_MAP.fighter
  );
  const [frameCountOverrides, setFrameCountOverrides] = useState<Partial<Record<AnimationType, number>>>(
    {}
  );
  const [framePreviews, setFramePreviews] = useState<Map<string, string[]>>(new Map());
  const [errorAnims, setErrorAnims] = useState<Set<string>>(new Set());
  const [consistencyReport, setConsistencyReport] = useState<ConsistencyReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiCheckingFrames, setAICheckingFrames] = useState<Set<string>>(new Set());
  // Store raw pixel data per anim/frame for consistency evaluation & auto-fix
  const [generatedPixelData, setGeneratedPixelData] = useState<Map<string, Map<number, Uint8ClampedArray>>>(new Map());

  const isGenerating = useAIStore((s) => s.isGenerating);
  const batchProgress = useAIStore((s) => s.batchProgress);
  const setIsGenerating = useAIStore((s) => s.setIsGenerating);
  const updateBatchProgress = useAIStore((s) => s.updateBatchProgress);
  const baseCharacter = useAIStore((s) => s.baseCharacter);

  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const settingsAnalysisModel = useSettingsStore((s) => s.analysisModel);

  const costEstimate = estimateFighterPackCost(provider, selectedAnims, keyFramesOnly, quality, undefined, undefined, frameCountOverrides);

  /** Available animation templates filtered by current character style */
  const availableTemplates = ANIMATION_TEMPLATES.filter((t) =>
    ANIMATION_TYPE_MAP[characterStyle].includes(t.type)
  );

  function handleStyleChange(style: CharacterStyle) {
    setCharacterStyle(style);
    // Reset selected animations to the new style's defaults
    setSelectedAnims(ANIMATION_TYPE_MAP[style]);
  }

  function toggleAnim(type: AnimationType) {
    setSelectedAnims((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  // Derive effective name/description from base character
  const effectiveName = baseCharacter?.characterName || baseCharacter?.prompt || "";
  const effectiveDescription = baseCharacter?.prompt || "";

  async function startGeneration() {
    if (!effectiveName || !effectiveDescription || isGenerating) return;

    setIsGenerating(true);
    setFramePreviews(new Map());
    setErrorAnims(new Set());

    // Collect generated frame images keyed by animationType
    const frameImages = new Map<string, Map<number, string>>();

    try {
      const response = await fetch("/api/ai/fighter-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fighterName: effectiveName,
          description: effectiveDescription,
          provider,
          quality,
          keyFramesOnly,
          animations: selectedAnims,
          width: canvasWidth,
          height: canvasHeight,
          frameCountOverrides,
          baseCharacterImage: baseCharacter?.imageData ?? undefined,
          analysisModel: settingsAnalysisModel,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Pack generation failed");
      }

      // Stream progress and collect image data
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.animationType && data.progress !== undefined) {
                updateBatchProgress(data.animationType, data.progress);
              }
              // Track errors
              if (data.status === "error" && data.animationType) {
                setErrorAnims((prev) => new Set(prev).add(data.animationType));
              }
              // Collect image data for each frame
              if (data.imageData && data.animationType != null && data.frameIndex != null) {
                if (!frameImages.has(data.animationType)) {
                  frameImages.set(data.animationType, new Map());
                }
                frameImages.get(data.animationType)!.set(data.frameIndex, data.imageData);

                // Update preview thumbnails for display
                setFramePreviews((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(data.animationType) ?? [];
                  next.set(data.animationType, [...existing, data.imageData]);
                  return next;
                });
              }
            } catch {
              // ignore parse errors for partial chunks
            }
          }
        }
      }

      // Build animations from collected image data
      if (frameImages.size > 0) {
        const pixelDataMap = await buildAnimationsFromImages(frameImages);
        // Run consistency evaluation automatically
        if (pixelDataMap && baseCharacter?.imageData) {
          await runConsistencyEvaluation(pixelDataMap, baseCharacter.imageData);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  }

  /** Convert base64 images into pixel data and add as animations to the project.
   *  Returns a map of pixel data per animation type for consistency evaluation. */
  async function buildAnimationsFromImages(
    frameImages: Map<string, Map<number, string>>
  ): Promise<Map<string, Map<number, Uint8ClampedArray>>> {
    const { addAnimation, setCurrentAnimation } = useProjectStore.getState();
    const w = canvasWidth;
    const h = canvasHeight;

    let firstAnim: import("@/types").Animation | null = null;
    const pixelDataMap = new Map<string, Map<number, Uint8ClampedArray>>();

    for (const [animType, frames] of frameImages) {
      const template = getTemplate(animType as AnimationType);
      const sortedIndices = Array.from(frames.keys()).sort((a, b) => a - b);

      const builtFrames: import("@/types").Frame[] = [];
      const animPixelData = new Map<number, Uint8ClampedArray>();

      for (const frameIndex of sortedIndices) {
        const base64 = frames.get(frameIndex)!;
        const pixelData = await base64ToPixelData(base64, w, h);
        animPixelData.set(frameIndex, pixelData);

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

      pixelDataMap.set(animType, animPixelData);

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

    setGeneratedPixelData(pixelDataMap);

    // Switch to the first generated animation so the user sees results
    if (firstAnim) {
      setCurrentAnimation(firstAnim);
    }

    return pixelDataMap;
  }

  /** Run full consistency evaluation against the base character */
  async function runConsistencyEvaluation(
    pixelDataMap: Map<string, Map<number, Uint8ClampedArray>>,
    baseImageData: string
  ) {
    setIsEvaluating(true);
    setConsistencyReport(null);

    try {
      const w = canvasWidth;
      const h = canvasHeight;
      const basePixels = await base64ToPixelData(baseImageData, w, h);

      const allFrames: FrameInput[] = [];
      for (const [animType, frames] of pixelDataMap) {
        for (const [frameIndex, data] of frames) {
          allFrames.push({
            animationType: animType as AnimationType,
            frameIndex,
            data,
          });
        }
      }

      const report = evaluateFullConsistency(allFrames, basePixels, w, h);
      setConsistencyReport(report);
    } catch (err) {
      console.error("Consistency evaluation failed:", err);
    } finally {
      setIsEvaluating(false);
    }
  }

  /** Auto-fix a single frame by enforcing the base sprite palette */
  function handleAutoFixFrame(animType: AnimationType, frameIndex: number) {
    if (!consistencyReport) return;
    const palette = consistencyReport.baseSpritePalette;
    if (palette.length === 0) return;

    const animData = generatedPixelData.get(animType);
    const frameData = animData?.get(frameIndex);
    if (!frameData) return;

    const paletteObj = { id: "base", name: "Base Palette", colors: palette };
    const fixed = enforcePalette(frameData, paletteObj);

    // Update stored pixel data
    const newPixelData = new Map(generatedPixelData);
    const newAnimData = new Map(animData!);
    newAnimData.set(frameIndex, fixed);
    newPixelData.set(animType, newAnimData);
    setGeneratedPixelData(newPixelData);

    // Update the corresponding project animation frame
    const { project } = useProjectStore.getState();
    if (project) {
      const template = getTemplate(animType);
      const anim = project.animations.find((a) => a.name === template.label);
      // Map frame index to the sorted position in the animation
      if (anim) {
        const sortedIndices = Array.from(animData!.keys()).sort((a, b) => a - b);
        const position = sortedIndices.indexOf(frameIndex);
        const frame = anim.frames[position];
        if (frame) {
          const layer = frame.layers.find((l) => l.visible) ?? frame.layers[0];
          if (layer) {
            useProjectStore.getState().updateFrame(frame.id, {
              layers: frame.layers.map((l) =>
                l.id === layer.id ? { ...l, data: fixed } : l
              ),
            });
          }
        }
      }
    }

    // Re-evaluate
    if (baseCharacter?.imageData) {
      runConsistencyEvaluation(newPixelData, baseCharacter.imageData);
    }
  }

  /** Auto-fix all flagged frames */
  function handleAutoFixAll(animType: AnimationType) {
    if (!consistencyReport) return;
    const animResult = consistencyReport.animations.find((a) => a.animationType === animType);
    if (!animResult) return;
    for (const fr of animResult.frameResults) {
      if (fr.issues.length > 0) {
        handleAutoFixFrame(animType, fr.frameIndex);
      }
    }
  }

  /** AI deep check for a single frame */
  async function handleAICheckFrame(animType: AnimationType, frameIndex: number) {
    const key = `${animType}-${frameIndex}`;
    if (!baseCharacter?.imageData) return;

    const animData = generatedPixelData.get(animType);
    const frameData = animData?.get(frameIndex);
    if (!frameData) return;

    // Convert frame to base64
    const frameBase64 = pixelDataToBase64(frameData, canvasWidth, canvasHeight);
    if (!frameBase64) return;

    setAICheckingFrames((prev) => new Set(prev).add(key));
    try {
      const response = await fetch("/api/ai/consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameImage: frameBase64,
          baseImage: baseCharacter.imageData,
          analysisModel: settingsAnalysisModel,
        }),
      });

      if (!response.ok) throw new Error("AI check failed");
      const data = await response.json();

      // Merge AI issues into the report
      if (consistencyReport) {
        setConsistencyReport({
          ...consistencyReport,
          animations: consistencyReport.animations.map((anim) => {
            if (anim.animationType !== animType) return anim;
            return {
              ...anim,
              frameResults: anim.frameResults.map((fr) => {
                if (fr.frameIndex !== frameIndex) return fr;
                const newIssues: ConsistencyIssue[] = data.issues ?? [];
                return {
                  ...fr,
                  issues: [
                    ...fr.issues,
                    ...newIssues.filter(
                      (ni) =>
                        !fr.issues.some(
                          (ei) => ei.type === ni.type && ei.description === ni.description
                        )
                    ),
                  ],
                };
              }),
            };
          }),
        });
      }
    } catch (err) {
      console.error("AI check failed:", err);
    } finally {
      setAICheckingFrames((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  /** Convert pixel data to base64 PNG */
  function pixelDataToBase64(data: Uint8ClampedArray, w: number, h: number): string | null {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const imageData = new ImageData(new Uint8ClampedArray(data), w, h);
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL("image/png").split(",")[1];
    } catch {
      return null;
    }
  }

  /** Decode a base64 PNG into Uint8ClampedArray pixel data at exact canvas size */
  function base64ToPixelData(
    base64: string,
    w: number,
    h: number
  ): Promise<Uint8ClampedArray> {
    return new Promise((resolve, reject) => {
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
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = `data:image/png;base64,${base64}`;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Package className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">Animation Packs</span>
      </div>

      {/* Base character reference */}
      {baseCharacter ? (
        <div className="flex items-center gap-2 rounded-md border border-green-800 bg-green-950/40 px-2.5 py-1.5">
          <img
            src={`data:image/png;base64,${baseCharacter.imageData}`}
            alt="Base character"
            className="w-10 h-10 rounded border border-border"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Base character
            </span>
            <p className="text-[10px] text-muted truncate">{baseCharacter.prompt}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-amber-800 bg-amber-950/30 px-2.5 py-2 text-xs text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Generate a character in Character Concept first</span>
        </div>
      )}

      {/* Character type selector */}
      <div>
        <Label>Character Type</Label>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {CHARACTER_STYLES.map((style) => {
            const Icon = style.icon;
            const active = characterStyle === style.value;
            return (
              <button
                key={style.value}
                onClick={() => !isGenerating && handleStyleChange(style.value)}
                disabled={isGenerating}
                className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${
                  active
                    ? "bg-accent/30 border-accent text-accent"
                    : "bg-surface/50 border-border text-muted hover:border-muted hover:text-foreground"
                } disabled:opacity-50`}
              >
                <Icon className="h-3.5 w-3.5" />
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Character info is defined in the Character Concept tab */}

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
          className="accent-accent"
        />
        <span className="text-xs text-foreground">
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
                selectedAnims.length === availableTemplates.length
                  ? []
                  : availableTemplates.map((t) => t.type)
              )
            }
            className="text-[10px] text-accent hover:text-accent-hover"
          >
            {selectedAnims.length === availableTemplates.length ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {availableTemplates.map((tmpl) => {
            const selected = selectedAnims.includes(tmpl.type);
            const progress = batchProgress.get(tmpl.type);
            const customCount = frameCountOverrides[tmpl.type] ?? tmpl.defaultFrameCount;

            return (
              <div
                key={tmpl.type}
                className={`rounded-md border transition-colors ${
                  selected
                    ? "bg-surface-hover/60 text-foreground border-border"
                    : "bg-surface/50 text-muted border-transparent"
                }`}
              >
                {/* Toggle row */}
                <button
                  onClick={() => !isGenerating && toggleAnim(tmpl.type)}
                  className="flex items-center gap-1.5 w-full px-2 pt-1.5 pb-0.5 text-xs"
                >
                  {progress !== undefined ? (
                    progress >= 100 ? (
                      errorAnims.has(tmpl.type) ? (
                        <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                      ) : (
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                      )
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin text-accent shrink-0" />
                    )
                  ) : (
                    <div
                      className={`w-3 h-3 rounded-sm shrink-0 border ${
                        selected
                          ? "bg-accent border-accent"
                          : "border-border"
                      }`}
                    />
                  )}
                  <span className="truncate font-medium">{tmpl.label}</span>
                </button>

                {/* Generated frame thumbnails */}
                {(framePreviews.get(tmpl.type)?.length ?? 0) > 0 && (
                  <div className="flex gap-0.5 px-1.5 pb-1">
                    {framePreviews.get(tmpl.type)!.slice(0, 4).map((b64, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded border border-border bg-surface-alt overflow-hidden flex items-center justify-center"
                      >
                        <img
                          src={`data:image/png;base64,${b64}`}
                          alt={`${tmpl.label} frame ${i}`}
                          className="max-w-full max-h-full"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                    ))}
                    {(framePreviews.get(tmpl.type)?.length ?? 0) > 4 && (
                      <span className="text-[9px] text-muted self-center">+{framePreviews.get(tmpl.type)!.length - 4}</span>
                    )}
                  </div>
                )}

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
                    className="w-4 h-4 rounded flex items-center justify-center bg-surface hover:bg-surface-hover text-muted transition-colors disabled:opacity-30"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <span className="w-5 text-center text-[10px] font-mono text-foreground tabular-nums">
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
                    className="w-4 h-4 rounded flex items-center justify-center bg-surface hover:bg-surface-hover text-muted transition-colors disabled:opacity-30"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                  <span className="text-[9px] text-muted ml-0.5">f</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost estimate */}
      <div className="bg-surface rounded-md p-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Estimated Total
          </span>
          <span className="text-foreground font-medium">
            {formatCost(costEstimate.estimatedCost)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted">
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
        disabled={isGenerating || !effectiveName || !effectiveDescription || selectedAnims.length === 0}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Pack...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Generate Pack
          </>
        )}
      </Button>

      {/* Overall progress */}
      {isGenerating && batchProgress.size > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-muted mb-1">
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

      {/* Consistency evaluation loading */}
      {isEvaluating && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-3">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-sm text-muted">Evaluating consistency...</span>
        </div>
      )}

      {/* Consistency report */}
      {consistencyReport && !isGenerating && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Consistency Report</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                if (baseCharacter?.imageData && generatedPixelData.size > 0) {
                  runConsistencyEvaluation(generatedPixelData, baseCharacter.imageData);
                }
              }}
              disabled={isEvaluating}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isEvaluating ? "animate-spin" : ""}`} />
              Re-evaluate
            </Button>
          </div>

          <ConsistencyReportView
            report={consistencyReport}
            frameImagesByAnim={(() => {
              const map = new Map<AnimationType, Map<number, string>>();
              for (const [animType, frames] of generatedPixelData) {
                const frameMap = new Map<number, string>();
                for (const [frameIndex, data] of frames) {
                  const b64 = pixelDataToBase64(data, canvasWidth, canvasHeight);
                  if (b64) frameMap.set(frameIndex, b64);
                }
                map.set(animType as AnimationType, frameMap);
              }
              return map;
            })()}
            onAutoFixFrame={handleAutoFixFrame}
            onAICheckFrame={handleAICheckFrame}
            onAutoFixAll={handleAutoFixAll}
            aiCheckingFrames={aiCheckingFrames}
          />
        </div>
      )}
    </div>
  );
}
