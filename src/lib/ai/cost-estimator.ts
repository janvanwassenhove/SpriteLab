import type { AIProvider, GeminiModel, OpenAIModel, CostEstimate, AnimationType } from "@/types";
import { ANIMATION_TEMPLATES } from "@/lib/fighter-pack/templates";
import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini-service";
import { OPENAI_MODELS, DEFAULT_OPENAI_MODEL } from "@/lib/ai/openai-service";

// Cost per generation by provider and quality
const COST_TABLE: Record<AIProvider, { low: number; medium: number; high: number }> = {
  openai: { low: 0.02, medium: 0.04, high: 0.08 },
  gemini: { low: 0.001, medium: 0.002, high: 0.005 }, // base fallback
  "stable-diffusion": { low: 0, medium: 0, high: 0 }, // local = free
};

export function estimateSingleCost(
  provider: AIProvider,
  quality: "low" | "medium" | "high" = "medium",
  geminiModel?: GeminiModel,
  openaiModel?: OpenAIModel
): number {
  if (provider === "gemini" && geminiModel) {
    return GEMINI_MODELS.find((m) => m.value === geminiModel)?.cost ?? COST_TABLE.gemini[quality];
  }
  if (provider === "openai" && openaiModel) {
    const model = OPENAI_MODELS.find((m) => m.value === openaiModel);
    return model?.cost[quality] ?? COST_TABLE.openai[quality];
  }
  return COST_TABLE[provider][quality];
}

export function estimateFighterPackCost(
  provider: AIProvider,
  animationTypes: AnimationType[],
  keyFramesOnly: boolean,
  quality: "low" | "medium" | "high" = "medium",
  geminiModel?: GeminiModel,
  openaiModel?: OpenAIModel,
  frameCountOverrides?: Partial<Record<AnimationType, number>>
): CostEstimate {
  const unitCost = estimateSingleCost(provider, quality, geminiModel, openaiModel);
  const breakdown: CostEstimate["breakdown"] = [];
  let totalCount = 0;

  for (const type of animationTypes) {
    const template = ANIMATION_TEMPLATES.find((t) => t.type === type);
    if (!template) continue;
    const baseCount = frameCountOverrides?.[type] ?? template.defaultFrameCount;
    const count = keyFramesOnly ? Math.min(baseCount, template.defaultFrameCount) : baseCount;
    totalCount += count;
    breakdown.push({
      label: template.label,
      count,
      unitCost,
      total: count * unitCost,
    });
  }

  return {
    provider,
    operationType: "batch",
    estimatedCost: totalCount * unitCost,
    generationCount: totalCount,
    breakdown,
  };
}

export function formatCost(cost: number): string {
  if (cost === 0) return "Free (local)";
  return `$${cost.toFixed(2)}`;
}

export { DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL };
