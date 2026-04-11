"use client";

import { useEffect, useRef } from "react";
import { useWizardStore, getSpriteSize } from "@/stores/wizard-store";
import { useSettingsStore } from "@/stores/settings-store";
import { ANIMATION_TEMPLATES } from "@/lib/fighter-pack/templates";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Clock,
} from "lucide-react";

export function StepGenerate() {
  const characterName = useWizardStore((s) => s.characterName);
  const characterDescription = useWizardStore((s) => s.characterDescription);
  const characterStyle = useWizardStore((s) => s.characterStyle);
  const artStyle = useWizardStore((s) => s.artStyle);
  const provider = useWizardStore((s) => s.provider);
  const quality = useWizardStore((s) => s.quality);
  const selectedAnimations = useWizardStore((s) => s.selectedAnimations);
  const keyFramesOnly = useWizardStore((s) => s.keyFramesOnly);
  const baseSprite = useWizardStore((s) => s.baseSprite);
  const geminiModel = useWizardStore((s) => s.geminiModel);
  const openaiModel = useWizardStore((s) => s.openaiModel);
  const frameCountOverrides = useWizardStore((s) => s.frameCountOverrides);
  const isGenerating = useWizardStore((s) => s.isGenerating);
  const setIsGenerating = useWizardStore((s) => s.setIsGenerating);
  const settingsAnalysisModel = useSettingsStore((s) => s.analysisModel);
  const animationProgress = useWizardStore((s) => s.animationProgress);
  const initAnimationProgress = useWizardStore((s) => s.initAnimationProgress);
  const updateAnimationProgress = useWizardStore((s) => s.updateAnimationProgress);
  const addGeneratedFrame = useWizardStore((s) => s.addGeneratedFrame);
  const nextStep = useWizardStore((s) => s.nextStep);

  const startedRef = useRef(false);

  const spriteSize = getSpriteSize(artStyle);

  const doneCount = animationProgress.filter((ap) => ap.status === "done").length;
  const errorCount = animationProgress.filter((ap) => ap.status === "error").length;
  const totalCount = animationProgress.length;
  const allDone = totalCount > 0 && doneCount + errorCount === totalCount;
  const overallProgress =
    totalCount > 0
      ? animationProgress.reduce((sum, ap) => sum + ap.progress, 0) / totalCount
      : 0;

  async function startGeneration() {
    if (isGenerating || startedRef.current) return;
    startedRef.current = true;
    setIsGenerating(true);
    initAnimationProgress();

    try {
      const response = await fetch("/api/ai/wizard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fighterName: characterName,
          description: characterDescription,
          characterStyle,
          provider,
          quality,
          keyFramesOnly,
          animations: selectedAnimations,
          width: spriteSize,
          height: spriteSize,
          referenceImage: baseSprite,
          geminiModel: provider === "gemini" ? geminiModel : undefined,
          openaiModel: provider === "openai" ? openaiModel : undefined,
          frameCountOverrides,
          analysisModel: settingsAnalysisModel,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }

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
              if (data.animationType) {
                if (data.status === "done") {
                  updateAnimationProgress(data.animationType, {
                    status: "done",
                    progress: 100,
                  });
                } else if (data.status === "error") {
                  updateAnimationProgress(data.animationType, {
                    status: "error",
                    error: data.error,
                    progress: data.progress ?? 0,
                  });
                } else if (data.status === "generating") {
                  updateAnimationProgress(data.animationType, {
                    status: "generating",
                    progress: data.progress ?? 0,
                  });
                }

                if (data.frameData) {
                  addGeneratedFrame({
                    animationType: data.animationType,
                    frameIndex: data.frameIndex ?? 0,
                    imageData: data.frameData,
                  });
                }
              }
              if (data.complete) {
                // All done
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      alert(message);
    } finally {
      setIsGenerating(false);
      startedRef.current = false;
    }
  }

  // Auto-start is not used - user clicks "Start Generation"
  useEffect(() => {
    // Reset startedRef when component unmounts
    return () => {
      startedRef.current = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Generate Animations</h2>
        <p className="text-muted text-sm">
          {isGenerating
            ? "Generating your character's animations..."
            : allDone
              ? "Generation complete!"
              : "Ready to generate all selected animations."}
        </p>
      </div>

      {/* Start button */}
      {!isGenerating && !allDone && animationProgress.length === 0 && (
        <Button className="w-full h-12 text-base" onClick={startGeneration}>
          <Play className="h-5 w-5" />
          Start Generation ({selectedAnimations.length} animations)
        </Button>
      )}

      {/* Overall progress */}
      {(isGenerating || allDone) && (
        <div className="bg-surface/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isGenerating ? "Generating..." : "Complete"}
              </span>
            </div>
            <span className="text-xs text-muted">
              {doneCount}/{totalCount} animations
            </span>
          </div>
          <Progress value={overallProgress} />
        </div>
      )}

      {/* Per-animation progress */}
      {animationProgress.length > 0 && (
        <div className="space-y-2">
          {animationProgress.map((ap) => {
            const tmpl = ANIMATION_TEMPLATES.find((t) => t.type === ap.type);
            if (!tmpl) return null;

            return (
              <div
                key={ap.type}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  ap.status === "done"
                    ? "border-green-500/30 bg-green-500/5"
                    : ap.status === "error"
                      ? "border-red-500/30 bg-red-500/5"
                      : ap.status === "generating"
                        ? "border-accent/30 bg-accent/5"
                        : "border-border bg-surface/50"
                }`}
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {ap.status === "done" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : ap.status === "error" ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : ap.status === "generating" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{tmpl.label}</span>
                    <span className="text-xs text-muted">{Math.round(ap.progress)}%</span>
                  </div>
                  {ap.status === "generating" && (
                    <Progress value={ap.progress} className="mt-1.5 h-1.5" />
                  )}
                  {ap.status === "error" && (
                    <p className="text-xs text-red-400 mt-0.5">{ap.error}</p>
                  )}
                </div>

                {/* Frame previews */}
                {ap.frames.length > 0 && (
                  <div className="flex gap-1 shrink-0">
                    {ap.frames.slice(0, 3).map((frame, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded border border-border bg-surface-alt overflow-hidden flex items-center justify-center"
                      >
                        <img
                          src={`data:image/png;base64,${frame.imageData}`}
                          alt={`${tmpl.label} frame ${i}`}
                          className="max-w-full max-h-full"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Next button when done */}
      {allDone && (
        <Button className="w-full" onClick={nextStep}>
          <CheckCircle className="h-4 w-4" />
          Continue to Review
        </Button>
      )}
    </div>
  );
}
