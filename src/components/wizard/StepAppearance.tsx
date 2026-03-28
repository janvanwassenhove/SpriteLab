"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  useWizardStore,
  getSpriteSize,
  type ArtStyle,
} from "@/stores/wizard-store";
import { downscale, removeBackground, base64ToPixelData } from "@/lib/ai/pixelizer";
import { Loader2, RefreshCw, Sparkles, ImageIcon } from "lucide-react";

const ART_STYLES: { value: ArtStyle; label: string; size: string }[] = [
  { value: "pixel-16", label: "16x16 — Tiny", size: "16" },
  { value: "pixel-32", label: "32x32 — Small", size: "32" },
  { value: "pixel-64", label: "64x64 — Medium", size: "64" },
  { value: "pixel-128", label: "128x128 — Large", size: "128" },
];

export function StepAppearance() {
  const characterName = useWizardStore((s) => s.characterName);
  const characterDescription = useWizardStore((s) => s.characterDescription);
  const characterStyle = useWizardStore((s) => s.characterStyle);
  const artStyle = useWizardStore((s) => s.artStyle);
  const setArtStyle = useWizardStore((s) => s.setArtStyle);
  const baseSpriteVariants = useWizardStore((s) => s.baseSpriteVariants);
  const setBaseSpriteVariants = useWizardStore((s) => s.setBaseSpriteVariants);
  const selectedVariantIndex = useWizardStore((s) => s.selectedVariantIndex);
  const setSelectedVariantIndex = useWizardStore((s) => s.setSelectedVariantIndex);
  const setBaseSprite = useWizardStore((s) => s.setBaseSprite);
  const isGeneratingBase = useWizardStore((s) => s.isGeneratingBase);
  const setIsGeneratingBase = useWizardStore((s) => s.setIsGeneratingBase);
  const provider = useWizardStore((s) => s.provider);
  const geminiModel = useWizardStore((s) => s.geminiModel);
  const openaiModel = useWizardStore((s) => s.openaiModel);
  const uploadedImage = useWizardStore((s) => s.uploadedImage);
  const processedImage = useWizardStore((s) => s.processedImage);
  const setProcessedImage = useWizardStore((s) => s.setProcessedImage);
  const uploadPixelise = useWizardStore((s) => s.uploadPixelise);
  const uploadRemoveBg = useWizardStore((s) => s.uploadRemoveBg);

  const spriteSize = getSpriteSize(artStyle);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process uploaded image through pixelizer when settings change
  const processUploadedImage = useCallback(async () => {
    if (!uploadedImage) return;
    setIsProcessing(true);
    try {
      const { data, width, height } = await base64ToPixelData(uploadedImage);
      let processed = data;

      if (uploadPixelise) {
        processed = downscale(processed, width, height, spriteSize, spriteSize);
      }

      if (uploadRemoveBg) {
        const w = uploadPixelise ? spriteSize : width;
        const h = uploadPixelise ? spriteSize : height;
        processed = removeBackground(processed);
        // Convert back to base64
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        const copy = new Uint8ClampedArray(processed.length);
        copy.set(processed);
        const imageData = new ImageData(copy, w, h);
        ctx.putImageData(imageData, 0, 0);
        const base64 = canvas.toDataURL("image/png").split(",")[1];
        setProcessedImage(base64);
        setBaseSprite(base64);
      } else if (uploadPixelise) {
        // Convert downscaled data to base64
        const canvas = document.createElement("canvas");
        canvas.width = spriteSize;
        canvas.height = spriteSize;
        const ctx = canvas.getContext("2d")!;
        const copy2 = new Uint8ClampedArray(processed.length);
        copy2.set(processed);
        const imageData = new ImageData(copy2, spriteSize, spriteSize);
        ctx.putImageData(imageData, 0, 0);
        const base64 = canvas.toDataURL("image/png").split(",")[1];
        setProcessedImage(base64);
        setBaseSprite(base64);
      } else {
        // No processing, use original
        setProcessedImage(uploadedImage);
        setBaseSprite(uploadedImage);
      }
    } catch (err) {
      console.error("Image processing failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, uploadPixelise, uploadRemoveBg, spriteSize, setProcessedImage, setBaseSprite]);

  useEffect(() => {
    if (uploadedImage) {
      processUploadedImage();
    }
  }, [uploadedImage, uploadPixelise, uploadRemoveBg, artStyle, processUploadedImage]);

  const hasUpload = !!uploadedImage;

  async function generateBaseSprite() {
    if (isGeneratingBase) return;
    setIsGeneratingBase(true);

    try {
      const prompt = `Pixel art ${characterStyle} character sprite: ${characterName}. ${characterDescription}. Front-facing idle pose, centered on transparent background. ${spriteSize}x${spriteSize} pixel art style with clear outlines.`;

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider,
          quality: "high",
          width: spriteSize,
          height: spriteSize,
          geminiModel: provider === "gemini" ? geminiModel : undefined,
          openaiModel: provider === "openai" ? openaiModel : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await response.json();
      const results = data.results || [];
      const imageDataList = results
        .map((r: { imageData?: string }) => r.imageData)
        .filter(Boolean) as string[];

      if (imageDataList.length > 0) {
        setBaseSpriteVariants(imageDataList);
        setBaseSprite(imageDataList[0]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      alert(message);
    } finally {
      setIsGeneratingBase(false);
    }
  }

  function selectVariant(index: number) {
    setSelectedVariantIndex(index);
    setBaseSprite(baseSpriteVariants[index]);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Character Appearance</h2>
        <p className="text-zinc-400 text-sm">
          {hasUpload
            ? "Your uploaded image will be processed. Adjust sprite size below."
            : "Choose sprite size and generate your base character design."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-4">
          <div>
            <Label>Sprite Size</Label>
            <Select
              value={artStyle}
              onChange={(e) => setArtStyle(e.target.value as ArtStyle)}
              options={ART_STYLES.map((s) => ({ value: s.value, label: s.label }))}
              className="mt-1.5"
            />
            <p className="text-xs text-zinc-500 mt-1">
              {spriteSize}x{spriteSize} pixels per frame
            </p>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-zinc-300">Character Preview</p>
            <div className="text-xs text-zinc-500 space-y-1">
              <p><span className="text-zinc-400">Name:</span> {characterName || "—"}</p>
              <p><span className="text-zinc-400">Type:</span> {characterStyle}</p>
              <p className="line-clamp-3"><span className="text-zinc-400">Desc:</span> {characterDescription || "—"}</p>
              {hasUpload && (
                <p><span className="text-green-400">Source:</span> Uploaded image</p>
              )}
            </div>
          </div>

          {/* Show generate button OR upload processing status */}
          {hasUpload ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <ImageIcon className="h-4 w-4" />
                <span>Using uploaded image as base</span>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing image...</span>
                </div>
              )}
              <p className="text-xs text-zinc-500">
                You can still generate an AI variant below if you want.
              </p>
              <Button
                className="w-full"
                variant="outline"
                onClick={generateBaseSprite}
                disabled={isGeneratingBase || !characterName.trim()}
              >
                {isGeneratingBase ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating AI Variant...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate AI Variant Instead
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={generateBaseSprite}
              disabled={isGeneratingBase || !characterName.trim()}
            >
              {isGeneratingBase ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : baseSpriteVariants.length > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Base Character
                </>
              )}
            </Button>
          )}
        </div>

        {/* Right: Preview */}
        <div className="space-y-3">
          {/* Main preview */}
          <div className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 min-h-[280px]">
            {/* Show processed uploaded image OR generated variants */}
            {hasUpload && processedImage ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={`data:image/png;base64,${processedImage}`}
                  alt="Processed character"
                  className="max-w-full max-h-[240px]"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="text-xs text-zinc-500">Processed result</span>
              </div>
            ) : hasUpload && isProcessing ? (
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                <span className="text-sm">Processing your image...</span>
              </div>
            ) : baseSpriteVariants.length > 0 ? (
              <img
                src={`data:image/png;base64,${baseSpriteVariants[selectedVariantIndex]}`}
                alt="Base character"
                className="max-w-full max-h-[260px]"
                style={{ imageRendering: "pixelated" }}
              />
            ) : isGeneratingBase ? (
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                <span className="text-sm">Creating your character...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-600">
                <Sparkles className="h-10 w-10" />
                <span className="text-sm">Generate to see preview</span>
              </div>
            )}
          </div>

          {/* Variant thumbnails */}
          {baseSpriteVariants.length > 1 && (
            <div className="flex gap-2 justify-center">
              {baseSpriteVariants.map((variant, i) => (
                <button
                  key={i}
                  onClick={() => selectVariant(i)}
                  className={`w-16 h-16 rounded border-2 overflow-hidden bg-zinc-950 flex items-center justify-center transition-colors ${
                    i === selectedVariantIndex
                      ? "border-indigo-500"
                      : "border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <img
                    src={`data:image/png;base64,${variant}`}
                    alt={`Variant ${i + 1}`}
                    className="max-w-full max-h-full"
                    style={{ imageRendering: "pixelated" }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Original vs processed comparison for uploads */}
          {hasUpload && processedImage && (
            <div className="flex gap-3 justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded border border-zinc-700 bg-zinc-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={`data:image/png;base64,${uploadedImage}`}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <span className="text-xs text-zinc-500 mt-1 block">Original</span>
              </div>
              <div className="flex items-center text-zinc-600 text-xs">→</div>
              <div className="text-center">
                <div className="w-20 h-20 rounded border border-indigo-500/50 bg-zinc-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={`data:image/png;base64,${processedImage}`}
                    alt="Processed"
                    className="max-w-full max-h-full"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <span className="text-xs text-indigo-400 mt-1 block">Processed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
