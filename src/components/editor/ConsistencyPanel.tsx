"use client";

import { useState, useCallback } from "react";
import { useProjectStore } from "@/stores/project-store";
import { enforcePalette } from "@/lib/fighter-pack/consistency";
import {
  evaluateAnimationConsistency,
} from "@/lib/ai/consistency-evaluator";
import {
  ConsistencyScoreBadge,
  AnimationConsistencyCard,
} from "@/components/consistency/ConsistencyReport";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  AnimationType,
  AnimationConsistencyResult,
  ConsistencyIssue,
  Color,
} from "@/types";
import {
  Loader2,
  ShieldCheck,
  Play,
} from "lucide-react";
import { extractDominantColors } from "@/lib/fighter-pack/consistency";
import { useSettingsStore } from "@/stores/settings-store";

export function ConsistencyPanel() {
  const currentAnimation = useProjectStore((s) => s.currentAnimation);
  const project = useProjectStore((s) => s.project);
  const settingsAnalysisModel = useSettingsStore((s) => s.analysisModel);

  const [referenceFrameIndex, setReferenceFrameIndex] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnimationConsistencyResult | null>(null);
  const [basePalette, setBasePalette] = useState<Color[]>([]);
  const [aiCheckingFrames, setAICheckingFrames] = useState<Set<string>>(new Set());

  const frames = currentAnimation?.frames ?? [];
  const canvasWidth = project?.canvasWidth ?? 64;
  const canvasHeight = project?.canvasHeight ?? 64;

  // Render a frame's layers to pixel data
  const renderFrameToPixelData = useCallback(
    (frameIndex: number): Uint8ClampedArray | null => {
      const frame = frames[frameIndex];
      if (!frame || frame.layers.length === 0) return null;
      // Use the first visible layer's data
      const layer = frame.layers.find((l) => l.visible) ?? frame.layers[0];
      return layer.data;
    },
    [frames]
  );

  // Convert frame layer data to base64 for display
  const frameToBase64 = useCallback(
    (frameIndex: number): string | undefined => {
      const data = renderFrameToPixelData(frameIndex);
      if (!data) return undefined;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d")!;
        const imageData = new ImageData(
          new Uint8ClampedArray(data),
          canvasWidth,
          canvasHeight
        );
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL("image/png").split(",")[1];
      } catch {
        return undefined;
      }
    },
    [renderFrameToPixelData, canvasWidth, canvasHeight]
  );

  async function runEvaluation() {
    if (frames.length < 2) return;
    setIsEvaluating(true);
    setProgress(0);
    setResult(null);

    try {
      const refData = renderFrameToPixelData(referenceFrameIndex);
      if (!refData) throw new Error("Could not read reference frame");

      setBasePalette(extractDominantColors(refData, 16));

      const frameInputs: { data: Uint8ClampedArray; frameIndex: number }[] = [];
      for (let i = 0; i < frames.length; i++) {
        if (i === referenceFrameIndex) continue;
        const data = renderFrameToPixelData(i);
        if (data) {
          frameInputs.push({ data, frameIndex: i });
        }
        setProgress(((i + 1) / frames.length) * 100);
      }

      const animType = (currentAnimation?.name?.toLowerCase() ?? "idle") as AnimationType;
      const evalResult = evaluateAnimationConsistency(
        frameInputs,
        refData,
        canvasWidth,
        canvasHeight,
        animType
      );

      setResult(evalResult);
    } catch (err) {
      console.error("Evaluation failed:", err);
    } finally {
      setIsEvaluating(false);
    }
  }

  // Auto-fix a frame
  function handleAutoFixFrame(animType: AnimationType, frameIndex: number) {
    if (basePalette.length === 0) return;
    const data = renderFrameToPixelData(frameIndex);
    if (!data) return;

    const palette = { id: "ref", name: "Reference Palette", colors: basePalette };
    const fixed = enforcePalette(data, palette);

    // Update the frame layer data in the project store
    const frame = frames[frameIndex];
    if (!frame) return;
    const layer = frame.layers.find((l) => l.visible) ?? frame.layers[0];
    if (!layer) return;

    const updateFrame = useProjectStore.getState().updateFrame;
    updateFrame(frame.id, {
      layers: frame.layers.map((l) =>
        l.id === layer.id ? { ...l, data: fixed } : l
      ),
    });

    // Clear result to prompt re-evaluation
    setResult(null);
  }

  // Auto-fix all frames with issues
  function handleAutoFixAll(animType: AnimationType) {
    if (!result || basePalette.length === 0) return;
    for (const fr of result.frameResults) {
      if (fr.issues.length > 0) {
        handleAutoFixFrame(animType, fr.frameIndex);
      }
    }
  }

  // AI check for a frame
  async function handleAICheckFrame(animType: AnimationType, frameIndex: number) {
    const key = `${animType}-${frameIndex}`;
    const refBase64 = frameToBase64(referenceFrameIndex);
    const frameBase64 = frameToBase64(frameIndex);
    if (!refBase64 || !frameBase64) return;

    setAICheckingFrames((prev) => new Set(prev).add(key));
    try {
      const response = await fetch("/api/ai/consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameImage: frameBase64,
          baseImage: refBase64,
          analysisModel: settingsAnalysisModel,
        }),
      });

      if (!response.ok) throw new Error("AI check failed");
      const data = await response.json();

      // Merge AI issues into result
      if (result) {
        setResult({
          ...result,
          frameResults: result.frameResults.map((fr) => {
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

  // Build frame images map
  const frameImages = new Map<number, string>();
  if (result) {
    for (const fr of result.frameResults) {
      const b64 = frameToBase64(fr.frameIndex);
      if (b64) frameImages.set(fr.frameIndex, b64);
    }
  }

  if (!currentAnimation) {
    return (
      <div className="text-center text-muted text-sm py-8">
        <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No animation selected. Select an animation to evaluate consistency.
      </div>
    );
  }

  if (frames.length < 2) {
    return (
      <div className="text-center text-muted text-sm py-8">
        <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Animation needs at least 2 frames for consistency evaluation.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Consistency Check</h3>
      </div>

      {/* Reference frame selector */}
      <div className="space-y-1">
        <label className="text-xs text-muted">Reference frame</label>
        <select
          value={referenceFrameIndex}
          onChange={(e) => setReferenceFrameIndex(Number(e.target.value))}
          className="w-full bg-surface border border-border rounded px-2 py-1 text-sm text-foreground"
        >
          {frames.map((_, i) => (
            <option key={i} value={i}>
              Frame {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Evaluate button */}
      <Button
        onClick={runEvaluation}
        disabled={isEvaluating}
        className="w-full"
        size="sm"
      >
        {isEvaluating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Evaluating...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Evaluate Consistency
          </>
        )}
      </Button>

      {/* Progress */}
      {isEvaluating && <Progress value={progress} className="h-1.5" />}

      {/* Palette preview */}
      {basePalette.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted">Ref palette:</span>
          <div className="flex gap-0.5">
            {basePalette.slice(0, 10).map((c, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm border border-border"
                style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ConsistencyScoreBadge score={result.averageScore} size="md" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {result.averageScore >= 0.85
                  ? "Good consistency"
                  : result.averageScore >= 0.7
                    ? "Minor issues"
                    : "Issues found"}
              </p>
              <p className="text-xs text-muted">
                {result.flaggedFrameCount} flagged of {result.frameResults.length} frames
              </p>
            </div>
          </div>

          <AnimationConsistencyCard
            result={result}
            frameImages={frameImages}
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
