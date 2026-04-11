import { NextRequest } from "next/server";
import { generateImage as openaiGenerate } from "@/lib/ai/openai-service";
import { generateImage as geminiGenerate } from "@/lib/ai/gemini-service";
import { analyzeSprite, isAnalysisAvailable } from "@/lib/ai/analysis-router";
import { buildGenerationQueue } from "@/lib/fighter-pack/generator";
import { describePaletteForPrompt } from "@/lib/fighter-pack/consistency";
import { extractPaletteFromBase64 } from "@/lib/ai/reference-analyzer";
import type { AIProvider, AnimationType, GeminiModel, OpenAIModel, AnalysisModel } from "@/types";

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
      frameCountOverrides,
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
      frameCountOverrides?: Partial<Record<AnimationType, number>>;
      analysisModel?: AnalysisModel;
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

    // ---- Character consistency: extract as much detail from the reference as possible ----
    let characterAnalysis = "";  // AI vision description (clothing, colors, proportions)
    let paletteDescription = ""; // Pixel-extracted hex color palette (always available)

    const selectedAnalysisModel: AnalysisModel = body.analysisModel ?? "gemini-2.5-flash";

    if (referenceImage) {
      // 1) Always extract the pixel palette — free, no API needed
      try {
        const { palette, width: palW, height: palH } = await extractPaletteFromBase64(referenceImage);
        paletteDescription = describePaletteForPrompt(palette, palW, palH);
      } catch (err) {
        console.warn("Could not extract pixel palette from reference:", err);
      }

      // 2) AI vision analysis for clothing/accessories
      if (isAnalysisAvailable(selectedAnalysisModel)) {
        try {
          characterAnalysis = await analyzeSprite(referenceImage, selectedAnalysisModel);
        } catch (err) {
          console.warn("Could not analyze base sprite for consistency:", err);
        }
      }
    }

    // Build the consistency instruction block injected into every frame prompt
    const consistencyParts: string[] = [];
    if (characterAnalysis) {
      consistencyParts.push(`EXACT CHARACTER APPEARANCE (must be preserved in every frame): ${characterAnalysis}`);
    }
    if (paletteDescription) {
      consistencyParts.push(paletteDescription);
    }
    const consistencyBlock = consistencyParts.length > 0
      ? ` ${consistencyParts.join(". ")}`
      : "";

    const baseDescription = `${characterStyle} character pixel art sprite: ${fighterName}. ${description}.${consistencyBlock} You MUST maintain identical character design, colors, clothing, and proportions across all frames — only the pose changes.`;
    const jobs = buildGenerationQueue(baseDescription, animations, keyFramesOnly, frameCountOverrides);

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
