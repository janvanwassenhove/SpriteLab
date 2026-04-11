import { create } from "zustand";
import type { AIProvider, AIGenerationResult, AIUsage, CostEstimate, GeminiModel, OpenAIModel } from "@/types";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini-service";
import { DEFAULT_OPENAI_MODEL } from "@/lib/ai/openai-service";

export interface BaseCharacter {
  imageData: string; // base64
  characterName: string;
  prompt: string;
  provider: AIProvider;
}

interface AIStore {
  // Base character (set from Character Concept tab, used by Packs)
  baseCharacter: BaseCharacter | null;
  setBaseCharacter: (bc: BaseCharacter) => void;
  clearBaseCharacter: () => void;

  // Generation state
  isGenerating: boolean;
  generationProgress: number; // 0-1
  currentProvider: AIProvider;
  geminiModel: GeminiModel;
  openaiModel: OpenAIModel;
  setIsGenerating: (v: boolean) => void;
  setGenerationProgress: (p: number) => void;
  setCurrentProvider: (p: AIProvider) => void;
  setGeminiModel: (m: GeminiModel) => void;
  setOpenaiModel: (m: OpenAIModel) => void;

  // Generation history
  history: AIGenerationResult[];
  addToHistory: (result: AIGenerationResult) => void;
  clearHistory: () => void;

  // Usage
  usage: AIUsage;
  setUsage: (usage: AIUsage) => void;

  // Cost estimate (for display before generation)
  costEstimate: CostEstimate | null;
  setCostEstimate: (est: CostEstimate | null) => void;

  // Batch generation queue
  batchQueue: string[]; // animation type IDs pending generation
  batchProgress: Map<string, number>;
  setBatchQueue: (queue: string[]) => void;
  updateBatchProgress: (id: string, progress: number) => void;
  clearBatch: () => void;

  // Key frames only mode
  keyFramesOnly: boolean;
  toggleKeyFramesOnly: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  baseCharacter: null,
  setBaseCharacter: (bc) => set({ baseCharacter: bc }),
  clearBaseCharacter: () => set({ baseCharacter: null }),

  isGenerating: false,
  generationProgress: 0,
  currentProvider: "openai",
  geminiModel: DEFAULT_GEMINI_MODEL,
  openaiModel: DEFAULT_OPENAI_MODEL,
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGenerationProgress: (p) => set({ generationProgress: p }),
  setCurrentProvider: (p) => set({ currentProvider: p }),
  setGeminiModel: (m) => set({ geminiModel: m }),
  setOpenaiModel: (m) => set({ openaiModel: m }),

  history: [],
  addToHistory: (result) => set((s) => ({ history: [result, ...s.history].slice(0, 100) })),
  clearHistory: () => set({ history: [] }),

  usage: { totalGenerations: 0, totalCost: 0, dailyGenerations: 0, monthlyGenerations: 0 },
  setUsage: (usage) => set({ usage }),

  costEstimate: null,
  setCostEstimate: (est) => set({ costEstimate: est }),

  batchQueue: [],
  batchProgress: new Map(),
  setBatchQueue: (queue) => set({ batchQueue: queue }),
  updateBatchProgress: (id, progress) =>
    set((s) => {
      const next = new Map(s.batchProgress);
      next.set(id, progress);
      return { batchProgress: next };
    }),
  clearBatch: () => set({ batchQueue: [], batchProgress: new Map() }),

  keyFramesOnly: false,
  toggleKeyFramesOnly: () => set((s) => ({ keyFramesOnly: !s.keyFramesOnly })),
}));
