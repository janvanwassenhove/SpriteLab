import OpenAI from "openai";
import type { AIGenerationResult, OpenAIModel } from "@/types";
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
    const imageBuffer = Buffer.from(referenceImage, "base64");
    const imageFile = new File([imageBuffer], "reference.png", { type: "image/png" });

    const response = await client.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: `${spritePrompt} CRITICAL: Keep the EXACT same character — identical colors, clothing, accessories, body proportions, hair, and outline style. Only change the pose/action as described.`,
      size,
    });

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
    const response = await client.images.generate({
      model: "dall-e-2",
      prompt: spritePrompt,
      n: numVariations,
      size: "1024x1024",
      response_format: "b64_json",
    });

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

  const response = await client.images.generate({
    model,
    prompt: spritePrompt,
    n: numVariations,
    size,
    quality: model === "dall-e-3" ? (quality === "high" ? "hd" : "standard") : quality,
  });

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

  const imageBuffer = Buffer.from(imageBase64, "base64");
  const imageFile = new File([imageBuffer], "image.png", { type: "image/png" });

  const maskBuffer = Buffer.from(maskBase64, "base64");
  const maskFile = new File([maskBuffer], "mask.png", { type: "image/png" });

  const response = await client.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    mask: maskFile,
    prompt: buildSpritePrompt(prompt),
    size,
  });

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
  return `Pixel art sprite for a 2D fighting game. Side view, transparent background, clean pixel art style with clear outlines. ${userPrompt}`;
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
