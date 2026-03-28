import { create } from "zustand";
import type { AIProvider, AnimationType, GeminiModel, OpenAIModel } from "@/types";
import { ANIMATION_TEMPLATES } from "@/lib/fighter-pack/templates";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini-service";
import { DEFAULT_OPENAI_MODEL } from "@/lib/ai/openai-service";

export type WizardStep = "concept" | "appearance" | "animations" | "settings" | "generate" | "complete";

export const WIZARD_STEPS: WizardStep[] = [
  "concept",
  "appearance",
  "animations",
  "settings",
  "generate",
  "complete",
];

export type CharacterStyle =
  | "fighter"
  | "platformer"
  | "rpg"
  | "chibi"
  | "realistic"
  | "retro";

export type ArtStyle =
  | "pixel-16"
  | "pixel-32"
  | "pixel-64"
  | "pixel-128";

export interface GeneratedFrame {
  animationType: AnimationType;
  frameIndex: number;
  imageData: string; // base64
}

export interface AnimationProgress {
  type: AnimationType;
  status: "pending" | "generating" | "done" | "error";
  progress: number; // 0-100
  frames: GeneratedFrame[];
  error?: string;
}

interface WizardStore {
  // Step
  currentStep: WizardStep;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Step 1: Concept
  characterName: string;
  characterDescription: string;
  characterStyle: CharacterStyle;
  setCharacterName: (name: string) => void;
  setCharacterDescription: (desc: string) => void;
  setCharacterStyle: (style: CharacterStyle) => void;

  // Upload: Start from existing image
  uploadedImage: string | null; // base64 of uploaded image (original)
  processedImage: string | null; // base64 after pixelise/remove-bg
  uploadPixelise: boolean;
  uploadRemoveBg: boolean;
  setUploadedImage: (data: string | null) => void;
  setProcessedImage: (data: string | null) => void;
  setUploadPixelise: (v: boolean) => void;
  setUploadRemoveBg: (v: boolean) => void;

  // Step 2: Appearance
  artStyle: ArtStyle;
  baseSprite: string | null; // base64 of generated base character
  baseSpriteVariants: string[]; // multiple variants to choose from
  selectedVariantIndex: number;
  isGeneratingBase: boolean;
  setArtStyle: (style: ArtStyle) => void;
  setBaseSprite: (data: string | null) => void;
  setBaseSpriteVariants: (variants: string[]) => void;
  setSelectedVariantIndex: (index: number) => void;
  setIsGeneratingBase: (v: boolean) => void;

  // Step 3: Animations
  selectedAnimations: AnimationType[];
  toggleAnimation: (type: AnimationType) => void;
  selectAllAnimations: () => void;
  deselectAllAnimations: () => void;
  keyFramesOnly: boolean;
  toggleKeyFramesOnly: () => void;

  // Step 4: Settings
  provider: AIProvider;
  quality: "low" | "medium" | "high";
  geminiModel: GeminiModel;
  openaiModel: OpenAIModel;
  setProvider: (p: AIProvider) => void;
  setQuality: (q: "low" | "medium" | "high") => void;
  setGeminiModel: (m: GeminiModel) => void;
  setOpenaiModel: (m: OpenAIModel) => void;

  // Step 5: Generate
  isGenerating: boolean;
  animationProgress: AnimationProgress[];
  generatedFrames: GeneratedFrame[];
  setIsGenerating: (v: boolean) => void;
  initAnimationProgress: () => void;
  updateAnimationProgress: (type: AnimationType, updates: Partial<AnimationProgress>) => void;
  addGeneratedFrame: (frame: GeneratedFrame) => void;

  // Step 6: Complete
  projectId: string | null;
  setProjectId: (id: string | null) => void;

  // Reset
  reset: () => void;
}

function getSpriteSize(artStyle: ArtStyle): number {
  const map: Record<ArtStyle, number> = {
    "pixel-16": 16,
    "pixel-32": 32,
    "pixel-64": 64,
    "pixel-128": 128,
  };
  return map[artStyle];
}

export { getSpriteSize };

export const useWizardStore = create<WizardStore>((set, get) => ({
  currentStep: "concept",
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const idx = WIZARD_STEPS.indexOf(get().currentStep);
    if (idx < WIZARD_STEPS.length - 1) set({ currentStep: WIZARD_STEPS[idx + 1] });
  },
  prevStep: () => {
    const idx = WIZARD_STEPS.indexOf(get().currentStep);
    if (idx > 0) set({ currentStep: WIZARD_STEPS[idx - 1] });
  },

  characterName: "",
  characterDescription: "",
  characterStyle: "fighter",
  setCharacterName: (name) => set({ characterName: name }),
  setCharacterDescription: (desc) => set({ characterDescription: desc }),
  setCharacterStyle: (style) => set({ characterStyle: style }),

  artStyle: "pixel-64",
  baseSprite: null,
  baseSpriteVariants: [],
  selectedVariantIndex: 0,
  isGeneratingBase: false,
  uploadedImage: null,
  processedImage: null,
  uploadPixelise: true,
  uploadRemoveBg: true,
  setUploadedImage: (data) => set({ uploadedImage: data, processedImage: null }),
  setProcessedImage: (data) => set({ processedImage: data }),
  setUploadPixelise: (v) => set({ uploadPixelise: v }),
  setUploadRemoveBg: (v) => set({ uploadRemoveBg: v }),
  setArtStyle: (style) => set({ artStyle: style }),
  setBaseSprite: (data) => set({ baseSprite: data }),
  setBaseSpriteVariants: (variants) => set({ baseSpriteVariants: variants, selectedVariantIndex: 0 }),
  setSelectedVariantIndex: (index) => set({ selectedVariantIndex: index }),
  setIsGeneratingBase: (v) => set({ isGeneratingBase: v }),

  selectedAnimations: ANIMATION_TEMPLATES.map((t) => t.type),
  toggleAnimation: (type) =>
    set((s) => ({
      selectedAnimations: s.selectedAnimations.includes(type)
        ? s.selectedAnimations.filter((t) => t !== type)
        : [...s.selectedAnimations, type],
    })),
  selectAllAnimations: () =>
    set({ selectedAnimations: ANIMATION_TEMPLATES.map((t) => t.type) }),
  deselectAllAnimations: () => set({ selectedAnimations: [] }),
  keyFramesOnly: true,
  toggleKeyFramesOnly: () => set((s) => ({ keyFramesOnly: !s.keyFramesOnly })),

  provider: "openai",
  quality: "medium",
  geminiModel: DEFAULT_GEMINI_MODEL,
  openaiModel: DEFAULT_OPENAI_MODEL,
  setProvider: (p) => set({ provider: p }),
  setQuality: (q) => set({ quality: q }),
  setGeminiModel: (m) => set({ geminiModel: m }),
  setOpenaiModel: (m) => set({ openaiModel: m }),

  isGenerating: false,
  animationProgress: [],
  generatedFrames: [],
  setIsGenerating: (v) => set({ isGenerating: v }),
  initAnimationProgress: () =>
    set((s) => ({
      animationProgress: s.selectedAnimations.map((type) => ({
        type,
        status: "pending",
        progress: 0,
        frames: [],
      })),
      generatedFrames: [],
    })),
  updateAnimationProgress: (type, updates) =>
    set((s) => ({
      animationProgress: s.animationProgress.map((ap) =>
        ap.type === type ? { ...ap, ...updates } : ap
      ),
    })),
  addGeneratedFrame: (frame) =>
    set((s) => ({
      generatedFrames: [...s.generatedFrames, frame],
      animationProgress: s.animationProgress.map((ap) =>
        ap.type === frame.animationType
          ? { ...ap, frames: [...ap.frames, frame] }
          : ap
      ),
    })),

  projectId: null,
  setProjectId: (id) => set({ projectId: id }),

  reset: () =>
    set({
      currentStep: "concept",
      characterName: "",
      characterDescription: "",
      characterStyle: "fighter",
      artStyle: "pixel-64",
      baseSprite: null,
      baseSpriteVariants: [],
      selectedVariantIndex: 0,
      isGeneratingBase: false,
      uploadedImage: null,
      processedImage: null,
      uploadPixelise: true,
      uploadRemoveBg: true,
      selectedAnimations: ANIMATION_TEMPLATES.map((t) => t.type),
      keyFramesOnly: true,
      provider: "openai",
      quality: "medium",
      geminiModel: DEFAULT_GEMINI_MODEL,
      openaiModel: DEFAULT_OPENAI_MODEL,
      isGenerating: false,
      animationProgress: [],
      generatedFrames: [],
      projectId: null,
    }),
}));
