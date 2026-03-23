import { AnimationType, type AnimationTemplate } from "@/types";

/** Prompt templates for generating specific animation types from a base character. */

export function buildAnimationPrompt(
  baseDescription: string,
  animationType: AnimationType,
  frameIndex: number,
  totalFrames: number
): string {
  const poseDesc = ANIMATION_POSE_DESCRIPTIONS[animationType];
  const frameDesc = getFrameDescription(animationType, frameIndex, totalFrames);

  return `${baseDescription}. ${poseDesc} Frame ${frameIndex + 1} of ${totalFrames}: ${frameDesc}. CRITICAL: The character's appearance, outfit, colors, and proportions MUST be IDENTICAL to the base character design. Only the pose/action changes — everything else (clothing, hair, skin color, accessories, outline style) stays exactly the same.`;
}

const ANIMATION_POSE_DESCRIPTIONS: Record<AnimationType, string> = {
  [AnimationType.IDLE]: "Character standing in a relaxed fighting stance, slight breathing motion",
  [AnimationType.WALK]: "Character walking forward in a fighting game walk cycle",
  [AnimationType.RUN]: "Character running forward with urgent momentum",
  [AnimationType.JUMP]: "Character performing a vertical jump",
  [AnimationType.CROUCH]: "Character crouching down into a low defensive position",
  [AnimationType.PUNCH]: "Character throwing a straight punch attack",
  [AnimationType.KICK]: "Character performing a mid-height kick attack",
  [AnimationType.SPECIAL]: "Character performing a special energy attack with dramatic effect",
  [AnimationType.HURT]: "Character being hit and recoiling in pain",
  [AnimationType.KO]: "Character being knocked out and falling to the ground",
  [AnimationType.BLOCK]: "Character raising arms in a defensive blocking pose",
  [AnimationType.INTRO]: "Character entering the stage with a dramatic entrance pose",
  [AnimationType.WIN]: "Character celebrating victory with a triumphant pose",
};

function getFrameDescription(type: AnimationType, frame: number, total: number): string {
  const progress = frame / (total - 1); // 0 to 1

  switch (type) {
    case AnimationType.IDLE:
      return progress < 0.5 ? "breathing in, slight upward motion" : "breathing out, slight downward motion";
    case AnimationType.WALK:
      return `walk cycle at ${Math.round(progress * 100)}% - ${getWalkPhase(progress)}`;
    case AnimationType.RUN:
      return `run cycle at ${Math.round(progress * 100)}% - ${getRunPhase(progress)}`;
    case AnimationType.JUMP:
      if (progress < 0.2) return "crouching down preparing to jump";
      if (progress < 0.5) return "ascending, legs tucked";
      if (progress < 0.8) return "at peak of jump, arms up";
      return "descending, preparing to land";
    case AnimationType.PUNCH:
      if (progress < 0.3) return "winding up, pulling fist back";
      if (progress < 0.6) return "extending fist forward, full punch";
      return "retracting fist, returning to stance";
    case AnimationType.KICK:
      if (progress < 0.3) return "lifting leg, preparing kick";
      if (progress < 0.6) return "leg fully extended in kick";
      return "retracting leg, returning to stance";
    case AnimationType.SPECIAL:
      if (progress < 0.3) return "gathering energy, glowing effect beginning";
      if (progress < 0.6) return "releasing energy attack, maximum effect";
      return "energy dissipating, returning to stance";
    case AnimationType.HURT:
      if (progress < 0.5) return "initial impact, head snapping back";
      return "recoiling from hit, stumbling";
    case AnimationType.KO:
      if (progress < 0.3) return "heavy impact, body arching back";
      if (progress < 0.7) return "falling backwards/sideways";
      return "lying on ground, defeated";
    case AnimationType.BLOCK:
      return progress < 0.5 ? "raising guard, arms coming up" : "holding block position firmly";
    case AnimationType.INTRO:
      if (progress < 0.4) return "entering from side, dramatic entrance";
      if (progress < 0.7) return "striking a ready pose";
      return "settling into fighting stance";
    case AnimationType.WIN:
      if (progress < 0.3) return "beginning victory pose";
      if (progress < 0.7) return "triumphant gesture, arms raised or special pose";
      return "holding victory pose";
    default:
      return `frame at ${Math.round(progress * 100)}% progress`;
  }
}

function getWalkPhase(progress: number): string {
  const phases = ["contact (heel strike)", "passing (legs crossing)", "contact (other foot)", "passing (legs crossing)"];
  return phases[Math.floor(progress * phases.length) % phases.length];
}

function getRunPhase(progress: number): string {
  const phases = ["push off", "flight phase", "landing", "drive forward"];
  return phases[Math.floor(progress * phases.length) % phases.length];
}

/** Get key frame indices for "key frames only" mode. Returns [first, peak, last]. */
export function getKeyFrameIndices(totalFrames: number): number[] {
  if (totalFrames <= 3) return Array.from({ length: totalFrames }, (_, i) => i);
  const mid = Math.floor(totalFrames / 2);
  return [0, mid, totalFrames - 1];
}
