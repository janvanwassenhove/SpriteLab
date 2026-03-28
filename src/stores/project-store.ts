import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { Project, Animation, Frame, SpriteData, FighterPack, Layer } from "@/types";
import { createEmptyPixelData } from "@/utils";

interface ProjectStore {
  // Current project
  project: Project | null;
  setProject: (project: Project | null) => void;
  initProject: (id: string, name: string, width: number, height: number) => void;

  // Current animation
  currentAnimation: Animation | null;
  currentFrameIndex: number;
  setCurrentAnimation: (anim: Animation | null) => void;
  setCurrentFrameIndex: (index: number) => void;

  // Sync current animation edits back into project.animations
  syncCurrentAnimation: () => void;

  // Replace all project animations (used when loading wizard results)
  loadAnimations: (animations: Animation[]) => void;

  // Animation CRUD
  addAnimation: (anim: Animation) => void;
  updateAnimation: (id: string, updates: Partial<Animation>) => void;
  deleteAnimation: (id: string) => void;

  // Frame CRUD within current animation
  addFrame: (frame: Frame) => void;
  updateFrame: (frameId: string, updates: Partial<Frame>) => void;
  deleteFrame: (frameId: string) => void;
  reorderFrame: (fromIndex: number, toIndex: number) => void;

  // Sprites
  sprites: SpriteData[];
  addSprite: (sprite: SpriteData) => void;
  updateSprite: (id: string, updates: Partial<SpriteData>) => void;

  // Fighter packs
  fighterPacks: FighterPack[];
  setFighterPacks: (packs: FighterPack[]) => void;
  addFighterPack: (pack: FighterPack) => void;
  updateFighterPack: (id: string, updates: Partial<FighterPack>) => void;

  // Playback
  isPlaying: boolean;
  playbackSpeed: number;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  project: null,
  setProject: (project) => set({ project }),
  initProject: (id, name, width, height) => {
    const layerId = uuid();
    const defaultLayer: Layer = {
      id: layerId,
      name: "Layer 1",
      data: createEmptyPixelData(width, height),
      visible: true,
      opacity: 1,
      blendMode: "normal",
      width,
      height,
    };
    const frameId = uuid();
    const defaultFrame: Frame = {
      id: frameId,
      layers: [defaultLayer],
      delay: 100,
      hitboxes: [],
    };
    const animId = uuid();
    const defaultAnim: Animation = {
      id: animId,
      name: "Idle",
      frames: [defaultFrame],
      loop: "loop",
    };
    const project: Project = {
      id,
      name,
      canvasWidth: width,
      canvasHeight: height,
      animations: [defaultAnim],
      sprites: [],
      fighterPacks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set({
      project,
      currentAnimation: defaultAnim,
      currentFrameIndex: 0,
    });
  },

  currentAnimation: null,
  currentFrameIndex: 0,
  setCurrentAnimation: (anim) => set({ currentAnimation: anim, currentFrameIndex: 0 }),
  setCurrentFrameIndex: (index) => set({ currentFrameIndex: index }),

  syncCurrentAnimation: () =>
    set((s) => {
      if (!s.project || !s.currentAnimation) return {};
      return {
        project: {
          ...s.project,
          animations: s.project.animations.map((a) =>
            a.id === s.currentAnimation!.id ? s.currentAnimation! : a
          ),
        },
      };
    }),

  loadAnimations: (animations) =>
    set((s) => {
      if (!s.project) return {};
      return {
        project: { ...s.project, animations },
        currentAnimation: animations[0] ?? null,
        currentFrameIndex: 0,
      };
    }),

  addAnimation: (anim) =>
    set((s) => ({
      project: s.project
        ? { ...s.project, animations: [...s.project.animations, anim] }
        : s.project,
    })),
  updateAnimation: (id, updates) =>
    set((s) => ({
      project: s.project
        ? {
            ...s.project,
            animations: s.project.animations.map((a) =>
              a.id === id ? { ...a, ...updates } : a
            ),
          }
        : s.project,
      currentAnimation:
        s.currentAnimation?.id === id
          ? { ...s.currentAnimation, ...updates }
          : s.currentAnimation,
    })),
  deleteAnimation: (id) =>
    set((s) => ({
      project: s.project
        ? { ...s.project, animations: s.project.animations.filter((a) => a.id !== id) }
        : s.project,
      currentAnimation: s.currentAnimation?.id === id ? null : s.currentAnimation,
    })),

  addFrame: (frame) =>
    set((s) => {
      if (!s.currentAnimation) return {};
      const updated = {
        ...s.currentAnimation,
        frames: [...s.currentAnimation.frames, frame],
      };
      return { currentAnimation: updated };
    }),
  updateFrame: (frameId, updates) =>
    set((s) => {
      if (!s.currentAnimation) return {};
      const updated = {
        ...s.currentAnimation,
        frames: s.currentAnimation.frames.map((f) =>
          f.id === frameId ? { ...f, ...updates } : f
        ),
      };
      return { currentAnimation: updated };
    }),
  deleteFrame: (frameId) =>
    set((s) => {
      if (!s.currentAnimation) return {};
      const frames = s.currentAnimation.frames.filter((f) => f.id !== frameId);
      return {
        currentAnimation: { ...s.currentAnimation, frames },
        currentFrameIndex: Math.min(s.currentFrameIndex, Math.max(0, frames.length - 1)),
      };
    }),
  reorderFrame: (fromIndex, toIndex) =>
    set((s) => {
      if (!s.currentAnimation) return {};
      const frames = [...s.currentAnimation.frames];
      const [moved] = frames.splice(fromIndex, 1);
      frames.splice(toIndex, 0, moved);
      return { currentAnimation: { ...s.currentAnimation, frames } };
    }),

  sprites: [],
  addSprite: (sprite) => set((s) => ({ sprites: [...s.sprites, sprite] })),
  updateSprite: (id, updates) =>
    set((s) => ({
      sprites: s.sprites.map((sp) => (sp.id === id ? { ...sp, ...updates } : sp)),
    })),

  fighterPacks: [],
  setFighterPacks: (packs) => set({ fighterPacks: packs }),
  addFighterPack: (pack) => set((s) => ({ fighterPacks: [...s.fighterPacks, pack] })),
  updateFighterPack: (id, updates) =>
    set((s) => ({
      fighterPacks: s.fighterPacks.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  isPlaying: false,
  playbackSpeed: 1,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.25, Math.min(4, speed)) }),
}));
