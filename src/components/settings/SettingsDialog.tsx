"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Key, Palette, Monitor, Cpu, CheckCircle2, Moon, Eye, Sun, Snowflake, Trees, SunDim, Check } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useSettingsStore, ANALYSIS_MODELS } from "@/stores/settings-store";
import { GEMINI_MODELS } from "@/lib/ai/gemini-service";
import { OPENAI_MODELS } from "@/lib/ai/openai-service";
import type { AIProvider, GeminiModel, OpenAIModel, AnalysisModel, ThemeId } from "@/types";
import { THEMES } from "@/types";

interface EnvKeyStatus {
  configured: boolean;
  hint: string;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [tab, setTab] = useState("canvas");
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const [width, setWidth] = useState(canvasWidth);
  const [height, setHeight] = useState(canvasHeight);

  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  const [envKeys, setEnvKeys] = useState<{ openai: EnvKeyStatus; gemini: EnvKeyStatus } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/ai/keys-status")
      .then((r) => r.json())
      .then((data) => setEnvKeys(data))
      .catch(() => {});
  }, [open]);

  const defaultProvider = useSettingsStore((s) => s.defaultProvider);
  const defaultQuality = useSettingsStore((s) => s.defaultQuality);
  const defaultGeminiModel = useSettingsStore((s) => s.defaultGeminiModel);
  const defaultOpenaiModel = useSettingsStore((s) => s.defaultOpenaiModel);
  const analysisModel = useSettingsStore((s) => s.analysisModel);
  const setDefaultProvider = useSettingsStore((s) => s.setDefaultProvider);
  const setDefaultQuality = useSettingsStore((s) => s.setDefaultQuality);
  const setDefaultGeminiModel = useSettingsStore((s) => s.setDefaultGeminiModel);
  const setDefaultOpenaiModel = useSettingsStore((s) => s.setDefaultOpenaiModel);
  const setAnalysisModel = useSettingsStore((s) => s.setAnalysisModel);
  const resetDefaults = useSettingsStore((s) => s.resetDefaults);
  const currentTheme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  function handleSaveCanvas() {
    if (width > 0 && width <= 512 && height > 0 && height <= 512) {
      setCanvasSize(width, height);
    }
    onClose();
  }

  function handleSaveApiKeys() {
    // Store in localStorage (not ideal for production, but works for self-hosted)
    if (openaiKey) localStorage.setItem("OPENAI_API_KEY", openaiKey);
    if (geminiKey) localStorage.setItem("GEMINI_API_KEY", geminiKey);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>
          <Settings className="h-4 w-4 inline mr-2" />
          Settings
        </DialogTitle>
      </DialogHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="canvas">
            <Monitor className="h-3.5 w-3.5 mr-1" />
            Canvas
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="h-3.5 w-3.5 mr-1" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="theme">
            <Palette className="h-3.5 w-3.5 mr-1" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Cpu className="h-3.5 w-3.5 mr-1" />
            AI Defaults
          </TabsTrigger>
        </TabsList>

        <TabsContent value="canvas">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Width (px)</Label>
                <Input
                  type="number"
                  min={1}
                  max={512}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Height (px)</Label>
                <Input
                  type="number"
                  min={1}
                  max={512}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted">
              Changing canvas size will not resize existing sprites.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="api">
          <div className="space-y-3">
            {envKeys && (envKeys.openai.configured || envKeys.gemini.configured) && (
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">Keys loaded from server environment</p>
                  {envKeys.openai.configured && (
                    <p>OpenAI: <code className="bg-surface-hover px-1 rounded">{envKeys.openai.hint}</code></p>
                  )}
                  {envKeys.gemini.configured && (
                    <p>Gemini: <code className="bg-surface-hover px-1 rounded">{envKeys.gemini.hint}</code></p>
                  )}
                  <p className="mt-1 text-muted">Server env vars take priority. Override below for this browser only.</p>
                </div>
              </div>
            )}
            <div>
              <Label>OpenAI API Key{envKeys?.openai.configured ? " (override)" : ""}</Label>
              <Input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={envKeys?.openai.configured ? envKeys.openai.hint : "sk-..."}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Google Gemini API Key{envKeys?.gemini.configured ? " (override)" : ""}</Label>
              <Input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={envKeys?.gemini.configured ? envKeys.gemini.hint : "AI..."}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted">
              Keys are stored locally. For production, set them in your .env file.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="theme">
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                moon: Moon, eye: Eye, sun: Sun, snowflake: Snowflake,
                palette: Palette, cpu: Cpu, trees: Trees, "sun-dim": SunDim,
              };
              const Icon = iconMap[t.icon] ?? Palette;
              const active = t.id === currentTheme;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as ThemeId)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border hover:border-muted text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{t.name}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="space-y-4">
            <div>
              <Label>Default Provider</Label>
              <Select
                value={defaultProvider}
                onChange={(e) => setDefaultProvider(e.target.value as AIProvider)}
                options={[
                  { value: "openai", label: "OpenAI" },
                  { value: "gemini", label: "Google Gemini" },
                ]}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Default Quality</Label>
              <Select
                value={defaultQuality}
                onChange={(e) => setDefaultQuality(e.target.value as "low" | "medium" | "high")}
                options={[
                  { value: "low", label: "Low — fast & cheap" },
                  { value: "medium", label: "Medium — balanced" },
                  { value: "high", label: "High — best quality" },
                ]}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Default Gemini Model (Generation)</Label>
              <Select
                value={defaultGeminiModel}
                onChange={(e) => setDefaultGeminiModel(e.target.value as GeminiModel)}
                options={GEMINI_MODELS.map((m) => ({ value: m.value, label: m.label }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Default OpenAI Model (Generation)</Label>
              <Select
                value={defaultOpenaiModel}
                onChange={(e) => setDefaultOpenaiModel(e.target.value as OpenAIModel)}
                options={OPENAI_MODELS.map((m) => ({ value: m.value, label: m.label }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Analysis Model (Consistency Checks)</Label>
              <Select
                value={analysisModel}
                onChange={(e) => setAnalysisModel(e.target.value as AnalysisModel)}
                options={ANALYSIS_MODELS.map((m) => ({
                  value: m.value,
                  label: `${m.label} — ${m.description}`,
                }))}
                className="mt-1"
              />
              <p className="text-xs text-muted mt-1">
                Used for AI-powered consistency evaluation and reference analysis during generation.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={resetDefaults}>
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (tab === "canvas") handleSaveCanvas();
            else if (tab === "api") handleSaveApiKeys();
            else onClose();
          }}
        >
          {tab === "ai" ? "Done" : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
