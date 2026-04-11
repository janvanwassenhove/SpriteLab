/**
 * Routes sprite analysis to the correct AI provider based on the chosen model.
 */
import type { AnalysisModel, GeminiAnalysisModel, OpenAIAnalysisModel } from "@/types";
import { analyzeSprite as geminiAnalyze, isGeminiAvailable } from "@/lib/ai/gemini-service";
import { analyzeSprite as openaiAnalyze, isOpenAIAvailable } from "@/lib/ai/openai-service";

const OPENAI_ANALYSIS_MODELS: Set<string> = new Set<string>(["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"]);

export function isAnalysisAvailable(model: AnalysisModel): boolean {
  if (OPENAI_ANALYSIS_MODELS.has(model)) return isOpenAIAvailable();
  return isGeminiAvailable();
}

export async function analyzeSprite(
  imageBase64: string,
  model: AnalysisModel
): Promise<string> {
  if (OPENAI_ANALYSIS_MODELS.has(model)) {
    return openaiAnalyze(imageBase64, model as OpenAIAnalysisModel);
  }
  return geminiAnalyze(imageBase64, model as GeminiAnalysisModel);
}
