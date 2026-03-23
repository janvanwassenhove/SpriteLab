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
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";

export function StepComplete() {
  const router = useRouter();
  const characterName = useWizardStore((s) => s.characterName);
  const artStyle = useWizardStore((s) => s.artStyle);
  const animationProgress = useWizardStore((s) => s.animationProgress);
  const generatedFrames = useWizardStore((s) => s.generatedFrames);
  const reset = useWizardStore((s) => s.reset);

  const spriteSize = getSpriteSize(artStyle);
  const completedAnims = animationProgress.filter((ap) => ap.status === "done");
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

  function openInEditor() {
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
    // Store generated frames for the editor to pick up
    localStorage.setItem(
      `wizard-result-${projectId}`,
      JSON.stringify({ frames: generatedFrames, animations: completedAnims.map((a) => a.type) })
    );
    reset();
    router.push(`/editor/${projectId}?w=${size}&h=${size}&name=${encodeURIComponent(characterName)}`);
  }

  function startOver() {
    reset();
    router.push("/wizard");
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Character Complete!</h2>
        <p className="text-zinc-400 text-sm">
          {characterName} is ready with {completedAnims.length} animations.
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
                <CheckCircle className="h-4 w-4 text-green-500 ml-auto shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button onClick={openInEditor}>
          <Edit3 className="h-4 w-4" />
          Open in Editor
        </Button>
        <Button variant="outline" onClick={startOver}>
          <RotateCcw className="h-4 w-4" />
          Create Another
        </Button>
      </div>
    </div>
  );
}
