import { AnimationType, type AnimationTemplate, type LoopMode } from "@/types";

export const ANIMATION_TEMPLATES: AnimationTemplate[] = [
  {
    type: AnimationType.IDLE,
    label: "Idle",
    defaultFrameCount: 6,
    defaultDelay: 150,
    defaultLoop: "loop" as LoopMode,
    description: "Breathing/stance animation while standing still",
  },
  {
    type: AnimationType.WALK,
    label: "Walk",
    defaultFrameCount: 8,
    defaultDelay: 100,
    defaultLoop: "loop" as LoopMode,
    description: "Walking forward cycle",
  },
  {
    type: AnimationType.RUN,
    label: "Run",
    defaultFrameCount: 8,
    defaultDelay: 80,
    defaultLoop: "loop" as LoopMode,
    description: "Running forward cycle",
  },
  {
    type: AnimationType.JUMP,
    label: "Jump",
    defaultFrameCount: 6,
    defaultDelay: 100,
    defaultLoop: "once" as LoopMode,
    description: "Vertical jump from crouch to peak to landing",
  },
  {
    type: AnimationType.CROUCH,
    label: "Crouch",
    defaultFrameCount: 3,
    defaultDelay: 80,
    defaultLoop: "once" as LoopMode,
    description: "Crouching down into low position",
  },
  {
    type: AnimationType.PUNCH,
    label: "Punch",
    defaultFrameCount: 5,
    defaultDelay: 60,
    defaultLoop: "once" as LoopMode,
    description: "Standing punch attack",
  },
  {
    type: AnimationType.KICK,
    label: "Kick",
    defaultFrameCount: 5,
    defaultDelay: 70,
    defaultLoop: "once" as LoopMode,
    description: "Standing kick attack",
  },
  {
    type: AnimationType.SPECIAL,
    label: "Special",
    defaultFrameCount: 8,
    defaultDelay: 80,
    defaultLoop: "once" as LoopMode,
    description: "Special/energy attack move",
  },
  {
    type: AnimationType.HURT,
    label: "Hurt",
    defaultFrameCount: 3,
    defaultDelay: 80,
    defaultLoop: "once" as LoopMode,
    description: "Getting hit reaction",
  },
  {
    type: AnimationType.KO,
    label: "KO",
    defaultFrameCount: 7,
    defaultDelay: 100,
    defaultLoop: "once" as LoopMode,
    description: "Knockout falling to ground animation",
  },
  {
    type: AnimationType.BLOCK,
    label: "Block",
    defaultFrameCount: 3,
    defaultDelay: 60,
    defaultLoop: "once" as LoopMode,
    description: "Raising guard to block attacks",
  },
  {
    type: AnimationType.INTRO,
    label: "Intro",
    defaultFrameCount: 10,
    defaultDelay: 100,
    defaultLoop: "once" as LoopMode,
    description: "Character introduction/entrance animation",
  },
  {
    type: AnimationType.WIN,
    label: "Win",
    defaultFrameCount: 10,
    defaultDelay: 100,
    defaultLoop: "once" as LoopMode,
    description: "Victory celebration animation",
  },
];

export function getTemplate(type: AnimationType): AnimationTemplate {
  const t = ANIMATION_TEMPLATES.find((t) => t.type === type);
  if (!t) throw new Error(`Unknown animation type: ${type}`);
  return t;
}

export function getTotalDefaultFrames(): number {
  return ANIMATION_TEMPLATES.reduce((sum, t) => sum + t.defaultFrameCount, 0);
}

export function getKeyFrameCount(): number {
  return ANIMATION_TEMPLATES.reduce((sum, t) => sum + Math.min(3, t.defaultFrameCount), 0);
}
