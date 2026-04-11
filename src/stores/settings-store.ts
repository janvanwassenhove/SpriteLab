import { create } from "zustand";
import type {
  AIProvider,
  GeminiModel,
  OpenAIModel,
  AnalysisModel,
  AppSettings,
  ThemeId,
} from "@/types";
import { THEMES } from "@/types";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini-service";
import { DEFAULT_OPENAI_MODEL } from "@/lib/ai/openai-service";

const STORAGE_KEY = "spritelab-settings";

export const DEFAULT_ANALYSIS_MODEL: AnalysisModel = "gemini-2.5-flash";

const DEFAULT_SETTINGS: AppSettings = {
  defaultProvider: "openai",
  defaultQuality: "medium",
  defaultGeminiModel: DEFAULT_GEMINI_MODEL,
  defaultOpenaiModel: DEFAULT_OPENAI_MODEL,
  analysisModel: DEFAULT_ANALYSIS_MODEL,
  theme: "midnight",
};

function applyTheme(themeId: ThemeId) {
  if (typeof document === "undefined") return;
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty("--background", theme.colors.background);
  root.style.setProperty("--foreground", theme.colors.foreground);
  root.style.setProperty("--muted", theme.colors.muted);
  root.style.setProperty("--surface", theme.colors.surface);
  root.style.setProperty("--surface-hover", theme.colors.surfaceHover);
  root.style.setProperty("--surface-alt", theme.colors.surfaceAlt);
  root.style.setProperty("--border", theme.colors.border);
  root.style.setProperty("--accent", theme.colors.accent);
  root.style.setProperty("--accent-hover", theme.colors.accentHover);
  root.setAttribute("data-theme", themeId);
}

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage full or unavailable — ignore
  }
}

interface SettingsStore extends AppSettings {
  setDefaultProvider: (p: AIProvider) => void;
  setDefaultQuality: (q: "low" | "medium" | "high") => void;
  setDefaultGeminiModel: (m: GeminiModel) => void;
  setDefaultOpenaiModel: (m: OpenAIModel) => void;
  setAnalysisModel: (m: AnalysisModel) => void;
  setTheme: (t: ThemeId) => void;
  resetDefaults: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => {
  const initial = loadSettings();

  // Apply saved theme on store creation
  applyTheme(initial.theme);

  function update(partial: Partial<AppSettings>) {
    set((s) => {
      const next = { ...s, ...partial };
      persistSettings({
        defaultProvider: next.defaultProvider,
        defaultQuality: next.defaultQuality,
        defaultGeminiModel: next.defaultGeminiModel,
        defaultOpenaiModel: next.defaultOpenaiModel,
        analysisModel: next.analysisModel,
        theme: next.theme,
      });
      if (partial.theme) applyTheme(partial.theme);
      return partial;
    });
  }

  return {
    ...initial,
    setDefaultProvider: (p) => update({ defaultProvider: p }),
    setDefaultQuality: (q) => update({ defaultQuality: q }),
    setDefaultGeminiModel: (m) => update({ defaultGeminiModel: m }),
    setDefaultOpenaiModel: (m) => update({ defaultOpenaiModel: m }),
    setAnalysisModel: (m) => update({ analysisModel: m }),
    setTheme: (t) => update({ theme: t }),
    resetDefaults: () => update(DEFAULT_SETTINGS),
  };
});

export const ANALYSIS_MODELS: { value: AnalysisModel; label: string; description: string }[] = [
  // ---- Gemini ----
  {
    value: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    description: "Fast — may hit free-tier quota limits quickly",
  },
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Recommended — better quota, good quality",
  },
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Best Gemini quality — deeper analysis",
  },
  // ---- OpenAI ----
  {
    value: "gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    description: "Lowest cost — great for high-volume checks",
  },
  {
    value: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "Fast & strong — balanced cost/quality",
  },
  {
    value: "gpt-5.4",
    label: "GPT-5.4",
    description: "Best OpenAI quality — deep reasoning & analysis",
  },
];
