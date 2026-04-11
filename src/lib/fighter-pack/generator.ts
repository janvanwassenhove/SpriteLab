import type { AnimationType, FighterPackAnimationState } from "@/types";
import { ANIMATION_TEMPLATES, getTemplate } from "./templates";
import { buildAnimationPrompt, getKeyFrameIndices, type AnimationPromptOptions } from "@/lib/ai/prompt-builder";

export interface GenerationJob {
  animationType: AnimationType;
  frameIndex: number;
  totalFrames: number;
  prompt: string;
}

/**
 * Build the generation job queue for a fighter pack.
 */
export function buildGenerationQueue(
  baseDescription: string,
  animationTypes: AnimationType[],
  keyFramesOnly: boolean,
  frameCountOverrides?: Partial<Record<AnimationType, number>>,
  promptOptions?: AnimationPromptOptions,
): GenerationJob[] {
  const jobs: GenerationJob[] = [];

  for (const type of animationTypes) {
    const template = getTemplate(type);
    const totalFrames = frameCountOverrides?.[type] ?? template.defaultFrameCount;

    if (keyFramesOnly) {
      const keyIndices = getKeyFrameIndices(template.defaultFrameCount, totalFrames);
      for (const idx of keyIndices) {
        jobs.push({
          animationType: type,
          frameIndex: idx,
          totalFrames: template.defaultFrameCount,
          prompt: buildAnimationPrompt(baseDescription, type, idx, template.defaultFrameCount, promptOptions),
        });
      }
    } else {
      for (let i = 0; i < totalFrames; i++) {
        jobs.push({
          animationType: type,
          frameIndex: i,
          totalFrames,
          prompt: buildAnimationPrompt(baseDescription, type, i, totalFrames, promptOptions),
        });
      }
    }
  }

  return jobs;
}

/**
 * Get the initial animation states for a new fighter pack.
 */
export function createInitialAnimationStates(): FighterPackAnimationState[] {
  return ANIMATION_TEMPLATES.map((t) => ({
    type: t.type,
    status: "pending" as const,
    progress: 0,
  }));
}

/**
 * Calculate completion percentage for a fighter pack.
 */
export function calculateCompletion(animations: FighterPackAnimationState[]): number {
  if (animations.length === 0) return 0;
  const done = animations.filter((a) => a.status === "done").length;
  return Math.round((done / animations.length) * 100);
}
