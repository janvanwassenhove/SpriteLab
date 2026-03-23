"use client";

import { useState } from "react";
import { useAIStore } from "@/stores/ai-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, DollarSign, Image as ImageIcon } from "lucide-react";
import type { AIProvider, GeminiModel, OpenAIModel } from "@/types";
import { estimateSingleCost, formatCost } from "@/lib/ai/cost-estimator";
import { GEMINI_MODELS } from "@/lib/ai/gemini-service";
import { OPENAI_MODELS } from "@/lib/ai/openai-service";

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
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const isGenerating = useAIStore((s) => s.isGenerating);
  const generationProgress = useAIStore((s) => s.generationProgress);
  const setIsGenerating = useAIStore((s) => s.setIsGenerating);
  const setGenerationProgress = useAIStore((s) => s.setGenerationProgress);
  const addToHistory = useAIStore((s) => s.addToHistory);
  const history = useAIStore((s) => s.history);
  const geminiModel = useAIStore((s) => s.geminiModel);
  const setGeminiModel = useAIStore((s) => s.setGeminiModel);
  const openaiModel = useAIStore((s) => s.openaiModel);
  const setOpenaiModel = useAIStore((s) => s.setOpenaiModel);

  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);

  const cost = estimateSingleCost(provider, quality, provider === "gemini" ? geminiModel : undefined, provider === "openai" ? openaiModel : undefined);

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

        setGenerationProgress(100);

        // Apply to current frame layer
        if (firstResult.imageData) {
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

  function handleReferenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">AI Generation</span>
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

      {/* Prompt */}
      <div>
        <Label>Prompt</Label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your fighter sprite... e.g. 'A ninja warrior in fighting stance, pixel art style, side view'"
          className="mt-1 w-full h-24 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 resize-none"
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
        <Label>Reference Image (optional)</Label>
        <div className="mt-1 flex items-center gap-2">
          <label className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-zinc-600 bg-zinc-800 text-xs text-zinc-300 cursor-pointer hover:bg-zinc-700">
            <ImageIcon className="h-3.5 w-3.5" />
            {referenceImage ? "Change" : "Upload"}
            <input
              type="file"
              accept="image/*"
              onChange={handleReferenceUpload}
              className="hidden"
            />
          </label>
          {referenceImage && (
            <button
              onClick={() => setReferenceImage(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Remove
            </button>
          )}
        </div>
        {referenceImage && (
          <img
            src={referenceImage}
            alt="Reference"
            className="mt-1 w-16 h-16 rounded border border-zinc-700 object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        )}
      </div>

      {/* Cost estimate */}
      <div className="flex items-center gap-1 text-xs text-zinc-400">
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
          <span className="text-xs text-zinc-400 block mb-1">Recent Generations</span>
          <div className="grid grid-cols-3 gap-1">
            {history.slice(0, 9).map((item) => (
              <button
                key={item.id}
                onClick={() => item.imageData && applyGeneratedImage(`data:image/png;base64,${item.imageData}`)}
                className="relative group rounded border border-zinc-700 overflow-hidden hover:border-accent"
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
                  <div className="w-full aspect-square bg-zinc-800 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-zinc-600" />
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
