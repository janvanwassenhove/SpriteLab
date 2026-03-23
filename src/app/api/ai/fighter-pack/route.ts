import { NextRequest } from "next/server";
import { generateImage as openaiGenerate } from "@/lib/ai/openai-service";
import { generateImage as geminiGenerate } from "@/lib/ai/gemini-service";
import { buildGenerationQueue } from "@/lib/fighter-pack/generator";
import type { AIProvider, AnimationType } from "@/types";

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
    }: {
      fighterName: string;
      description: string;
      provider: AIProvider;
      quality: "low" | "medium" | "high";
      keyFramesOnly: boolean;
      animations: AnimationType[];
      width: number;
      height: number;
    } = body;

    if (!fighterName || !description || !animations?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const baseDescription = `${fighterName}: ${description}`;
    const jobs = buildGenerationQueue(baseDescription, animations, keyFramesOnly);

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

            for (let i = 0; i < animJobs.length; i++) {
              const job = animJobs[i];
              let imageData: string | null = null;

              try {
                if (provider === "openai") {
                  const results = await openaiGenerate(job.prompt, {
                    width: width || 1024,
                    height: height || 1024,
                    quality,
                  });
                  imageData = results[0]?.imageData ?? null;
                } else {
                  const result = await geminiGenerate(job.prompt);
                  imageData = result.imageData ?? null;
                }
              } catch (err) {
                console.error(
                  `Failed to generate ${animType} frame ${job.frameIndex}:`,
                  err
                );
              }

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

            send({ animationType: animType, progress: 100, status: "done" });
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
