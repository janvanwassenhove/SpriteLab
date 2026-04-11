"use client";

import { useWizardStore, getSpriteSize } from "@/stores/wizard-store";
import { Label } from "@/components/ui/label";
import { estimateFighterPackCost, formatCost } from "@/lib/ai/cost-estimator";
import type { AIProvider, GeminiModel, OpenAIModel } from "@/types";
import { DollarSign, Zap, Palette, Info } from "lucide-react";
import { GEMINI_MODELS } from "@/lib/ai/gemini-service";
import { OPENAI_MODELS } from "@/lib/ai/openai-service";

const PROVIDERS: { value: AIProvider; label: string; desc: string }[] = [
  { value: "openai", label: "OpenAI", desc: "Choose GPT Image 1 or DALL-E below" },
  { value: "gemini", label: "Google Gemini", desc: "Good quality, lower cost" },
];

const QUALITIES: { value: "low" | "medium" | "high"; label: string; desc: string }[] = [
  { value: "low", label: "Draft", desc: "Fast preview, lower fidelity" },
  { value: "medium", label: "Standard", desc: "Balanced quality and speed" },
  { value: "high", label: "Premium", desc: "Highest quality, slower" },
];

export function StepSettings() {
  const provider = useWizardStore((s) => s.provider);
  const quality = useWizardStore((s) => s.quality);
  const setProvider = useWizardStore((s) => s.setProvider);
  const setQuality = useWizardStore((s) => s.setQuality);
  const geminiModel = useWizardStore((s) => s.geminiModel);
  const setGeminiModel = useWizardStore((s) => s.setGeminiModel);
  const openaiModel = useWizardStore((s) => s.openaiModel);
  const setOpenaiModel = useWizardStore((s) => s.setOpenaiModel);
  const selectedAnimations = useWizardStore((s) => s.selectedAnimations);
  const keyFramesOnly = useWizardStore((s) => s.keyFramesOnly);
  const artStyle = useWizardStore((s) => s.artStyle);
  const characterName = useWizardStore((s) => s.characterName);
  const baseSprite = useWizardStore((s) => s.baseSprite);
  const frameCountOverrides = useWizardStore((s) => s.frameCountOverrides);

  const spriteSize = getSpriteSize(artStyle);
  const costEstimate = estimateFighterPackCost(provider, selectedAnimations, keyFramesOnly, quality, provider === "gemini" ? geminiModel : undefined, provider === "openai" ? openaiModel : undefined, frameCountOverrides);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Generation Settings</h2>
        <p className="text-muted text-sm">
          Configure AI provider, quality, and review your generation plan.
        </p>
      </div>

      <div className="space-y-4">
        {/* Provider */}
        <div>
          <Label>AI Provider</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => setProvider(p.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  provider === p.value
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface/50 hover:border-muted"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{p.label}</span>
                <p className="text-xs text-muted mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Gemini Model */}
        {provider === "gemini" && (
          <div>
            <Label>Gemini Model</Label>
            <div className="grid grid-cols-1 gap-2 mt-1.5">
              {GEMINI_MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setGeminiModel(m.value as GeminiModel)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    geminiModel === m.value
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface/50 hover:border-muted"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                  <p className="text-xs text-muted mt-0.5">{m.description} — ~${m.cost.toFixed(3)}/frame</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OpenAI Model */}
        {provider === "openai" && (
          <div>
            <Label>OpenAI Model</Label>
            <div className="grid grid-cols-1 gap-2 mt-1.5">
              {OPENAI_MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setOpenaiModel(m.value as OpenAIModel)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    openaiModel === m.value
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface/50 hover:border-muted"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                  <p className="text-xs text-muted mt-0.5">{m.description} — ~${m.cost.medium.toFixed(3)}/frame</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quality */}
        <div>
          <Label>Quality</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {QUALITIES.map((q) => (
              <button
                key={q.value}
                onClick={() => setQuality(q.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  quality === q.value
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface/50 hover:border-muted"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{q.label}</span>
                <p className="text-xs text-muted mt-0.5">{q.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-surface/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Info className="h-4 w-4 text-accent" />
          Generation Summary
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-muted" />
            <span className="text-muted">Character:</span>
            <span className="text-foreground">{characterName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-muted" />
            <span className="text-muted">Size:</span>
            <span className="text-foreground">{spriteSize}x{spriteSize}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Animations:</span>
            <span className="text-foreground">{selectedAnimations.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Total frames:</span>
            <span className="text-foreground">~{costEstimate.generationCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Base sprite:</span>
            <span className={baseSprite ? "text-green-400" : "text-yellow-400"}>
              {baseSprite ? "Generated" : "Not yet"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Key frames:</span>
            <span className="text-foreground">{keyFramesOnly ? "Yes" : "All frames"}</span>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="border-t border-border pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Cost Breakdown
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatCost(costEstimate.estimatedCost)}
            </span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {costEstimate.breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-muted">
                  {item.label} ({item.count} frames)
                </span>
                <span className="text-muted">{formatCost(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
