import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIGenerationResult, GeminiModel } from "@/types";
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
      text: "CRITICAL: The image above is the EXACT character you must draw. Your generated sprite MUST depict this SAME character with IDENTICAL colors, clothing, accessories, body proportions, hair, and outline style. Only change the pose/action as described in the prompt. Do NOT alter the character's appearance, outfit, color palette, or visual design in any way.",
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

export async function analyzeSprite(imageBase64: string): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: imageBase64,
      },
    },
    {
      text: "Analyze this pixel art sprite character for consistency reference. Describe PRECISELY in a single dense paragraph: 1) Every clothing/armor item and its exact color (use hex codes like #FF0000), 2) Skin/body color (hex), 3) Hair style & color (hex), 4) Eye color/style, 5) Any accessories, weapons, or distinguishing features, 6) Outline color and thickness, 7) Body proportions (head-to-body ratio, limb style). Be extremely specific about every visual detail so the character can be recreated identically in different poses. Under 150 words.",
    },
  ]);

  return result.response.text();
}

function buildSpritePrompt(userPrompt: string): string {
  return `Create pixel art sprite for a 2D fighting game. Requirements: side view perspective, transparent background, clean pixel art style with visible individual pixels, clear outlines, limited color palette. ${userPrompt}`;
}
