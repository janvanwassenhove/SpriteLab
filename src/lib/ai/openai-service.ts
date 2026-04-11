import OpenAI from "openai";
import type { AIGenerationResult, OpenAIModel, OpenAIAnalysisModel } from "@/types";
import { v4 as uuidv4 } from "uuid";

export const OPENAI_MODELS: { value: OpenAIModel; label: string; description: string; cost: { low: number; medium: number; high: number } }[] = [
  {
    value: "gpt-image-1",
    label: "GPT Image 1",
    description: "Best quality — native image generation with editing support",
    cost: { low: 0.02, medium: 0.04, high: 0.08 },
  },
  {
    value: "dall-e-3",
    label: "DALL-E 3",
    description: "Fast, good quality — strong prompt following",
    cost: { low: 0.02, medium: 0.04, high: 0.08 },
  },
  {
    value: "dall-e-2",
    label: "DALL-E 2",
    description: "Budget option — lower cost, faster",
    cost: { low: 0.016, medium: 0.018, high: 0.02 },
  },
];

export const DEFAULT_OPENAI_MODEL: OpenAIModel = "gpt-image-1";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export async function generateImage(
  prompt: string,
  options: { width?: number; height?: number; quality?: "low" | "medium" | "high"; numVariations?: number; referenceImage?: string; model?: OpenAIModel } = {}
): Promise<AIGenerationResult[]> {
  const client = getClient();
  const { width = 1024, height = 1024, quality = "medium", numVariations = 1, referenceImage, model = "gpt-image-1" } = options;

  // Determine the closest supported size
  const size = pickSize(width, height);

  const spritePrompt = buildSpritePrompt(prompt);

  // If we have a reference image and gpt-image-1, use edit mode for consistency
  if (referenceImage && model === "gpt-image-1") {
    const rawBase64 = referenceImage.replace(/^data:image\/[^;]+;base64,/, "");
    const imageBuffer = Buffer.from(rawBase64, "base64");
    const imageFile = new File([imageBuffer], "reference.png", { type: "image/png" });

    const response = await withSafetyRetry((retryPrompt) =>
      client.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: `${retryPrompt} STRICT RULES: 1) IDENTICAL clothing/armor — same items, same colors. 2) IDENTICAL skin, hair, and eye colors. 3) IDENTICAL body proportions and outline. 4) Use ONLY colors from the reference. 5) ONLY change the pose/action as described. Do NOT modify the character's visual design. 6) Do NOT add any text, letters, words, numbers, labels, or watermarks — output only the character artwork.`,
        size,
      }),
      spritePrompt
    );

    const img = response.data?.[0];
    return [{
      id: uuidv4(),
      provider: "openai" as const,
      prompt: spritePrompt,
      imageData: img?.b64_json ?? "",
      width,
      height,
      cost: estimateCost(quality, numVariations),
      createdAt: new Date(),
    }];
  }

  // DALL-E models or no reference: standard generation
  if (model === "dall-e-2") {
    const response = await withSafetyRetry((retryPrompt) =>
      client.images.generate({
        model: "dall-e-2",
        prompt: retryPrompt,
        n: numVariations,
        size: "1024x1024",
        response_format: "b64_json",
      }),
      spritePrompt
    );

    return (response.data ?? []).map((img) => ({
      id: uuidv4(),
      provider: "openai" as const,
      prompt: spritePrompt,
      imageData: img.b64_json ?? "",
      width,
      height,
      cost: estimateCost(quality, numVariations),
      createdAt: new Date(),
    }));
  }

  const response = await withSafetyRetry((retryPrompt) =>
    client.images.generate({
      model,
      prompt: retryPrompt,
      n: numVariations,
      size,
      quality: model === "dall-e-3" ? (quality === "high" ? "hd" : "standard") : quality,
    }),
    spritePrompt
  );

  return (response.data ?? []).map((img) => ({
    id: uuidv4(),
    provider: "openai" as const,
    prompt: spritePrompt,
    imageData: img.b64_json ?? "",
    width,
    height,
    cost: estimateCost(quality, numVariations),
    createdAt: new Date(),
  }));
}

export async function editImage(
  imageBase64: string,
  maskBase64: string,
  prompt: string,
  options: { size?: "1024x1024" | "1536x1024" | "1024x1536" } = {}
): Promise<AIGenerationResult> {
  const client = getClient();
  const { size = "1024x1024" } = options;

  const rawImage = imageBase64.replace(/^data:image\/[^;]+;base64,/, "");
  const imageBuffer = Buffer.from(rawImage, "base64");
  const imageFile = new File([imageBuffer], "image.png", { type: "image/png" });

  const rawMask = maskBase64.replace(/^data:image\/[^;]+;base64,/, "");
  const maskBuffer = Buffer.from(rawMask, "base64");
  const maskFile = new File([maskBuffer], "mask.png", { type: "image/png" });

  const spritePrompt = buildSpritePrompt(prompt);
  const response = await withSafetyRetry((retryPrompt) =>
    client.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      mask: maskFile,
      prompt: retryPrompt,
      size,
    }),
    spritePrompt
  );

  const img = response.data?.[0];

  return {
    id: uuidv4(),
    provider: "openai",
    prompt,
    imageData: img?.b64_json ?? "",
    width: parseInt(size.split("x")[0]),
    height: parseInt(size.split("x")[1]),
    cost: estimateCost("medium", 1),
    createdAt: new Date(),
  };
}

function buildSpritePrompt(userPrompt: string): string {
  return `Pixel art sprite for a stylized 2D fighting game. Side view, transparent background, clean pixel art style with clear outlines. Non-graphic action only, no blood or injury detail. Do not include any text, letters, words, or labels in the image. ${userPrompt}`;
}

async function withSafetyRetry<T>(
  operation: (prompt: string) => Promise<T>,
  prompt: string
): Promise<T> {
  try {
    return await operation(prompt);
  } catch (error) {
    if (!isSafetyRejection(error)) {
      throw error;
    }

    const softenedPrompt = softenPromptForSafety(prompt);
    if (softenedPrompt === prompt) {
      throw error;
    }

    return operation(softenedPrompt);
  }
}

function isSafetyRejection(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("safety system") || message.includes("content_policy_violation");
}

function softenPromptForSafety(prompt: string): string {
  return prompt
    .replace(/\bpunch(?:ing)?\b/gi, "martial-arts arm motion")
    .replace(/\bkick(?:ing)?\b/gi, "martial-arts leg motion")
    .replace(/\battack\b/gi, "action pose")
    .replace(/\bbeing hit\b/gi, "reacting to contact")
    .replace(/\bhit\b/gi, "contact")
    .replace(/\bpain\b/gi, "strain")
    .replace(/\bknocked out\b/gi, "off-balance")
    .replace(/\bko\b/gi, "downed")
    .replace(/\bfalling to the ground\b/gi, "dropping into a grounded pose")
    .concat(" Keep the frame stylized, non-graphic, and suitable for a game sprite sheet.");
}

function pickSize(w: number, h: number): "1024x1024" | "1536x1024" | "1024x1536" {
  const ratio = w / h;
  if (ratio > 1.2) return "1536x1024";
  if (ratio < 0.8) return "1024x1536";
  return "1024x1024";
}

function estimateCost(quality: string, count: number): number {
  const perImage = quality === "high" ? 0.08 : quality === "medium" ? 0.04 : 0.02;
  return perImage * count;
}

const DEFAULT_OPENAI_ANALYSIS_MODEL: OpenAIAnalysisModel = "gpt-5.4-nano";
const MAX_ANALYSIS_RETRIES = 3;

export async function analyzeSprite(
  imageBase64: string,
  analysisModel?: OpenAIAnalysisModel
): Promise<string> {
  const client = getClient();
  const model = analysisModel ?? DEFAULT_OPENAI_ANALYSIS_MODEL;
  const rawBase64 = imageBase64.replace(/^data:image\/[^;]+;base64,/, "");

  const prompt = `Analyze this pixel art sprite character for animation consistency. Produce a STRICT visual reference in this exact format:

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

Be extremely precise with hex colors. Every visible element must be listed. Under 200 words.`;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ANALYSIS_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        max_completion_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${rawBase64}` },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err: unknown) {
      lastError = err;
      const status =
        err instanceof Error && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      if (status !== 429 && status !== 503) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
