"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAIStore } from "@/stores/ai-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, DollarSign, Image as ImageIcon, CheckCircle, X, Upload } from "lucide-react";
import type { AIProvider, GeminiModel, OpenAIModel, SpriteSize } from "@/types";
import { SPRITE_SIZES } from "@/types";
import { estimateSingleCost, formatCost } from "@/lib/ai/cost-estimator";
import { GEMINI_MODELS } from "@/lib/ai/gemini-service";
import { OPENAI_MODELS } from "@/lib/ai/openai-service";
import { downscale, removeBackground, base64ToPixelData } from "@/lib/ai/pixelizer";

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI (gpt-image-1)" },
  { value: "gemini", label: "Google Gemini" },
];

const QUALITIES = [
  { value: "low", label: "Low (fast)" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High (best)" },
];

export function GenerationPanel() {
  const [characterName, setCharacterName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadPixelise, setUploadPixelise] = useState(true);
  const [uploadRemoveBg, setUploadRemoveBg] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGenerating = useAIStore((s) => s.isGenerating);
  const generationProgress = useAIStore((s) => s.generationProgress);
  const setIsGenerating = useAIStore((s) => s.setIsGenerating);
  const setGenerationProgress = useAIStore((s) => s.setGenerationProgress);
  const addToHistory = useAIStore((s) => s.addToHistory);
  const history = useAIStore((s) => s.history);
  const baseCharacter = useAIStore((s) => s.baseCharacter);
  const setBaseCharacter = useAIStore((s) => s.setBaseCharacter);
  const clearBaseCharacter = useAIStore((s) => s.clearBaseCharacter);
  const geminiModel = useAIStore((s) => s.geminiModel);
  const setGeminiModel = useAIStore((s) => s.setGeminiModel);
  const openaiModel = useAIStore((s) => s.openaiModel);
  const setOpenaiModel = useAIStore((s) => s.setOpenaiModel);

  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);

  const cost = estimateSingleCost(provider, quality, provider === "gemini" ? geminiModel : undefined, provider === "openai" ? openaiModel : undefined);

  // Process uploaded image through pixelizer when settings change
  const processUploadedImage = useCallback(async () => {
    if (!uploadedImageBase64) return;
    try {
      const { data, width, height } = await base64ToPixelData(uploadedImageBase64);
      let processed = data;

      if (uploadPixelise) {
        processed = downscale(processed, width, height, canvasWidth, canvasHeight);
      }

      if (uploadRemoveBg) {
        const w = uploadPixelise ? canvasWidth : width;
        const h = uploadPixelise ? canvasHeight : height;
        processed = removeBackground(processed);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        const copy = new Uint8ClampedArray(processed.length);
        copy.set(processed);
        const imageData = new ImageData(copy, w, h);
        ctx.putImageData(imageData, 0, 0);
        const base64 = canvas.toDataURL("image/png").split(",")[1];
        setReferenceImage(`data:image/png;base64,${base64}`);
      } else if (uploadPixelise) {
        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d")!;
        const copy = new Uint8ClampedArray(processed.length);
        copy.set(processed);
        const imageData = new ImageData(copy, canvasWidth, canvasHeight);
        ctx.putImageData(imageData, 0, 0);
        const base64 = canvas.toDataURL("image/png").split(",")[1];
        setReferenceImage(`data:image/png;base64,${base64}`);
      } else {
        setReferenceImage(`data:image/png;base64,${uploadedImageBase64}`);
      }
    } catch (err) {
      console.error("Image processing failed:", err);
    }
  }, [uploadedImageBase64, uploadPixelise, uploadRemoveBg, canvasWidth, canvasHeight]);

  useEffect(() => {
    if (uploadedImageBase64) {
      processUploadedImage();
    }
  }, [uploadedImageBase64, processUploadedImage]);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        setUploadedImageBase64(base64);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider,
          quality,
          width: canvasWidth,
          height: canvasHeight,
          referenceImage,
          geminiModel: provider === "gemini" ? geminiModel : undefined,
          openaiModel: provider === "openai" ? openaiModel : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await response.json();
      const firstResult = data.results?.[0];

      if (firstResult) {
        addToHistory({
          id: firstResult.id ?? crypto.randomUUID(),
          prompt: prompt.trim(),
          provider,
          imageData: firstResult.imageData ?? "",
          width: firstResult.width ?? canvasWidth,
          height: firstResult.height ?? canvasHeight,
          cost,
          createdAt: new Date(),
        });

        // Set as base character for Packs tab (only if no uploaded reference —
        // when a reference was uploaded it is already the base character)
        if (firstResult.imageData && !referenceImage) {
          setBaseCharacter({
            imageData: firstResult.imageData,
            characterName: characterName.trim(),
            prompt: prompt.trim(),
            provider,
          });
        }

        setGenerationProgress(100);

        // Apply to current frame layer
        if (firstResult.imageData) {
          // Rename the current animation to "Reference" if it's still the default
          const { currentAnimation, updateAnimation } = useProjectStore.getState();
          if (currentAnimation && currentAnimation.name === "Idle") {
            updateAnimation(currentAnimation.id, { name: "Reference" });
          }
          await applyGeneratedImage(`data:image/png;base64,${firstResult.imageData}`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function applyGeneratedImage(imageUrl: string) {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

      // Update the active layer with this data
      const { layers, activeLayerId, setLayers, pushHistory } = useEditorStore.getState();
      if (!activeLayerId) return;

      const oldData = layers.find((l) => l.id === activeLayerId)?.data;
      if (oldData) {
        const before = new Uint8ClampedArray(oldData);
        const after = new Uint8ClampedArray(imgData.data);
        pushHistory({
          label: "AI Generation",
          layerId: activeLayerId,
          before,
          after,
        });
      }

      const newLayers = layers.map((l) =>
        l.id === activeLayerId
          ? { ...l, data: new Uint8ClampedArray(imgData.data) }
          : l
      );
      setLayers(newLayers);
      useEditorStore.getState().setDirty(true);

      // Sync to frame
      const { currentAnimation, currentFrameIndex, updateFrame } = useProjectStore.getState();
      const frame = currentAnimation?.frames[currentFrameIndex];
      if (frame) {
        updateFrame(frame.id, { layers: newLayers });
      }
    };
    img.src = imageUrl;
  }

  // When reference image changes (from processing), apply to canvas and set as base character
  useEffect(() => {
    if (!referenceImage) return;
    const base64 = referenceImage.replace(/^data:image\/[^;]+;base64,/, "");
    setBaseCharacter({
      imageData: base64,
      characterName: characterName.trim(),
      prompt: prompt.trim() || "Uploaded reference",
      provider,
    });
    applyGeneratedImage(referenceImage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceImage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">Character Concept</span>
      </div>

      {/* Base character indicator */}
      {baseCharacter && (
        <div className="flex items-center gap-2 rounded-md border border-green-800 bg-green-950/40 px-2.5 py-1.5">
          <img
            src={`data:image/png;base64,${baseCharacter.imageData}`}
            alt="Base character"
            className="w-8 h-8 rounded border border-border"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="h-3 w-3" />
              Base character defined
            </div>
            <p className="text-[10px] text-muted truncate">{baseCharacter.prompt}</p>
          </div>
          <button
            onClick={clearBaseCharacter}
            className="text-muted hover:text-foreground shrink-0"
            title="Clear base character"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Character Name */}
      <div>
        <Label>Character Name</Label>
        <Input
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          placeholder="e.g. Shadow Ninja"
          className="mt-1"
        />
      </div>

      {/* Size */}
      <div>
        <Label>Size</Label>
        <Select
          value={String(canvasWidth)}
          onChange={(e) => {
            const s = Number(e.target.value) as SpriteSize;
            setCanvasSize(s, s);
          }}
          options={SPRITE_SIZES.map((s) => ({ value: String(s.value), label: s.label }))}
          className="mt-1"
        />
      </div>

      {/* Provider */}
      <div>
        <Label>Provider</Label>
        <Select
          value={provider}
          onChange={(e) => setProvider(e.target.value as AIProvider)}
          options={PROVIDERS}
          className="mt-1"
        />
      </div>

      {/* Gemini model selector */}
      {provider === "gemini" && (
        <div>
          <Label>Model</Label>
          <Select
            value={geminiModel}
            onChange={(e) => setGeminiModel(e.target.value as GeminiModel)}
            options={GEMINI_MODELS.map((m) => ({ value: m.value, label: `${m.label} — ${m.description}` }))}
            className="mt-1"
          />
        </div>
      )}

      {/* OpenAI model selector */}
      {provider === "openai" && (
        <div>
          <Label>Model</Label>
          <Select
            value={openaiModel}
            onChange={(e) => setOpenaiModel(e.target.value as OpenAIModel)}
            options={OPENAI_MODELS.map((m) => ({ value: m.value, label: `${m.label} — ${m.description}` }))}
            className="mt-1"
          />
        </div>
      )}

      {/* Character Description */}
      <div>
        <Label>Character Description</Label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the character's appearance in detail: body type, clothing, armor, weapons, colors, distinguishing features..."
          className="mt-1 w-full h-24 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border resize-none"
        />
      </div>

      {/* Quality */}
      <div>
        <Label>Quality</Label>
        <Select
          value={quality}
          onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")}
          options={QUALITIES}
          className="mt-1"
        />
      </div>

      {/* Reference image */}
      <div>
        <Label>Start from Existing Image (optional)</Label>
        <p className="text-xs text-muted mt-0.5 mb-2">
          Upload a character image to use as the base. It will be pixelised and cleaned up automatically.
        </p>
        {uploadedImageBase64 ? (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface/50">
            <div className="w-16 h-16 rounded border border-border bg-surface-alt flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={`data:image/png;base64,${uploadedImageBase64}`}
                alt="Uploaded character"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-green-400" />
                <span className="text-xs text-foreground">Image uploaded</span>
                <button
                  onClick={() => {
                    setUploadedImageBase64(null);
                    setReferenceImage(null);
                  }}
                  className="ml-auto p-1 rounded hover:bg-surface-hover text-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadPixelise}
                  onChange={(e) => setUploadPixelise(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-muted">Pixelise to sprite size</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadRemoveBg}
                  onChange={(e) => setUploadRemoveBg(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-muted">Remove background (transparent PNG)</span>
              </label>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border bg-surface/50 hover:border-muted hover:bg-surface-hover cursor-pointer transition-colors"
          >
            <Upload className="h-6 w-6 text-muted" />
            <span className="text-xs text-muted">
              Drop an image here or click to browse
            </span>
            <span className="text-[10px] text-muted">PNG, JPG, or WebP</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        )}
      </div>

      {/* Cost estimate */}
      <div className="flex items-center gap-1 text-xs text-muted">
        <DollarSign className="h-3 w-3" />
        <span>Estimated cost: {formatCost(cost)}</span>
      </div>

      {/* Generate button */}
      <Button
        className="w-full"
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Sprite
          </>
        )}
      </Button>

      {/* Progress */}
      {isGenerating && (
        <Progress value={generationProgress} />
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <span className="text-xs text-muted block mb-1">Recent Generations</span>
          <div className="grid grid-cols-3 gap-1">
            {history.slice(0, 9).map((item) => (
              <button
                key={item.id}
                onClick={() => item.imageData && applyGeneratedImage(`data:image/png;base64,${item.imageData}`)}
                className="relative group rounded border border-border overflow-hidden hover:border-accent"
                title={item.prompt}
              >
                {item.imageData ? (
                  <img
                    src={`data:image/png;base64,${item.imageData}`}
                    alt={item.prompt}
                    className="w-full aspect-square object-cover"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <div className="w-full aspect-square bg-surface flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
