// ===========================
// SpriteLab — Type Definitions
// ===========================

// ---- Canvas & Drawing ----

export type PixelData = Uint8ClampedArray;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  data: PixelData; // RGBA flat array, length = width * height * 4
  width: number;
  height: number;
}

export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten";

export type Tool =
  | "pencil"
  | "eraser"
  | "fill"
  | "line"
  | "rectangle"
  | "ellipse"
  | "eyedropper"
  | "select"
  | "move"
  | "hitbox";

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Selection extends Rect {
  active: boolean;
}

// ---- Palette ----

export interface Palette {
  id: string;
  name: string;
  colors: Color[];
  builtin?: boolean;
}

// ---- Animation ----

export interface Frame {
  id: string;
  layers: Layer[];
  delay: number; // ms
  hitboxes?: Hitbox[];
}

export interface Animation {
  id: string;
  name: string;
  frames: Frame[];
  loop: LoopMode;
}

export type LoopMode = "loop" | "ping-pong" | "once";

// ---- Character Style ----

export type CharacterStyle =
  | "fighter"
  | "platformer"
  | "rpg"
  | "chibi"
  | "realistic"
  | "retro";

// ---- Sprite Size ----

export type SpriteSize = 16 | 32 | 64 | 128;

export const SPRITE_SIZES: { value: SpriteSize; label: string }[] = [
  { value: 16, label: "16×16 — Tiny" },
  { value: 32, label: "32×32 — Small" },
  { value: 64, label: "64×64 — Medium" },
  { value: 128, label: "128×128 — Large" },
];

// ---- Fighter Pack ----

export enum AnimationType {
  IDLE = "idle",
  WALK = "walk",
  RUN = "run",
  JUMP = "jump",
  CROUCH = "crouch",
  PUNCH = "punch",
  KICK = "kick",
  SPECIAL = "special",
  HURT = "hurt",
  KO = "ko",
  BLOCK = "block",
  INTRO = "intro",
  WIN = "win",
}

export interface AnimationTemplate {
  type: AnimationType;
  label: string;
  defaultFrameCount: number;
  defaultDelay: number; // ms per frame
  defaultLoop: LoopMode;
  description: string;
}

export type FighterPackStatus = "draft" | "generating" | "review" | "complete";
export type AnimationStatus = "pending" | "generating" | "done" | "needs-review";

export interface FighterPackAnimationState {
  type: AnimationType;
  status: AnimationStatus;
  animationId?: string;
  progress?: number; // 0-1 for generation progress
}

export interface FighterPack {
  id: string;
  name: string;
  baseCharacterSpriteId?: string;
  status: FighterPackStatus;
  animations: FighterPackAnimationState[];
  createdAt: Date;
  updatedAt: Date;
}

// ---- Hitbox ----

export type HitboxType = "hitbox" | "hurtbox" | "pushbox";

export interface Hitbox {
  id: string;
  type: HitboxType;
  rect: Rect;
  label?: string;
  damageMultiplier?: number;
  priority?: number;
}

export interface FrameHitboxes {
  frameId: string;
  hitboxes: Hitbox[];
}

// ---- AI ----

export type AIProvider = "openai" | "gemini" | "stable-diffusion";

export type GeminiModel =
  | "gemini-2.5-flash-image"           // Nano Banana — stable, lower cost
  | "gemini-3.1-flash-image-preview"   // Nano Banana 2 — fast workhorse
  | "gemini-3-pro-image-preview";      // Nano Banana Pro — flagship quality

/** Models used for sprite analysis / vision tasks (not image generation). */
export type GeminiAnalysisModel =
  | "gemini-2.0-flash"            // Fast, free-tier friendly
  | "gemini-2.5-flash"            // Newer flash model
  | "gemini-2.5-pro";             // Best quality analysis

/** OpenAI models used for sprite analysis / vision tasks. */
export type OpenAIAnalysisModel =
  | "gpt-5.4"                     // Highest intelligence, reasoning
  | "gpt-5.4-mini"                // Strong cheaper version, faster
  | "gpt-5.4-nano";               // Lowest-cost high-volume tasks

/** Union of all analysis-capable models across providers. */
export type AnalysisModel = GeminiAnalysisModel | OpenAIAnalysisModel;

export type OpenAIModel =
  | "gpt-image-1"         // GPT Image 1 — best quality
  | "dall-e-3"            // DALL-E 3 — fast, good quality
  | "dall-e-2";           // DALL-E 2 — budget option

// ---- Theme ----

export type ThemeId =
  | "midnight"
  | "dracula"
  | "solarized-dark"
  | "nord"
  | "monokai"
  | "cyberpunk"
  | "forest"
  | "light";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  icon: string;
  colors: {
    background: string;
    foreground: string;
    muted: string;
    surface: string;
    surfaceHover: string;
    surfaceAlt: string;
    border: string;
    accent: string;
    accentHover: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "midnight",
    name: "Midnight",
    icon: "moon",
    colors: {
      background: "#0c0c0f",
      foreground: "#e4e4e7",
      muted: "#a1a1aa",
      surface: "#18181b",
      surfaceHover: "#27272a",
      surfaceAlt: "#09090b",
      border: "#3f3f46",
      accent: "#6366f1",
      accentHover: "#818cf8",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    icon: "eye",
    colors: {
      background: "#282a36",
      foreground: "#f8f8f2",
      muted: "#9098b0",
      surface: "#1e1f29",
      surfaceHover: "#44475a",
      surfaceAlt: "#15161e",
      border: "#6272a4",
      accent: "#bd93f9",
      accentHover: "#caa9fa",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized",
    icon: "sun",
    colors: {
      background: "#002b36",
      foreground: "#839496",
      muted: "#657b83",
      surface: "#073642",
      surfaceHover: "#0a4050",
      surfaceAlt: "#001e26",
      border: "#586e75",
      accent: "#268bd2",
      accentHover: "#2aa0f0",
    },
  },
  {
    id: "nord",
    name: "Nord",
    icon: "snowflake",
    colors: {
      background: "#2e3440",
      foreground: "#d8dee9",
      muted: "#7b88a1",
      surface: "#3b4252",
      surfaceHover: "#434c5e",
      surfaceAlt: "#242933",
      border: "#4c566a",
      accent: "#88c0d0",
      accentHover: "#8fbcbb",
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    icon: "palette",
    colors: {
      background: "#272822",
      foreground: "#f8f8f2",
      muted: "#90908a",
      surface: "#1e1f1c",
      surfaceHover: "#3e3d32",
      surfaceAlt: "#141510",
      border: "#49483e",
      accent: "#a6e22e",
      accentHover: "#b8f340",
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    icon: "cpu",
    colors: {
      background: "#0a0a1a",
      foreground: "#e0e0ff",
      muted: "#8888bb",
      surface: "#12122a",
      surfaceHover: "#1a1a3a",
      surfaceAlt: "#060612",
      border: "#2a2a5a",
      accent: "#ff2d95",
      accentHover: "#ff5cb0",
    },
  },
  {
    id: "forest",
    name: "Forest",
    icon: "trees",
    colors: {
      background: "#1a1f16",
      foreground: "#d4d4c8",
      muted: "#8a8e80",
      surface: "#232a1e",
      surfaceHover: "#2e3827",
      surfaceAlt: "#10140d",
      border: "#3d4a34",
      accent: "#7cb342",
      accentHover: "#9ccc65",
    },
  },
  {
    id: "light",
    name: "Light",
    icon: "sun-dim",
    colors: {
      background: "#f5f5f5",
      foreground: "#1a1a1a",
      muted: "#6b7280",
      surface: "#ffffff",
      surfaceHover: "#e8e8e8",
      surfaceAlt: "#eaeaea",
      border: "#d4d4d4",
      accent: "#6366f1",
      accentHover: "#4f46e5",
    },
  },
];

/** Persisted application-level AI defaults. */
export interface AppSettings {
  defaultProvider: AIProvider;
  defaultQuality: "low" | "medium" | "high";
  defaultGeminiModel: GeminiModel;
  defaultOpenaiModel: OpenAIModel;
  analysisModel: AnalysisModel;
  theme: ThemeId;
}

export interface AIGenerationRequest {
  provider: AIProvider;
  prompt: string;
  referenceImage?: string; // base64
  width: number;
  height: number;
  style?: string;
  numVariations?: number;
}

export interface AIGenerationResult {
  id: string;
  provider: AIProvider;
  prompt: string;
  imageData: string; // base64
  width: number;
  height: number;
  cost?: number;
  createdAt: Date;
}

export interface AIUsage {
  totalGenerations: number;
  totalCost: number;
  dailyGenerations: number;
  monthlyGenerations: number;
}

export interface CostEstimate {
  provider: AIProvider;
  operationType: "single" | "batch";
  estimatedCost: number;
  generationCount: number;
  breakdown: { label: string; count: number; unitCost: number; total: number }[];
}

// ---- Project ----

export interface Project {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  paletteId?: string;
  sprites: SpriteData[];
  animations: Animation[];
  fighterPacks: FighterPack[];
  baseCharacterImage?: string; // base64 PNG of the base character reference
  baseCharacterName?: string;
  baseCharacterPrompt?: string;
  baseCharacterProvider?: AIProvider;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpriteData {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
}

// ---- Editor State ----

export interface EditorState {
  tool: Tool;
  primaryColor: Color;
  secondaryColor: Color;
  brushSize: number;
  zoom: number;
  panOffset: Point;
  activeLayerId: string | null;
  showGrid: boolean;
  showOnionSkin: boolean;
  onionSkinFrames: number;
  mirrorX: boolean;
  mirrorY: boolean;
  showHitboxes: boolean;
  activeHitboxType: HitboxType;
}

// ---- Export ----

export type ExportFormat = "png" | "sprite-sheet" | "gif" | "fighter-pack-bundle";

export interface SpriteSheetMetadata {
  frames: {
    filename: string;
    frame: Rect;
    duration: number;
  }[];
  meta: {
    image: string;
    size: { w: number; h: number };
    format: string;
    scale: number;
  };
}

export interface FighterPackManifest {
  name: string;
  version: string;
  spriteSize: { width: number; height: number };
  animations: {
    type: AnimationType;
    spriteSheet: string;
    frameCount: number;
    frameDelay: number;
    loop: LoopMode;
    hitboxes?: FrameHitboxes[];
  }[];
}

// ---- Consistency Evaluation ----

export type ConsistencyIssueType =
  | "palette-drift"
  | "skin-tone-shift"
  | "outline-change"
  | "color-region-shift"
  | "insufficient-movement"
  | "excessive-movement";

export type ConsistencyIssueSeverity = "low" | "medium" | "high";

export interface ConsistencyIssue {
  type: ConsistencyIssueType;
  severity: ConsistencyIssueSeverity;
  description: string;
  affectedRegion?: string;
  details?: Record<string, unknown>;
}

export interface FrameConsistencyResult {
  animationType: AnimationType;
  frameIndex: number;
  overallScore: number; // 0-1
  issues: ConsistencyIssue[];
  dominantColors: Color[];
  hasOutline: boolean;
}

export interface AnimationConsistencyResult {
  animationType: AnimationType;
  averageScore: number;
  frameResults: FrameConsistencyResult[];
  flaggedFrameCount: number;
}

export interface ConsistencyReport {
  overallScore: number;
  animations: AnimationConsistencyResult[];
  baseSpritePalette: Color[];
  timestamp: Date;
  aiEvaluationAvailable: boolean;
}
