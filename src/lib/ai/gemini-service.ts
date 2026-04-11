import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIGenerationResult, GeminiModel, GeminiAnalysisModel } from "@/types";
import { v4 as uuidv4 } from "uuid";

export const GEMINI_MODELS: { value: GeminiModel; label: string; description: string; cost: number }[] = [
  {
    value: "gemini-2.5-flash-image",
    label: "Nano Banana",
    description: "Stable & affordable — great for free-tier / budget use",
    cost: 0.001,
  },
  {
    value: "gemini-3.1-flash-image-preview",
    label: "Nano Banana 2",
    description: "Fast workhorse — optimised for speed and volume",
    cost: 0.002,
  },
  {
    value: "gemini-3-pro-image-preview",
    label: "Nano Banana Pro",
    description: "Flagship quality — Deep Thinking, photorealistic detail",
    cost: 0.008,
  },
];

export const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3.1-flash-image-preview";

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return apiKey;
}

function getClient() {
  return new GoogleGenerativeAI(getApiKey());
}

/**
 * Calls the Gemini REST API directly so we can pass responseModalities
 * (the @google/generative-ai SDK v0.24 strips unknown generationConfig fields).
 */
export async function generateImage(
  prompt: string,
  options: { referenceImage?: string; model?: GeminiModel } = {}
): Promise<AIGenerationResult> {
  const apiKey = getApiKey();
  const modelId = options.model ?? DEFAULT_GEMINI_MODEL;
  const spritePrompt = buildSpritePrompt(prompt);

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: spritePrompt },
  ];

  if (options.referenceImage) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: options.referenceImage,
      },
    });
    parts.push({
      text: `REFERENCE IMAGE ABOVE — This is the EXACT character you must draw. STRICT RULES:
1. IDENTICAL clothing/armor items — same pieces, same colors, same design
2. IDENTICAL skin color, hair style, hair color, eye style
3. IDENTICAL body proportions — same head-to-body ratio, limb thickness, overall size
4. IDENTICAL outline color and thickness
5. IDENTICAL color palette — use ONLY the colors present in the reference
6. ONLY change the POSE/ACTION as described in the text prompt
7. Do NOT add, remove, or modify any clothing, accessories, or visual features`,
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  interface GeminiPart {
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }

  const json = await res.json() as {
    candidates?: { content?: { parts?: GeminiPart[] } }[];
  };

  // Extract image from response
  let imageData = "";
  for (const candidate of json.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        break;
      }
    }
    if (imageData) break;
  }

  if (!imageData) {
    throw new Error("Gemini returned no image data. The model may not support image generation or the prompt was filtered.");
  }

  return {
    id: uuidv4(),
    provider: "gemini",
    prompt: spritePrompt,
    imageData,
    width: 1024,
    height: 1024,
    cost: GEMINI_MODELS.find((m) => m.value === modelId)?.cost ?? 0.002,
    createdAt: new Date(),
  };
}

const DEFAULT_ANALYSIS_MODEL: GeminiAnalysisModel = "gemini-2.5-flash";
const MAX_RETRIES = 3;

export async function analyzeSprite(
  imageBase64: string,
  analysisModel?: GeminiAnalysisModel
): Promise<string> {
  const client = getClient();
  const modelName = analysisModel ?? DEFAULT_ANALYSIS_MODEL;
  const model = client.getGenerativeModel({ model: modelName });

  const content = [
    {
      inlineData: {
        mimeType: "image/png" as const,
        data: imageBase64,
      },
    },
    {
      text: `Analyze this pixel art sprite character for animation consistency. Produce a STRICT visual reference in this exact format:

BODY: [head-to-body ratio, e.g. "3-head tall chibi" or "4-head proportion"], [build type, e.g. "lean", "stocky"]
SKIN: [exact hex color, e.g. #FFCC99]
HAIR: [style] in [hex color], [length/shape details]
EYES: [style/color]
HEAD GEAR: [item and hex color, or "none"]
UPPER BODY: [each clothing item with exact hex color, e.g. "blue plate chest armor #3355AA with gold trim #FFD700"]
LOWER BODY: [each clothing item with exact hex color, e.g. "brown leather pants #664422"]
FEET: [footwear with hex color]
ARMS/HANDS: [gloves/bracers/bare with colors]
ACCESSORIES: [weapons, capes, belts, jewelry — each with hex color]
OUTLINE: [color hex, thickness e.g. "1px black #000000"]

Be extremely precise with hex colors. Every visible element must be listed. Under 200 words.`,
    },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(content);
      return result.response.text();
    } catch (err: unknown) {
      lastError = err;
      const status =
        err instanceof Error && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      // Retry only on 429 (quota) or 503 (overloaded)
      if (status !== 429 && status !== 503) throw err;
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * Check whether a Gemini API key is available without throwing.
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function buildSpritePrompt(userPrompt: string): string {
  return `Create pixel art sprite for a 2D fighting game. Requirements: side view perspective, transparent background, clean pixel art style with visible individual pixels, clear outlines, limited color palette. ${userPrompt}`;
}
