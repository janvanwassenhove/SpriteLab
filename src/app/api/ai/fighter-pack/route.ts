import { NextRequest } from "next/server";
import { generateImage as openaiGenerate } from "@/lib/ai/openai-service";
import { generateImage as geminiGenerate } from "@/lib/ai/gemini-service";
import { analyzeSprite, isAnalysisAvailable } from "@/lib/ai/analysis-router";
import { buildGenerationQueue } from "@/lib/fighter-pack/generator";
import { describePaletteForPrompt } from "@/lib/fighter-pack/consistency";
import { extractPaletteFromBase64 } from "@/lib/ai/reference-analyzer";
import type { AIProvider, AnimationType, AnalysisModel } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fighterName,
      description,
      provider,
      quality,
      keyFramesOnly,
      animations,
      width,
      height,
      frameCountOverrides,
      baseCharacterImage,
    }: {
      fighterName: string;
      description: string;
      provider: AIProvider;
      quality: "low" | "medium" | "high";
      keyFramesOnly: boolean;
      animations: AnimationType[];
      width: number;
      height: number;
      frameCountOverrides?: Partial<Record<AnimationType, number>>;
      baseCharacterImage?: string;
      analysisModel?: AnalysisModel;
    } = body;

    if (!fighterName || !description || !animations?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ---- Character consistency: extract detail from reference ----
    let characterAnalysis = "";
    let paletteDescription = "";

    const selectedAnalysisModel: AnalysisModel = body.analysisModel ?? "gemini-2.5-flash";

    if (baseCharacterImage) {
      // 1) Pixel palette extraction (always available, no API needed)
      try {
        const { palette, width: palW, height: palH } = await extractPaletteFromBase64(baseCharacterImage);
        paletteDescription = describePaletteForPrompt(palette, palW, palH);
      } catch (err) {
        console.warn("Could not extract pixel palette from reference:", err);
      }

      // 2) AI vision analysis for clothing/accessories
      if (isAnalysisAvailable(selectedAnalysisModel)) {
        try {
          characterAnalysis = await analyzeSprite(baseCharacterImage, selectedAnalysisModel);
        } catch (err) {
          console.warn("Could not analyze base sprite for consistency:", err);
        }
      }
    }

    const baseDescription = `${fighterName}: ${description}`;
    const jobs = buildGenerationQueue(baseDescription, animations, keyFramesOnly, frameCountOverrides, {
      characterAppearance: characterAnalysis || undefined,
      paletteInfo: paletteDescription || undefined,
    });

    // Group jobs by animation type for progress tracking
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
              let imageData: string | null = null;

              try {
                if (provider === "openai") {
                  const results = await openaiGenerate(job.prompt, {
                    width: width || 1024,
                    height: height || 1024,
                    quality,
                    referenceImage: baseCharacterImage,
                  });
                  imageData = results[0]?.imageData ?? null;
                } else {
                  const result = await geminiGenerate(job.prompt, {
                    referenceImage: baseCharacterImage,
                  });
                  imageData = result.imageData ?? null;
                }
              } catch (err) {
                lastError = err instanceof Error ? err.message : "Frame generation failed";
                console.error(
                  `Failed to generate ${animType} frame ${job.frameIndex}:`,
                  err
                );
              }

              if (imageData) successCount++;

              const progress = Math.round(((i + 1) / animJobs.length) * 100);
              send({
                animationType: animType,
                frameIndex: job.frameIndex,
                totalFrames: job.totalFrames,
                imageData,
                progress,
                status: "generating",
              });
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
          console.error("Fighter pack stream error:", err);
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
      err instanceof Error ? err.message : "Fighter pack generation failed";
    console.error("Fighter pack error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
