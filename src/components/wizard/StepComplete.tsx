"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { useWizardStore, getSpriteSize } from "@/stores/wizard-store";
import { ANIMATION_TEMPLATES } from "@/lib/fighter-pack/templates";
import { Button } from "@/components/ui/button";
import type { AnimationType } from "@/types";
import {
  CheckCircle,
  Download,
  Edit3,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { saveWizardResult } from "@/lib/storage/local-db";

export function StepComplete() {
  const router = useRouter();
  const characterName = useWizardStore((s) => s.characterName);
  const characterDescription = useWizardStore((s) => s.characterDescription);
  const characterStyle = useWizardStore((s) => s.characterStyle);
  const artStyle = useWizardStore((s) => s.artStyle);
  const provider = useWizardStore((s) => s.provider);
  const quality = useWizardStore((s) => s.quality);
  const keyFramesOnly = useWizardStore((s) => s.keyFramesOnly);
  const baseSprite = useWizardStore((s) => s.baseSprite);
  const geminiModel = useWizardStore((s) => s.geminiModel);
  const openaiModel = useWizardStore((s) => s.openaiModel);
  const animationProgress = useWizardStore((s) => s.animationProgress);
  const generatedFrames = useWizardStore((s) => s.generatedFrames);
  const updateAnimationProgress = useWizardStore((s) => s.updateAnimationProgress);
  const addGeneratedFrame = useWizardStore((s) => s.addGeneratedFrame);
  const regenerateAnimation = useWizardStore((s) => s.regenerateAnimation);
  const reset = useWizardStore((s) => s.reset);

  const [regeneratingAnim, setRegeneratingAnim] = useState<AnimationType | null>(null);

  const spriteSize = getSpriteSize(artStyle);
  const completedAnims = animationProgress.filter(
    (ap) => ap.status === "done" || ap.status === "generating"
  );
  const stableCompletedAnims = animationProgress.filter((ap) => ap.status === "done");
  const [previewAnim, setPreviewAnim] = useState<AnimationType | null>(
    completedAnims[0]?.type ?? null
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const previewFrames = generatedFrames.filter(
    (f) => f.animationType === previewAnim
  );

  const animatePreview = useCallback(() => {
    if (!isPlaying || previewFrames.length === 0) return;
    const tmpl = ANIMATION_TEMPLATES.find((t) => t.type === previewAnim);
    const delay = tmpl?.defaultDelay ?? 100;

    intervalRef.current = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % previewFrames.length);
    }, delay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, previewFrames.length, previewAnim]);

  useEffect(() => {
    const cleanup = animatePreview();
    return cleanup;
  }, [animatePreview]);

  async function openInEditor() {
    const projectId = uuid();
    const size = spriteSize;
    const entries = JSON.parse(localStorage.getItem("sprite-projects") ?? "[]");
    entries.unshift({
      id: projectId,
      name: characterName,
      width: size,
      height: size,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("sprite-projects", JSON.stringify(entries));
    // Store generated frames in IndexedDB (too large for localStorage)
    await saveWizardResult(projectId, {
      frames: generatedFrames,
      animations: stableCompletedAnims.map((a) => a.type),
    });
    reset();
    router.push(`/editor/${projectId}?w=${size}&h=${size}&name=${encodeURIComponent(characterName)}`);
  }

  function startOver() {
    reset();
    router.push("/wizard");
  }

  async function handleRegenerateAnimation(animType: AnimationType) {
    if (regeneratingAnim) return;
    setRegeneratingAnim(animType);
    regenerateAnimation(animType);
    updateAnimationProgress(animType, { status: "generating", progress: 0 });

    // If the preview was showing this animation, reset frame index
    if (previewAnim === animType) setCurrentFrameIdx(0);

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
          animations: [animType],
          width: spriteSize,
          height: spriteSize,
          referenceImage: baseSprite ?? undefined,
          geminiModel: provider === "gemini" ? geminiModel : undefined,
          openaiModel: provider === "openai" ? openaiModel : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Regeneration failed");
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
              if (data.animationType === animType) {
                if (data.status === "done") {
                  updateAnimationProgress(animType, { status: "done", progress: 100 });
                } else if (data.status === "error") {
                  updateAnimationProgress(animType, {
                    status: "error",
                    error: data.error,
                    progress: data.progress ?? 0,
                  });
                } else if (data.status === "generating") {
                  updateAnimationProgress(animType, {
                    status: "generating",
                    progress: data.progress ?? 0,
                  });
                }

                if (data.frameData) {
                  addGeneratedFrame({
                    animationType: animType,
                    frameIndex: data.frameIndex ?? 0,
                    imageData: data.frameData,
                  });
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Regeneration failed";
      updateAnimationProgress(animType, { status: "error", error: message });
    } finally {
      setRegeneratingAnim(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Character Complete!</h2>
        <p className="text-zinc-400 text-sm">
          {characterName} is ready with {stableCompletedAnims.length} animations.
        </p>
      </div>

      {/* Animation preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 h-64">
            {previewFrames.length > 0 && previewFrames[currentFrameIdx] ? (
              <img
                src={`data:image/png;base64,${previewFrames[currentFrameIdx].imageData}`}
                alt={`${previewAnim} preview`}
                className="max-w-full max-h-[240px]"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <span className="text-sm text-zinc-600">Select an animation to preview</span>
            )}
          </div>
          {previewFrames.length > 0 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <span className="text-xs text-zinc-500">
                Frame {currentFrameIdx + 1}/{previewFrames.length}
              </span>
            </div>
          )}
        </div>

        {/* Animation list */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {completedAnims.map((ap) => {
            const tmpl = ANIMATION_TEMPLATES.find((t) => t.type === ap.type);
            if (!tmpl) return null;
            const frames = generatedFrames.filter((f) => f.animationType === ap.type);
            const isActive = previewAnim === ap.type;

            return (
              <button
                key={ap.type}
                onClick={() => {
                  setPreviewAnim(ap.type);
                  setCurrentFrameIdx(0);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  isActive
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-700 bg-zinc-800/30 hover:border-zinc-600"
                }`}
              >
                {/* Thumbnail */}
                {frames[0] && (
                  <div className="w-10 h-10 rounded border border-zinc-700 bg-zinc-950 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={`data:image/png;base64,${frames[0].imageData}`}
                      alt={tmpl.label}
                      className="max-w-full max-h-full"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-sm font-medium text-zinc-200">{tmpl.label}</span>
                  <p className="text-xs text-zinc-500">{frames.length} frames</p>
                </div>
                {ap.status === "generating" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400 ml-auto shrink-0" />
                ) : (
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={`Regenerate ${tmpl.label}`}
                      disabled={regeneratingAnim !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerateAnimation(ap.type);
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-200" />
                    </Button>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button onClick={openInEditor} disabled={regeneratingAnim !== null}>
          <Edit3 className="h-4 w-4" />
          Open in Editor
        </Button>
        <Button variant="outline" onClick={startOver} disabled={regeneratingAnim !== null}>
          <RotateCcw className="h-4 w-4" />
          Create Another
        </Button>
      </div>
    </div>
  );
}
