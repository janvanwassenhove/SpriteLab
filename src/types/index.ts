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

export type OpenAIModel =
  | "gpt-image-1"         // GPT Image 1 — best quality
  | "dall-e-3"            // DALL-E 3 — fast, good quality
  | "dall-e-2";           // DALL-E 2 — budget option

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
