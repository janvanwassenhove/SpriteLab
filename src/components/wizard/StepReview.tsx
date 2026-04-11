"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWizardStore, getSpriteSize } from "@/stores/wizard-store";
import { base64ToPixelData } from "@/lib/ai/pixelizer";
import { enforcePalette } from "@/lib/fighter-pack/consistency";
import {
  evaluateFullConsistency,
  type FrameInput,
} from "@/lib/ai/consistency-evaluator";
import {
  ConsistencyReportView,
} from "@/components/consistency/ConsistencyReport";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AnimationType, AnimationConsistencyResult, FrameConsistencyResult, ConsistencyIssue } from "@/types";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Loader2,
  CheckCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export function StepReview() {
  const artStyle = useWizardStore((s) => s.artStyle);
  const baseSprite = useWizardStore((s) => s.baseSprite);
  const generatedFrames = useWizardStore((s) => s.generatedFrames);
  const consistencyReport = useWizardStore((s) => s.consistencyReport);
  const isEvaluating = useWizardStore((s) => s.isEvaluating);
  const setConsistencyReport = useWizardStore((s) => s.setConsistencyReport);
  const settingsAnalysisModel = useSettingsStore((s) => s.analysisModel);
  const setIsEvaluating = useWizardStore((s) => s.setIsEvaluating);
  const nextStep = useWizardStore((s) => s.nextStep);
  const addGeneratedFrame = useWizardStore((s) => s.addGeneratedFrame);

  const spriteSize = getSpriteSize(artStyle);
  const evaluatedRef = useRef(false);

  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [regeneratingFrames] = useState<Set<string>>(new Set());
  const [aiCheckingFrames, setAICheckingFrames] = useState<Set<string>>(new Set());

  // Build frame image map for the report UI
  const frameImagesByAnim = useCallback(() => {
    const map = new Map<AnimationType, Map<number, string>>();
    for (const f of generatedFrames) {
      let animMap = map.get(f.animationType);
      if (!animMap) {
        animMap = new Map();
        map.set(f.animationType, animMap);
      }
      animMap.set(f.frameIndex, f.imageData);
    }
    return map;
  }, [generatedFrames])();

  // Run evaluation on mount (once)
  useEffect(() => {
    if (evaluatedRef.current || consistencyReport || generatedFrames.length === 0) return;
    evaluatedRef.current = true;
    runEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runEvaluation() {
    if (!baseSprite || generatedFrames.length === 0) return;
    setIsEvaluating(true);
    setEvaluationProgress(0);

    try {
      // Convert base sprite
      const basePixels = await base64ToPixelData(baseSprite);

      // Convert all frames to pixel data
      const frameInputs: FrameInput[] = [];
      for (let i = 0; i < generatedFrames.length; i++) {
        const f = generatedFrames[i];
        const pixels = await base64ToPixelData(f.imageData);
        frameInputs.push({
          animationType: f.animationType,
          frameIndex: f.frameIndex,
          data: pixels.data,
        });
        setEvaluationProgress(((i + 1) / generatedFrames.length) * 100);
      }

      // Run full consistency evaluation
      const report = evaluateFullConsistency(
        frameInputs,
        basePixels.data,
        spriteSize,
        spriteSize
      );

      setConsistencyReport(report);
    } catch (err) {
      console.error("Consistency evaluation failed:", err);
    } finally {
      setIsEvaluating(false);
    }
  }

  // Auto-fix a single frame by enforcing the base palette
  async function handleAutoFixFrame(animType: AnimationType, frameIndex: number) {
    if (!baseSprite || !consistencyReport) return;

    const frame = generatedFrames.find(
      (f) => f.animationType === animType && f.frameIndex === frameIndex
    );
    if (!frame) return;

    try {
      const framePixels = await base64ToPixelData(frame.imageData);
      const palette = {
        id: "base",
        name: "Base Palette",
        colors: consistencyReport.baseSpritePalette,
      };
      const fixed = enforcePalette(framePixels.data, palette);

      // Convert back to base64
      const canvas = document.createElement("canvas");
      canvas.width = framePixels.width;
      canvas.height = framePixels.height;
      const ctx = canvas.getContext("2d")!;
      const imageData = new ImageData(
        new Uint8ClampedArray(fixed),
        framePixels.width,
        framePixels.height
      );
      ctx.putImageData(imageData, 0, 0);
      const newBase64 = canvas.toDataURL("image/png").split(",")[1];

      // Update the frame in the store
      addGeneratedFrame({
        animationType: animType,
        frameIndex,
        imageData: newBase64,
      });

      // Re-run evaluation
      evaluatedRef.current = false;
      setConsistencyReport(null);
      // Trigger re-evaluation on next tick
      setTimeout(() => runEvaluation(), 100);
    } catch (err) {
      console.error("Auto-fix failed:", err);
    }
  }

  // Auto-fix all flagged frames for an animation
  async function handleAutoFixAll(animType: AnimationType) {
    if (!consistencyReport) return;
    const animResult = consistencyReport.animations.find(
      (a: AnimationConsistencyResult) => a.animationType === animType
    );
    if (!animResult) return;

    for (const fr of animResult.frameResults) {
      if (fr.overallScore < 0.7) {
        await handleAutoFixFrame(animType, fr.frameIndex);
      }
    }
  }

  // AI deep check for a single frame
  async function handleAICheck(animType: AnimationType, frameIndex: number) {
    if (!baseSprite) return;
    const frame = generatedFrames.find(
      (f) => f.animationType === animType && f.frameIndex === frameIndex
    );
    if (!frame) return;

    const key = `${animType}-${frameIndex}`;
    setAICheckingFrames((prev) => new Set(prev).add(key));

    try {
      const response = await fetch("/api/ai/consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameImage: frame.imageData,
          baseImage: baseSprite,
          analysisModel: settingsAnalysisModel,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "AI check failed");
      }

      const data = await response.json();

      // Merge AI issues into the report if we have one
      if (consistencyReport) {
        const updatedReport = { ...consistencyReport };
        updatedReport.animations = updatedReport.animations.map((a: AnimationConsistencyResult) => {
          if (a.animationType !== animType) return a;
          return {
            ...a,
            frameResults: a.frameResults.map((fr: FrameConsistencyResult) => {
              if (fr.frameIndex !== frameIndex) return fr;
              const newIssues: ConsistencyIssue[] = data.issues ?? [];
              return {
                ...fr,
                issues: [
                  ...fr.issues,
                  ...newIssues.filter(
                    (ni: ConsistencyIssue) =>
                      !fr.issues.some(
                        (ei: ConsistencyIssue) => ei.type === ni.type && ei.description === ni.description
                      )
                  ),
                ],
              };
            }),
          };
        });
        setConsistencyReport(updatedReport);
      }
    } catch (err) {
      console.error("AI consistency check failed:", err);
    } finally {
      setAICheckingFrames((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  // Re-run evaluation from scratch
  function handleReEvaluate() {
    evaluatedRef.current = false;
    setConsistencyReport(null);
    runEvaluation();
  }

  // No base sprite — can't evaluate
  if (!baseSprite) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface/50 border border-border/30 mb-4">
          <ShieldCheck className="h-8 w-8 text-muted" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Consistency Review</h2>
        <p className="text-muted text-sm">
          No base sprite available for comparison. Consistency evaluation requires a
          reference image. You can continue to the next step.
        </p>
        <Button onClick={nextStep}>
          Accept & Continue
          <CheckCircle className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/30 mb-4">
          <ShieldCheck className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Consistency Review</h2>
        <p className="text-muted text-sm">
          Evaluating character consistency across all generated animation frames.
        </p>
      </div>

      {/* Loading state */}
      {isEvaluating && (
        <div className="space-y-3 p-4 rounded-lg border border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span className="text-sm text-foreground">
              Analyzing {generatedFrames.length} frame(s)...
            </span>
          </div>
          <Progress value={evaluationProgress} className="h-2" />
        </div>
      )}

      {/* Report */}
      {consistencyReport && !isEvaluating && (
        <>
          <ConsistencyReportView
            report={consistencyReport}
            frameImagesByAnim={frameImagesByAnim}
            onAutoFixFrame={handleAutoFixFrame}
            onRegenerateFrame={undefined}
            onAICheckFrame={handleAICheck}
            onAutoFixAll={handleAutoFixAll}
            regeneratingFrames={regeneratingFrames}
            aiCheckingFrames={aiCheckingFrames}
          />

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={handleReEvaluate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-evaluate
            </Button>

            <Button onClick={nextStep}>
              Accept & Continue
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}

      {/* No frames */}
      {!isEvaluating && !consistencyReport && generatedFrames.length === 0 && (
        <div className="text-center text-muted text-sm">
          No generated frames to evaluate. Go back to generate animations first.
        </div>
      )}
    </div>
  );
}
