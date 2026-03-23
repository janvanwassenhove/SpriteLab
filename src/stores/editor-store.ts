import { create } from "zustand";
import type { Tool, Color, Point, HitboxType, Layer } from "@/types";
import { HistoryManager, type UndoCommand } from "@/lib/canvas/history";

interface EditorStore {
  // Tool state
  tool: Tool;
  setTool: (tool: Tool) => void;

  // Colors
  primaryColor: Color;
  secondaryColor: Color;
  setPrimaryColor: (color: Color) => void;
  setSecondaryColor: (color: Color) => void;
  swapColors: () => void;

  // Brush
  brushSize: number;
  setBrushSize: (size: number) => void;

  // Zoom & Pan
  zoom: number;
  panOffset: Point;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;

  // Grid
  showGrid: boolean;
  toggleGrid: () => void;

  // Mirror
  mirrorX: boolean;
  mirrorY: boolean;
  toggleMirrorX: () => void;
  toggleMirrorY: () => void;

  // Onion skin
  showOnionSkin: boolean;
  onionSkinFrames: number;
  toggleOnionSkin: () => void;
  setOnionSkinFrames: (n: number) => void;

  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  setLayers: (layers: Layer[]) => void;
  setActiveLayerId: (id: string | null) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;

  // History
  history: HistoryManager;
  pushHistory: (cmd: UndoCommand) => void;
  undo: () => UndoCommand | null;
  redo: () => UndoCommand | null;
  canUndo: boolean;
  canRedo: boolean;

  // Hitbox
  showHitboxes: boolean;
  activeHitboxType: HitboxType;
  toggleHitboxes: () => void;
  setActiveHitboxType: (type: HitboxType) => void;

  // Shape tool state
  fillShape: boolean;
  toggleFillShape: () => void;

  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  setCanvasSize: (w: number, h: number) => void;

  // Dirty flag
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  tool: "pencil",
  setTool: (tool) => set({ tool }),

  primaryColor: { r: 255, g: 255, b: 255, a: 255 },
  secondaryColor: { r: 0, g: 0, b: 0, a: 0 },
  setPrimaryColor: (color) => set({ primaryColor: color }),
  setSecondaryColor: (color) => set({ secondaryColor: color }),
  swapColors: () => set((s) => ({ primaryColor: s.secondaryColor, secondaryColor: s.primaryColor })),

  brushSize: 1,
  setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(32, size)) }),

  zoom: 8,
  panOffset: { x: 0, y: 0 },
  setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(64, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),

  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  mirrorX: false,
  mirrorY: false,
  toggleMirrorX: () => set((s) => ({ mirrorX: !s.mirrorX })),
  toggleMirrorY: () => set((s) => ({ mirrorY: !s.mirrorY })),

  showOnionSkin: false,
  onionSkinFrames: 2,
  toggleOnionSkin: () => set((s) => ({ showOnionSkin: !s.showOnionSkin })),
  setOnionSkinFrames: (n) => set({ onionSkinFrames: Math.max(1, Math.min(5, n)) }),

  layers: [],
  activeLayerId: null,
  setLayers: (layers) => set({ layers }),
  setActiveLayerId: (id) => set({ activeLayerId: id }),
  updateLayer: (id, updates) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      isDirty: true,
    })),

  history: new HistoryManager(100),
  pushHistory: (cmd) => {
    get().history.push(cmd);
    set({ canUndo: true, canRedo: false });
  },
  undo: () => {
    const cmd = get().history.undo();
    if (cmd) {
      set({
        layers: get().layers.map((l) =>
          l.id === cmd.layerId ? { ...l, data: cmd.before } : l
        ),
        canUndo: get().history.canUndo,
        canRedo: get().history.canRedo,
      });
    }
    return cmd;
  },
  redo: () => {
    const cmd = get().history.redo();
    if (cmd) {
      set({
        layers: get().layers.map((l) =>
          l.id === cmd.layerId ? { ...l, data: cmd.after } : l
        ),
        canUndo: get().history.canUndo,
        canRedo: get().history.canRedo,
      });
    }
    return cmd;
  },
  canUndo: false,
  canRedo: false,

  showHitboxes: false,
  activeHitboxType: "hurtbox",
  toggleHitboxes: () => set((s) => ({ showHitboxes: !s.showHitboxes })),
  setActiveHitboxType: (type) => set({ activeHitboxType: type }),

  fillShape: false,
  toggleFillShape: () => set((s) => ({ fillShape: !s.fillShape })),

  canvasWidth: 64,
  canvasHeight: 64,
  setCanvasSize: (w, h) => set({ canvasWidth: w, canvasHeight: h }),

  isDirty: false,
  setDirty: (dirty) => set({ isDirty: dirty }),
}));
