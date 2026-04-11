import { NextRequest } from "next/server";
import { analyzeSprite } from "@/lib/ai/analysis-router";
import type { AnalysisModel } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { frameImage, baseImage, analysisModel } = body as {
      frameImage?: string;
      baseImage?: string;
      analysisModel?: AnalysisModel;
    };

    if (!frameImage || !baseImage) {
      return new Response(
        JSON.stringify({ error: "Both frameImage and baseImage are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Limit base64 payload size (~10 MB each max)
    if (frameImage.length > 10_000_000 || baseImage.length > 10_000_000) {
      return new Response(
        JSON.stringify({ error: "Image data too large" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = analysisModel ?? "gemini-2.5-flash";

    const [baseAnalysis, frameAnalysis] = await Promise.all([
      analyzeSprite(baseImage, model),
      analyzeSprite(frameImage, model),
    ]);

    const issues = compareDescriptions(baseAnalysis, frameAnalysis);

    return new Response(
      JSON.stringify({ issues, baseAnalysis, frameAnalysis }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Consistency evaluation failed";
    const status =
      err instanceof Error && "status" in err
        ? (err as { status?: number }).status
        : undefined;
    console.error("AI consistency evaluation error:", message);
    return new Response(
      JSON.stringify({
        error:
          status === 429
            ? "API quota exceeded. Try a different analysis model in Settings, or wait and retry."
            : message,
      }),
      {
        status: status === 429 ? 429 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

interface SemanticIssue {
  type: "palette-drift" | "skin-tone-shift" | "outline-change" | "color-region-shift";
  severity: "low" | "medium" | "high";
  description: string;
  affectedRegion?: string;
}

function compareDescriptions(
  baseDesc: string,
  frameDesc: string
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  const baseLower = baseDesc.toLowerCase();
  const frameLower = frameDesc.toLowerCase();

  // Extract hex colors from descriptions
  const hexPattern = /#[0-9a-fA-F]{6}/g;
  const baseHexColors: string[] = Array.from(baseLower.match(hexPattern) ?? []);
  const frameHexColors: string[] = Array.from(frameLower.match(hexPattern) ?? []);

  // Check for significant color differences
  const uniqueToFrame = frameHexColors.filter((c) => !baseHexColors.includes(c));
  if (uniqueToFrame.length > 2) {
    issues.push({
      type: "palette-drift",
      severity: uniqueToFrame.length > 4 ? "high" : "medium",
      description: `AI detected ${uniqueToFrame.length} new colors in frame not present in base: ${uniqueToFrame.slice(0, 3).join(", ")}`,
    });
  }

  // Check for skin/body color keywords
  const skinKeywords = ["skin", "body", "flesh", "complexion"];
  for (const kw of skinKeywords) {
    const baseIdx = baseLower.indexOf(kw);
    const frameIdx = frameLower.indexOf(kw);
    if (baseIdx !== -1 && frameIdx !== -1) {
      const baseContext = baseLower.slice(baseIdx, baseIdx + 50);
      const frameContext = frameLower.slice(frameIdx, frameIdx + 50);
      const baseHex = baseContext.match(hexPattern);
      const frameHex = frameContext.match(hexPattern);
      if (baseHex?.[0] && frameHex?.[0] && baseHex[0] !== frameHex[0]) {
        issues.push({
          type: "skin-tone-shift",
          severity: "high",
          description: `AI detected skin color change: ${baseHex[0]} → ${frameHex[0]}`,
          affectedRegion: "skin/body",
        });
        break;
      }
    }
  }

  // Check for outline differences
  const outlineKeywords = ["outline", "border", "stroke"];
  for (const kw of outlineKeywords) {
    const inBase = baseLower.includes(kw);
    const inFrame = frameLower.includes(kw);
    if (inBase && !inFrame) {
      issues.push({
        type: "outline-change",
        severity: "medium",
        description: `AI detected outline style present in base but not described in frame`,
      });
      break;
    }
  }

  // Check for clothing/armor color shifts
  const clothingKeywords = ["clothing", "armor", "shirt", "pants", "boots", "gloves", "cape", "hat", "belt", "jacket"];
  for (const kw of clothingKeywords) {
    const baseIdx = baseLower.indexOf(kw);
    const frameIdx = frameLower.indexOf(kw);
    if (baseIdx !== -1 && frameIdx !== -1) {
      const baseContext = baseLower.slice(baseIdx, baseIdx + 60);
      const frameContext = frameLower.slice(frameIdx, frameIdx + 60);
      const baseHex = baseContext.match(hexPattern);
      const frameHex = frameContext.match(hexPattern);
      if (baseHex?.[0] && frameHex?.[0] && baseHex[0] !== frameHex[0]) {
        issues.push({
          type: "color-region-shift",
          severity: "medium",
          description: `AI detected ${kw} color change: ${baseHex[0]} → ${frameHex[0]}`,
          affectedRegion: kw,
        });
      }
    }
  }

  return issues;
}
