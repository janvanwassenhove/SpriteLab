"use client";

import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";
import { v4 as uuid } from "uuid";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { EditorLayout } from "@/components/editor/EditorLayout";
import {
  loadWizardResult,
  deleteWizardResult,
  loadProjectFull,
  saveProjectFull,
} from "@/lib/storage/local-db";
import { ANIMATION_TEMPLATES } from "@/lib/fighter-pack/templates";
import { base64ToPixelData } from "@/utils";
import type { Animation, AnimationType, Frame, Layer } from "@/types";

interface WizardGeneratedFrame {
  animationType: AnimationType;
  frameIndex: number;
  imageData: string;
}

function EditorContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const width = parseInt(searchParams.get("w") ?? "64");
  const height = parseInt(searchParams.get("h") ?? "64");
  const name = searchParams.get("name") ?? "Untitled";

  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const initProject = useProjectStore((s) => s.initProject);
  const loadAnimations = useProjectStore((s) => s.loadAnimations);
  const setProject = useProjectStore((s) => s.setProject);
  const setCurrentAnimation = useProjectStore((s) => s.setCurrentAnimation);
  const loaded = useRef(false);

  // Load project: try IndexedDB first, then wizard data, then blank
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    setCanvasSize(width, height);

    (async () => {
      // 1. Try loading a previously saved project
      const saved = await loadProjectFull(projectId);
      if (saved) {
        setProject(saved);
        setCurrentAnimation(saved.animations[0] ?? null);
        setCanvasSize(saved.canvasWidth, saved.canvasHeight);
        return;
      }

      // 2. Initialize blank project as base
      initProject(projectId, name, width, height);

      // 3. Try loading wizard-generated frames
      const result = await loadWizardResult(projectId);
      if (!result) return;

      const wizardData = result as {
        frames: WizardGeneratedFrame[];
        animations: AnimationType[];
      };
      const { frames: genFrames, animations: animTypes } = wizardData;
      if (!genFrames?.length || !animTypes?.length) return;

      // Group frames by animation type
      const framesByType = new Map<AnimationType, WizardGeneratedFrame[]>();
      for (const frame of genFrames) {
        const existing = framesByType.get(frame.animationType) ?? [];
        existing.push(frame);
        framesByType.set(frame.animationType, existing);
      }

      // Convert to proper Animation objects
      const animations: Animation[] = [];
      for (const animType of animTypes) {
        const typeFrames = framesByType.get(animType) ?? [];
        typeFrames.sort((a, b) => a.frameIndex - b.frameIndex);
        const template = ANIMATION_TEMPLATES.find((t) => t.type === animType);

        const convertedFrames: Frame[] = await Promise.all(
          typeFrames.map(async (gf) => {
            const pixelData = await base64ToPixelData(gf.imageData, width, height);
            const layer: Layer = {
              id: uuid(),
              name: "Layer 1",
              data: pixelData,
              visible: true,
              opacity: 1,
              blendMode: "normal",
              width,
              height,
            };
            return {
              id: uuid(),
              layers: [layer],
              delay: template?.defaultDelay ?? 100,
            };
          })
        );

        if (convertedFrames.length > 0) {
          animations.push({
            id: uuid(),
            name: template?.label ?? animType,
            frames: convertedFrames,
            loop: template?.defaultLoop ?? "loop",
          });
        }
      }

      if (animations.length > 0) {
        loadAnimations(animations);
      }

      // Clean up temporary wizard data
      deleteWizardResult(projectId);
    })();
  }, [projectId, width, height, name, setCanvasSize, initProject, loadAnimations, setProject, setCurrentAnimation]);

  // Auto-save project to IndexedDB when project or current animation changes
  useEffect(() => {
    const saveTimeout = { current: null as ReturnType<typeof setTimeout> | null };

    const unsubscribe = useProjectStore.subscribe((state) => {
      // Debounce saves — write at most every 2 seconds
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (!state.project) return;

        // Sync current animation edits into project before saving
        const project = state.currentAnimation
          ? {
              ...state.project,
              animations: state.project.animations.map((a) =>
                a.id === state.currentAnimation!.id ? state.currentAnimation! : a
              ),
            }
          : state.project;

        saveProjectFull(project);
      }, 2000);
    });

    return () => {
      unsubscribe();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  return <EditorLayout />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-background flex items-center justify-center text-zinc-500">Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
