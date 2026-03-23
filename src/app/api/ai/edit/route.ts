import { NextRequest, NextResponse } from "next/server";
import { editImage } from "@/lib/ai/openai-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      imageBase64,
      maskBase64,
      prompt,
      size,
    }: {
      imageBase64: string;
      maskBase64: string;
      prompt: string;
      size?: "1024x1024" | "1536x1024" | "1024x1536";
    } = body;

    if (!imageBase64 || !maskBase64 || !prompt) {
      return NextResponse.json(
        { error: "imageBase64, maskBase64, and prompt are required" },
        { status: 400 }
      );
    }

    if (typeof prompt !== "string" || prompt.length > 4000) {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }

    const result = await editImage(imageBase64, maskBase64, prompt, {
      size: size ?? "1024x1024",
    });

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Edit failed";
    console.error("AI edit error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
