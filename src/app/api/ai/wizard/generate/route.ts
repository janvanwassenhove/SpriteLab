import { NextRequest } from "next/server";
import { generateImage as openaiGenerate } from "@/lib/ai/openai-service";
import { generateImage as geminiGenerate, analyzeSprite } from "@/lib/ai/gemini-service";
import { buildGenerationQueue } from "@/lib/fighter-pack/generator";
import type { AIProvider, AnimationType, GeminiModel, OpenAIModel } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fighterName,
      description,
      characterStyle,
      provider,
      quality,
      keyFramesOnly,
      animations,
      width,
      height,
      referenceImage,
      geminiModel,
      openaiModel,
    }: {
      fighterName: string;
      description: string;
      characterStyle: string;
      provider: AIProvider;
      quality: "low" | "medium" | "high";
      keyFramesOnly: boolean;
      animations: AnimationType[];
      width: number;
      height: number;
      referenceImage?: string;
      geminiModel?: GeminiModel;
      openaiModel?: OpenAIModel;
    } = body;

    if (!fighterName || !description || !animations?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["openai", "gemini"].includes(provider)) {
      return new Response(
        JSON.stringify({ error: "Invalid provider" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const safeWidth = Math.min(Math.max(16, width || 64), 1024);
    const safeHeight = Math.min(Math.max(16, height || 64), 1024);

    // Analyze the base sprite to extract detailed character appearance for consistency
    let characterAnalysis = "";
    if (referenceImage) {
      try {
        characterAnalysis = await analyzeSprite(referenceImage);
      } catch (err) {
        console.warn("Could not analyze base sprite for consistency:", err);
      }
    }

    const consistencyDetails = characterAnalysis
      ? ` EXACT CHARACTER APPEARANCE (must be preserved in every frame): ${characterAnalysis}`
      : "";

    const baseDescription = `${characterStyle} character pixel art sprite: ${fighterName}. ${description}.${consistencyDetails} You MUST maintain identical character design, colors, clothing, and proportions across all frames — only the pose changes.`;
    const jobs = buildGenerationQueue(baseDescription, animations, keyFramesOnly);

    // Group jobs by animation type
    const jobsByAnim = new Map<string, typeof jobs>();
    for (const job of jobs) {
      const list = jobsByAnim.get(job.animationType) || [];
      list.push(job);
      jobsByAnim.set(job.animationType, list);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function send(data: Record<string, unknown>) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        try {
          for (const [animType, animJobs] of jobsByAnim) {
            send({ animationType: animType, progress: 0, status: "generating" });
            let successCount = 0;
            let lastError = "";

            for (let i = 0; i < animJobs.length; i++) {
              const job = animJobs[i];

              try {
                let frameData: string | undefined;

                if (provider === "openai") {
                  const results = await openaiGenerate(job.prompt, {
                    width: safeWidth,
                    height: safeHeight,
                    quality,
                    referenceImage: referenceImage ?? undefined,
                    model: openaiModel,
                  });
                  frameData = results[0]?.imageData;
                } else {
                  const result = await geminiGenerate(job.prompt, {
                    referenceImage: referenceImage ?? undefined,
                    model: geminiModel,
                  });
                  frameData = result.imageData;
                }

                if (frameData) successCount++;

                const progress = Math.round(((i + 1) / animJobs.length) * 100);
                send({
                  animationType: animType,
                  progress,
                  status: "generating",
                  frameIndex: job.frameIndex,
                  frameData: frameData ?? null,
                });
              } catch (err) {
                lastError = err instanceof Error ? err.message : "Frame generation failed";
                console.error(
                  `Failed to generate ${animType} frame ${job.frameIndex}:`,
                  lastError
                );
                const progress = Math.round(((i + 1) / animJobs.length) * 100);
                send({
                  animationType: animType,
                  progress,
                  status: "generating",
                  frameIndex: job.frameIndex,
                  error: lastError,
                });
              }
            }

            if (successCount === 0) {
              send({
                animationType: animType,
                progress: 100,
                status: "error",
                error: lastError || "No frames were generated",
              });
            } else {
              send({ animationType: animType, progress: 100, status: "done" });
            }
          }

          send({ complete: true });
        } catch (err) {
          console.error("Wizard generation stream error:", err);
          send({ error: "Generation failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Wizard generation failed";
    console.error("Wizard generation error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
