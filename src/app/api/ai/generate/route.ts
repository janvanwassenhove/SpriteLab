import { NextRequest, NextResponse } from "next/server";
import { generateImage as openaiGenerate } from "@/lib/ai/openai-service";
import { generateImage as geminiGenerate } from "@/lib/ai/gemini-service";
import type { AIProvider, GeminiModel, OpenAIModel } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      provider,
      quality,
      referenceImage,
      width,
      height,
      geminiModel,
      openaiModel,
    }: {
      prompt: string;
      provider: AIProvider;
      quality?: "low" | "medium" | "high";
      referenceImage?: string;
      width?: number;
      height?: number;
      geminiModel?: GeminiModel;
      openaiModel?: OpenAIModel;
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.length > 4000) {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }

    if (!provider || !["openai", "gemini"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    if (provider === "openai") {
      const results = await openaiGenerate(prompt, {
        width: width ?? 1024,
        height: height ?? 1024,
        quality: quality ?? "medium",
        referenceImage: referenceImage ?? undefined,
        model: openaiModel,
      });
      return NextResponse.json({ results });
    }

    // Gemini
    const result = await geminiGenerate(prompt, {
      referenceImage: referenceImage ?? undefined,
      model: geminiModel,
    });
    return NextResponse.json({ results: [result] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("AI generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
