import { AnimationType } from "@/types";

/** Options for enriching animation prompts with character appearance details. */
export interface AnimationPromptOptions {
  /** AI-generated description of the character's visual appearance (from analyzeSprite). */
  characterAppearance?: string;
  /** Pixel-extracted palette description. */
  paletteInfo?: string;
}

/** Prompt templates for generating specific animation types from a base character. */

export function buildAnimationPrompt(
  baseDescription: string,
  animationType: AnimationType,
  frameIndex: number,
  totalFrames: number,
  options?: AnimationPromptOptions,
): string {
  const progress = totalFrames > 1 ? frameIndex / (totalFrames - 1) : 0;
  const poseDesc = ANIMATION_POSE_DESCRIPTIONS[animationType];
  const frameDesc = getFrameDescription(animationType, frameIndex, totalFrames);
  const bodyPositions = getBodyPartPositions(animationType, progress);

  const sections: string[] = [];

  // Section 1 — Character identity (most important, placed first for model attention)
  sections.push(`CHARACTER IDENTITY — preserve this EXACTLY:`);
  sections.push(baseDescription);
  if (options?.characterAppearance) {
    sections.push(`VISUAL DETAILS: ${options.characterAppearance}`);
  }
  if (options?.paletteInfo) {
    sections.push(`COLOR PALETTE: ${options.paletteInfo}`);
  }

  // Section 2 — Animation context
  sections.push(``);
  sections.push(`ANIMATION: ${animationType.toUpperCase()} — Frame ${frameIndex + 1} of ${totalFrames}`);
  sections.push(`Motion: ${poseDesc}`);
  sections.push(`This frame: ${frameDesc}`);

  // Section 3 — Explicit body part positions (the key missing piece)
  sections.push(``);
  sections.push(`EXACT BODY PART POSITIONS FOR THIS FRAME:`);
  sections.push(`- Head/face: ${bodyPositions.head}`);
  sections.push(`- Shoulders: ${bodyPositions.shoulders}`);
  sections.push(`- Torso/spine: ${bodyPositions.torso}`);
  sections.push(`- Hips/pelvis: ${bodyPositions.hips}`);
  sections.push(`- Left arm: ${bodyPositions.leftArm}`);
  sections.push(`- Left hand: ${bodyPositions.leftHand}`);
  sections.push(`- Right arm: ${bodyPositions.rightArm}`);
  sections.push(`- Right hand: ${bodyPositions.rightHand}`);
  sections.push(`- Left leg: ${bodyPositions.leftLeg}`);
  sections.push(`- Left foot: ${bodyPositions.leftFoot}`);
  sections.push(`- Right leg: ${bodyPositions.rightLeg}`);
  sections.push(`- Right foot: ${bodyPositions.rightFoot}`);
  sections.push(`- Weight/balance: ${bodyPositions.weight}`);

  // Section 4 — Consistency rules
  sections.push(``);
  sections.push(`STRICT CONSISTENCY RULES:`);
  sections.push(`• Clothing, colors, hair, skin tone, accessories, proportions, outline MUST be IDENTICAL to the base character`);
  sections.push(`• ONLY the body pose and limb positions change between frames`);
  sections.push(`• Use the EXACT same color palette — no new colors, no shifted hues`);
  sections.push(`• Same head-to-body ratio, limb thickness, and overall size`);
  sections.push(`• Do NOT add any text, letters, words, numbers, labels, or watermarks to the image — the sprite must contain only the character artwork`);

  return sections.join('\n');
}

const ANIMATION_POSE_DESCRIPTIONS: Record<AnimationType, string> = {
  [AnimationType.IDLE]: "Character standing in a relaxed fighting stance with weight slightly on the back foot, arms loosely raised, subtle breathing motion visible in the torso rising and falling",
  [AnimationType.WALK]: "Character walking forward with a clear stride — legs alternate stepping, arms swing opposite to legs, torso stays upright with a slight forward lean, feet visibly contact the ground",
  [AnimationType.RUN]: "Character running forward with knees driving high, arms pumping vigorously, body leaning forward at roughly 15 degrees, hair and loose clothing trailing behind",
  [AnimationType.JUMP]: "Character performing a vertical jump with visible crouch preparation, explosive upward push through the legs, and tucked-limb airborne pose",
  [AnimationType.CROUCH]: "Character lowering their center of gravity by bending both knees deeply, torso hunching forward, arms held close for defense",
  [AnimationType.PUNCH]: "Character throwing a forceful straight punch — rear foot pivots, hips rotate into the strike, punching arm extends fully from the shoulder while the other arm guards the face",
  [AnimationType.KICK]: "Character executing a standing kick — planting firmly on the support leg, the kicking leg swings up from the hip with the knee extending, torso leans slightly away for counterbalance",
  [AnimationType.SPECIAL]: "Character channeling stylized energy — body winds up, energy gathers visibly, then releases in a dramatic full-body motion with glowing effects",
  [AnimationType.HURT]: "Character reacting to a hit — head snaps back, torso bends at the impact point, arms fling outward momentarily, one foot slides back",
  [AnimationType.KO]: "Character collapsing — knees buckle first, body tilts and falls backward or sideways, arms go limp, ending flat on the ground",
  [AnimationType.BLOCK]: "Character bracing for impact — both forearms raised in front of the face and torso, knees bent slightly, weight centered and grounded",
  [AnimationType.INTRO]: "Character making a dramatic stage entrance — stepping or landing into frame with a signature pose, transitioning into their fighting stance",
  [AnimationType.WIN]: "Character celebrating victory — straightening up tall, performing a triumphant gesture (fist pump, arms crossed, or signature taunt), confident stance",
};

function getFrameDescription(type: AnimationType, frame: number, total: number): string {
  const progress = frame / (total - 1); // 0 to 1

  switch (type) {
    case AnimationType.IDLE:
      if (progress < 0.25) return "chest rises slightly as character breathes in, weight shifts to back foot";
      if (progress < 0.5) return "chest at peak height, shoulders relaxed, slight sway";
      if (progress < 0.75) return "chest lowers as character breathes out, weight shifts to front foot";
      return "settling back to neutral stance, arms drift slightly";
    case AnimationType.WALK:
      return `walk cycle at ${Math.round(progress * 100)}% — ${getWalkPhase(progress)}`;
    case AnimationType.RUN:
      return `run cycle at ${Math.round(progress * 100)}% — ${getRunPhase(progress)}`;
    case AnimationType.CROUCH:
      if (progress < 0.35) return "beginning to lower — knees bending, hips pushing back, torso tilting forward, arms drawing inward";
      if (progress < 0.7) return "deep crouch — thighs nearly parallel to ground, weight on balls of feet, arms held tight for defense, head ducked";
      return "fully settled in low position, center of gravity at its lowest, ready to spring or block";
    case AnimationType.JUMP:
      if (progress < 0.15) return "bending knees deeply into a crouch, arms swinging back, preparing to launch";
      if (progress < 0.35) return "legs pushing off the ground explosively, body straightening upward, arms sweeping up";
      if (progress < 0.55) return "fully airborne ascending, knees tucking toward chest, arms raised";
      if (progress < 0.75) return "at the apex of the jump, body momentarily weightless, limbs spread";
      if (progress < 0.9) return "descending, legs extending downward, arms lowering for balance";
      return "feet touching ground, knees bending to absorb impact, returning to stance";
    case AnimationType.PUNCH:
      if (progress < 0.2) return "rear shoulder pulls back, fist cocks beside the ear, hips coil, weight loads onto back leg";
      if (progress < 0.4) return "hips snap forward, rear foot pivots, punching arm drives out from the shoulder";
      if (progress < 0.6) return "arm fully extended, fist at target height, opposite arm guards the chin, body turned sideways";
      if (progress < 0.8) return "fist retracting, hips unwinding, weight shifting back to center";
      return "arm returned to guard position, feet resettled in fighting stance";
    case AnimationType.KICK:
      if (progress < 0.2) return "weight shifts onto the support leg, kicking knee lifts toward the chest, arms adjust for balance";
      if (progress < 0.4) return "kicking leg extends outward from the hip, knee straightens, torso leans away as counterbalance";
      if (progress < 0.6) return "leg at full extension, foot at strike height, support leg slightly bent, body forms a strong diagonal line";
      if (progress < 0.8) return "kicking leg retracting, knee bending, torso returning upright";
      return "foot returns to ground, body resets to balanced fighting stance";
    case AnimationType.SPECIAL:
      if (progress < 0.2) return "body winds up, arms pulling inward, knees bending, visible energy starting to gather";
      if (progress < 0.4) return "energy concentrates between the hands, body coils tighter, glowing particles intensify";
      if (progress < 0.6) return "explosive release — arms thrust forward or outward, energy burst erupts, body fully extended";
      if (progress < 0.8) return "energy wave expanding, body held in dramatic extended pose, effects at maximum";
      return "energy fading, body relaxing from extended pose, arms lowering back to stance";
    case AnimationType.HURT:
      if (progress < 0.35) return "head and torso snap back from impact, arms fly outward, rear foot slides back";
      if (progress < 0.65) return "body hunched forward at the point of impact, face grimacing, knees wobbling";
      return "straightening up, regaining footing, arms returning to guard position";
    case AnimationType.KO:
      if (progress < 0.15) return "eyes wide from the final hit, head snapping back, body stiffening";
      if (progress < 0.35) return "knees buckling, arms going limp, body beginning to tilt backward";
      if (progress < 0.55) return "falling — torso angled roughly 45 degrees, legs giving way, one arm trailing";
      if (progress < 0.75) return "body nearly horizontal, about to hit the ground";
      if (progress < 0.9) return "hitting the ground with a bounce, limbs splayed";
      return "lying flat on the ground, motionless, completely defeated";
    case AnimationType.BLOCK:
      if (progress < 0.35) return "arms rising quickly, forearms crossing in front of face and chest, knees bending";
      if (progress < 0.7) return "full block position — forearms braced, elbows tight, weight low and centered, absorbing impact";
      return "holding firm block, muscles tensed, slight pushback visible in the feet";
    case AnimationType.INTRO:
      if (progress < 0.25) return "character appearing at the edge of the stage, body silhouetted or partially visible";
      if (progress < 0.5) return "stepping or landing into full view, dramatic pose mid-motion";
      if (progress < 0.75) return "performing a signature gesture — pointing, cracking knuckles, or flexing";
      return "settling into ready fighting stance, eyes locked forward, fully present";
    case AnimationType.WIN:
      if (progress < 0.25) return "straightening from fighting stance, tension releasing, chest expanding";
      if (progress < 0.5) return "performing victory gesture — fist pump skyward, arms crossed confidently, or signature taunt";
      if (progress < 0.75) return "holding triumphant pose at peak, expression confident or smirking";
      return "relaxing into a proud standing pose, victory clearly established";
    default:
      return `frame at ${Math.round(progress * 100)}% progress`;
  }
}

function getWalkPhase(progress: number): string {
  const phases = [
    "right foot forward heel-striking the ground, left leg behind pushing off, left arm swings forward and right arm swings back",
    "right foot flat on ground bearing weight, left leg passes underneath the body, arms at sides mid-swing",
    "left foot forward heel-striking the ground, right leg behind pushing off, right arm swings forward and left arm swings back",
    "left foot flat on ground bearing weight, right leg passes underneath the body, arms at sides mid-swing",
  ];
  return phases[Math.floor(progress * phases.length) % phases.length];
}

function getRunPhase(progress: number): string {
  const phases = [
    "right foot pushing off the ground hard, left knee driving up high in front, right arm pumping back, body leaning forward",
    "both feet off the ground in flight, left knee still high, arms in mid-pump, body airborne and tilted forward",
    "left foot landing ahead, right leg trailing behind, left arm pumping back, absorbing impact through bent knee",
    "left foot planted and driving forward, right knee now driving up high, left arm swings back, body leaning forward with momentum",
  ];
  return phases[Math.floor(progress * phases.length) % phases.length];
}

// ---- Body part positions per animation frame ----
// Uses absolute left/right (character facing right) so limb positions are unambiguous.

interface BodyPartPositions {
  head: string;
  shoulders: string;
  torso: string;
  hips: string;
  leftArm: string;
  leftHand: string;
  rightArm: string;
  rightHand: string;
  leftLeg: string;
  leftFoot: string;
  rightLeg: string;
  rightFoot: string;
  weight: string;
}

function getBodyPartPositions(type: AnimationType, progress: number): BodyPartPositions {
  switch (type) {
    case AnimationType.WALK: return getWalkBodyPositions(progress);
    case AnimationType.RUN: return getRunBodyPositions(progress);
    case AnimationType.IDLE: return getIdleBodyPositions(progress);
    case AnimationType.JUMP: return getJumpBodyPositions(progress);
    case AnimationType.PUNCH: return getPunchBodyPositions(progress);
    case AnimationType.KICK: return getKickBodyPositions(progress);
    case AnimationType.CROUCH: return getCrouchBodyPositions(progress);
    case AnimationType.HURT: return getHurtBodyPositions(progress);
    case AnimationType.KO: return getKOBodyPositions(progress);
    case AnimationType.BLOCK: return getBlockBodyPositions(progress);
    case AnimationType.SPECIAL: return getSpecialBodyPositions(progress);
    case AnimationType.INTRO: return getIntroBodyPositions(progress);
    case AnimationType.WIN: return getWinBodyPositions(progress);
    default:
      return {
        head: "facing right, level gaze",
        shoulders: "level, neutral",
        torso: "upright, neutral position",
        hips: "level, centered",
        leftArm: "relaxed at side",
        leftHand: "loosely open at side",
        rightArm: "relaxed at side",
        rightHand: "loosely open at side",
        leftLeg: "standing straight",
        leftFoot: "flat on ground",
        rightLeg: "standing straight",
        rightFoot: "flat on ground",
        weight: "evenly distributed on both feet",
      };
  }
}

/**
 * Walk cycle — 8 phases (mirrored). Character faces right.
 * Key biomechanics: arms swing opposite to legs, hips tilt toward support leg,
 * shoulders counter-rotate to hips, feet go heel→flat→toe-off.
 */
function getWalkBodyPositions(progress: number): BodyPartPositions {
  const p = progress % 1;

  if (p < 0.125) {
    // Right heel strike / contact
    return {
      head: "level, facing right, chin neutral, eyes forward",
      shoulders: "counter-rotating slightly — left shoulder forward, right shoulder back (opposite to hips)",
      torso: "upright with very slight forward lean (~5°), spine straight",
      hips: "tilting slightly — right hip forward with the stepping right leg, left hip back",
      leftArm: "swinging FORWARD, elbow bent ~90°, hand at waist height (opposite to right leg forward)",
      leftHand: "loosely fisted, at waist level in front of body",
      rightArm: "swinging BACK, elbow slightly bent, behind the hip",
      rightHand: "loosely fisted, behind hip level",
      leftLeg: "BEHIND body, ball of left foot still on ground, knee bent ~30°, pushing off",
      leftFoot: "on ball/toes, heel lifted, about to leave ground",
      rightLeg: "FORWARD, extended in front, knee nearly straight, just making ground contact",
      rightFoot: "heel striking the ground, toes pointing slightly upward",
      weight: "transitioning from left (back) foot to right (front) foot, landing on right heel",
    };
  }
  if (p < 0.25) {
    // Right foot loading / left toe-off
    return {
      head: "level, facing right, slight bob upward",
      shoulders: "rotating back toward neutral, leveling out",
      torso: "upright, settling over right leg, spine vertical",
      hips: "leveling as weight centers over right foot",
      leftArm: "passing alongside body from front to back, elbow bent",
      leftHand: "loosely fisted, passing hip level",
      rightArm: "passing alongside body from back to front, elbow bent",
      rightHand: "loosely fisted, passing hip level",
      leftLeg: "lifting OFF ground — toe leaving surface, knee starting to bend and swing forward",
      leftFoot: "lifted off ground entirely, toes just cleared the surface",
      rightLeg: "bearing weight, foot rolling from heel to flat, knee bending slightly to absorb",
      rightFoot: "flat on ground, full contact, accepting body weight",
      weight: "shifting fully onto right foot, body rising slightly at highest point in stride",
    };
  }
  if (p < 0.375) {
    // Left leg passing / right midstance — body at HIGHEST point
    return {
      head: "at highest point in stride, facing right, chin level",
      shoulders: "level, beginning to counter-rotate for next phase — right shoulder starting forward",
      torso: "fully upright, directly over right leg, body at maximum height in walk cycle",
      hips: "level, centered directly over right support foot",
      leftArm: "swinging backward, elbow bent ~80°, hand moving behind body",
      leftHand: "loosely fisted, approaching position behind hip",
      rightArm: "swinging forward, elbow bent ~80°, hand rising in front",
      rightHand: "loosely fisted, rising toward waist height in front",
      leftLeg: "OFF GROUND entirely, knee bent ~90°, thigh swinging forward, shin hanging below knee, passing alongside right knee",
      leftFoot: "off ground, dangling below bent knee, pointed slightly down",
      rightLeg: "straight support column, bearing ALL weight, knee slightly bent (~10°)",
      rightFoot: "flat on ground, full weight, directly under center of gravity",
      weight: "100% on right foot, center of gravity at highest point, balanced directly over support leg",
    };
  }
  if (p < 0.5) {
    // Left leg reaching forward / right about to push
    return {
      head: "level, facing right, beginning to lower from peak",
      shoulders: "counter-rotating — right shoulder now forward, left shoulder back",
      torso: "slight forward lean (~3°), preparing for next contact",
      hips: "tilting — left hip driving forward with the reaching left leg",
      leftArm: "now extended BACK, elbow slightly bent, hand behind hip (opposite to forward left leg)",
      leftHand: "loosely fisted, behind the hip",
      rightArm: "now extended FORWARD, elbow bent ~90°, hand at waist height (opposite to rear right leg)",
      rightHand: "loosely fisted, at waist level in front",
      leftLeg: "extending FORWARD, knee straightening, foot reaching for next heel strike",
      leftFoot: "reaching toward ground ahead, toes tilting up for heel strike",
      rightLeg: "now BEHIND body, on ball of foot, about to push off, knee bending",
      rightFoot: "on ball and toes, heel lifted, generating push-off force",
      weight: "shifting forward, about to transfer to left foot on contact",
    };
  }
  // Mirror half — left side forward
  if (p < 0.625) {
    // Left heel strike / contact — mirror of phase 0
    return {
      head: "level, facing right, chin neutral, eyes forward",
      shoulders: "counter-rotating — right shoulder forward, left shoulder back",
      torso: "upright with very slight forward lean (~5°), spine straight",
      hips: "tilting — left hip forward with stepping left leg, right hip back",
      leftArm: "swinging BACK, elbow slightly bent, behind the hip (opposite to forward left leg)",
      leftHand: "loosely fisted, behind hip level",
      rightArm: "swinging FORWARD, elbow bent ~90°, hand at waist height (opposite to right leg behind)",
      rightHand: "loosely fisted, at waist level in front of body",
      leftLeg: "FORWARD, extended in front, knee nearly straight, just making ground contact",
      leftFoot: "heel striking the ground, toes pointing slightly upward",
      rightLeg: "BEHIND body, ball of right foot still on ground, knee bent ~30°, pushing off",
      rightFoot: "on ball/toes, heel lifted, about to leave ground",
      weight: "transitioning from right (back) foot to left (front) foot, landing on left heel",
    };
  }
  if (p < 0.75) {
    // Left foot loading / right toe-off — mirror
    return {
      head: "level, facing right, slight bob upward",
      shoulders: "rotating back toward neutral, leveling out",
      torso: "upright, settling over left leg, spine vertical",
      hips: "leveling as weight centers over left foot",
      leftArm: "passing alongside body, elbow bent, transitioning backward",
      leftHand: "loosely fisted, passing hip level",
      rightArm: "passing alongside body, elbow bent, transitioning forward",
      rightHand: "loosely fisted, passing hip level",
      leftLeg: "bearing weight, foot rolling from heel to flat, knee bending to absorb",
      leftFoot: "flat on ground, full contact, accepting body weight",
      rightLeg: "lifting OFF ground — toe leaving surface, knee bending and swinging forward",
      rightFoot: "lifted off ground entirely, toes just cleared the surface",
      weight: "shifting fully onto left foot, body rising to highest point",
    };
  }
  if (p < 0.875) {
    // Right leg passing / left midstance — body at HIGHEST point, mirror
    return {
      head: "at highest point in stride, facing right, chin level",
      shoulders: "level, beginning to counter-rotate — left shoulder starting forward",
      torso: "fully upright, directly over left leg, body at maximum height",
      hips: "level, centered directly over left support foot",
      leftArm: "swinging forward, elbow bent ~80°, hand rising in front",
      leftHand: "loosely fisted, rising toward waist height",
      rightArm: "swinging backward, elbow bent ~80°, hand behind body",
      rightHand: "loosely fisted, approaching position behind hip",
      leftLeg: "straight support column, bearing ALL weight, knee slightly bent (~10°)",
      leftFoot: "flat on ground, full weight, directly under center of gravity",
      rightLeg: "OFF GROUND entirely, knee bent ~90°, thigh swinging forward, shin hanging below knee, passing alongside left knee",
      rightFoot: "off ground, dangling below bent knee, pointed slightly down",
      weight: "100% on left foot, center of gravity at highest point, balanced directly over support leg",
    };
  }
  // Right leg reaching forward / left about to push — mirror
  return {
    head: "level, facing right, beginning to lower from peak",
    shoulders: "counter-rotating — left shoulder now forward, right shoulder back",
    torso: "slight forward lean (~3°), preparing for next contact",
    hips: "tilting — right hip driving forward with the reaching right leg",
    leftArm: "now extended FORWARD, elbow bent ~90°, hand at waist height",
    leftHand: "loosely fisted, at waist level in front",
    rightArm: "now extended BACK, elbow slightly bent, hand behind hip",
    rightHand: "loosely fisted, behind the hip",
    leftLeg: "now BEHIND body, on ball of foot, about to push off, knee bending",
    leftFoot: "on ball and toes, heel lifted, generating push-off force",
    rightLeg: "extending FORWARD, knee straightening, foot reaching for next heel strike",
    rightFoot: "reaching toward ground ahead, toes tilting up for heel strike",
    weight: "shifting forward, about to transfer to right foot on contact",
  };
}

/**
 * Run cycle — faster than walk, includes flight phase (both feet off ground).
 * Stronger arm pump, more trunk lean, higher knee drive.
 */
function getRunBodyPositions(progress: number): BodyPartPositions {
  const p = progress % 1;

  if (p < 0.125) {
    // Right foot push-off, left knee driving up
    return {
      head: "facing right, tilted forward ~10°, determined expression",
      shoulders: "driving rotation — right shoulder back (push-off side), left shoulder forward",
      torso: "leaning forward ~15°, chest leading, core tight",
      hips: "driving forward, left hip leading, rotated into stride",
      leftArm: "pumping BACK hard, elbow bent ~90°, hand well behind hip",
      leftHand: "tightly fisted, behind hip level, arm at max back position",
      rightArm: "pumping FORWARD hard, elbow bent ~90°, fist rising near chin height",
      rightHand: "tightly fisted, at chin/face height in front",
      leftLeg: "knee driving UP HIGH toward chest, thigh nearly horizontal, lower leg hanging below knee",
      leftFoot: "off ground, tucked under bent knee, pointed slightly down",
      rightLeg: "extended far behind, toes pushing off ground, ankle fully extended, leg nearly straight",
      rightFoot: "only toes on ground, pushing off with maximum force, about to leave ground",
      weight: "pushing off right foot explosively, body driving forward and upward into flight",
    };
  }
  if (p < 0.25) {
    // FLIGHT PHASE — both feet off ground
    return {
      head: "facing right, tilted forward with momentum, eyes focused ahead",
      shoulders: "fully counter-rotated — right shoulder forward at peak, left back",
      torso: "leaning forward ~15-20°, core engaged, entire body airborne",
      hips: "in mid-air, rotating through stride",
      leftArm: "at peak BACK position, elbow bent ~90°, hand well behind body",
      leftHand: "tightly fisted, at maximum back swing behind hip",
      rightArm: "at peak FORWARD position, elbow bent ~90°, fist at face height",
      rightHand: "tightly fisted, at face/chin level in front",
      leftLeg: "at maximum knee height, thigh ABOVE horizontal, shin hanging",
      leftFoot: "OFF GROUND, tucked under high knee, no ground contact",
      rightLeg: "trailing behind and UPWARD, knee slightly bent, lifted off ground",
      rightFoot: "OFF GROUND, completely airborne, pointed back",
      weight: "FULLY AIRBORNE — both feet completely off the ground, body in flight phase",
    };
  }
  if (p < 0.375) {
    // Flight to left landing
    return {
      head: "facing right, eyes tracking landing point ahead",
      shoulders: "transitioning — both rotating toward neutral",
      torso: "leaning forward ~15°, bracing for landing impact",
      hips: "rotating, left hip coming down for landing",
      leftArm: "transitioning from back to forward swing, passing alongside body",
      leftHand: "fisted, passing hip level",
      rightArm: "transitioning from forward to back swing, passing alongside body",
      rightHand: "fisted, passing hip level",
      leftLeg: "extending DOWNWARD and slightly forward, preparing for ground contact",
      leftFoot: "reaching toward ground, forefoot angled for landing",
      rightLeg: "swinging forward from behind, knee bent, starting to drive upward",
      rightFoot: "off ground, swinging through",
      weight: "descending from flight, about to land on left forefoot",
    };
  }
  if (p < 0.5) {
    // Left foot landing / absorbing impact
    return {
      head: "facing right, level with slight forward lean",
      shoulders: "driving rotation — left shoulder back (landing side), right shoulder forward",
      torso: "leaning forward ~10°, core braced to absorb landing",
      hips: "absorbing impact, left hip settling over planted left foot",
      leftArm: "now pumping FORWARD, elbow bent ~90°, rising toward chin height",
      leftHand: "tightly fisted, rising in front, at chest level",
      rightArm: "now pumping BACK, elbow bent, swinging behind body",
      rightHand: "tightly fisted, moving behind hip",
      leftLeg: "PLANTED — foot striking ground, knee bending ~30° to absorb impact",
      leftFoot: "forefoot on ground, absorbing landing impact, heel not touching",
      rightLeg: "knee beginning to DRIVE UP and forward, trailing behind but rising",
      rightFoot: "off ground, trailing, starting upward drive",
      weight: "landing on left forefoot, knee flexing to absorb, body decelerating vertically",
    };
  }
  // MIRROR HALF — right side pushoff, right side landing
  if (p < 0.625) {
    // Left foot push-off, right knee driving up — mirror
    return {
      head: "facing right, tilted forward ~10°, determined expression",
      shoulders: "driving rotation — left shoulder back (push-off side), right shoulder forward",
      torso: "leaning forward ~15°, chest leading, core tight",
      hips: "driving forward, right hip leading, rotated into stride",
      leftArm: "pumping FORWARD hard, elbow bent ~90°, fist near chin height",
      leftHand: "tightly fisted, at chin/face height in front",
      rightArm: "pumping BACK hard, elbow bent ~90°, hand well behind hip",
      rightHand: "tightly fisted, behind hip level",
      leftLeg: "extended far behind, toes pushing off ground, ankle fully extended",
      leftFoot: "only toes on ground, pushing off with maximum force, about to leave ground",
      rightLeg: "knee driving UP HIGH toward chest, thigh nearly horizontal, lower leg hanging",
      rightFoot: "off ground, tucked under bent knee, pointed slightly down",
      weight: "pushing off left foot explosively, body driving forward and upward",
    };
  }
  if (p < 0.75) {
    // FLIGHT PHASE mirror
    return {
      head: "facing right, tilted forward with momentum",
      shoulders: "fully counter-rotated — left shoulder forward, right back",
      torso: "leaning forward ~15-20°, core engaged, body airborne",
      hips: "in mid-air, rotating through stride",
      leftArm: "at peak FORWARD position, elbow bent ~90°, fist at face height",
      leftHand: "tightly fisted, at face level in front",
      rightArm: "at peak BACK position, elbow bent ~90°, hand behind body",
      rightHand: "tightly fisted, behind hip at max back swing",
      leftLeg: "trailing behind and UPWARD, slightly bent, lifted off ground",
      leftFoot: "OFF GROUND, pointed back, no contact",
      rightLeg: "at maximum knee height, thigh ABOVE horizontal, shin hanging",
      rightFoot: "OFF GROUND, tucked under high knee",
      weight: "FULLY AIRBORNE — both feet completely off the ground",
    };
  }
  if (p < 0.875) {
    // Flight to right landing
    return {
      head: "facing right, eyes on landing point",
      shoulders: "transitioning toward neutral",
      torso: "leaning forward ~15°, bracing for landing",
      hips: "rotating, right hip coming down",
      leftArm: "transitioning from forward to back, passing body",
      leftHand: "fisted, passing hip level",
      rightArm: "transitioning from back to forward, passing body",
      rightHand: "fisted, passing hip level",
      leftLeg: "swinging forward from behind, knee bent, driving",
      leftFoot: "off ground, swinging through",
      rightLeg: "extending downward and forward, preparing for ground contact",
      rightFoot: "reaching toward ground, forefoot angled for landing",
      weight: "descending from flight, about to land on right forefoot",
    };
  }
  // Right foot landing
  return {
    head: "facing right, level with slight forward lean",
    shoulders: "driving rotation — right shoulder back (landing side), left shoulder forward",
    torso: "leaning forward ~10°, absorbing landing",
    hips: "absorbing impact, right hip over planted right foot",
    leftArm: "now pumping BACK, elbow bent, behind body",
    leftHand: "tightly fisted, behind hip",
    rightArm: "now pumping FORWARD, elbow bent ~90°, rising toward chin",
    rightHand: "tightly fisted, rising toward chin/face level",
    leftLeg: "knee beginning to DRIVE UP, trailing behind but rising",
    leftFoot: "off ground, trailing, starting upward drive",
    rightLeg: "PLANTED — foot striking ground, knee bending ~30° to absorb",
    rightFoot: "forefoot on ground, absorbing landing, heel not touching",
    weight: "landing on right forefoot, knee flexing to absorb impact",
  };
}

function getIdleBodyPositions(progress: number): BodyPartPositions {
  const breathPhase = Math.sin(progress * Math.PI * 2);
  if (breathPhase > 0.5) {
    return {
      head: "facing right, chin slightly raised, relaxed expression, eyes forward",
      shoulders: "relaxed, slightly back, both level",
      torso: "upright, chest slightly expanded (breathing in), spine straight",
      hips: "level, neutral, centered between feet",
      leftArm: "loosely raised in front, elbow bent ~100°, upper arm near body",
      leftHand: "loosely fisted at mid-torso height, relaxed guard position",
      rightArm: "near right side of body, elbow bent ~110°, relaxed",
      rightHand: "loosely fisted near right hip, relaxed guard",
      leftLeg: "forward, knee very slightly bent (~5°), shin vertical",
      leftFoot: "flat on ground, bearing slightly less weight",
      rightLeg: "back, knee slightly bent (~10°), bearing slightly more weight",
      rightFoot: "flat on ground, slightly behind center of gravity",
      weight: "slightly shifted to back (right) foot, relaxed fighting stance, stable",
    };
  }
  if (breathPhase > -0.5) {
    return {
      head: "facing right, level gaze, neutral expression",
      shoulders: "level, neutral, relaxed",
      torso: "upright, neutral chest position (mid-breath), spine straight",
      hips: "level, centered",
      leftArm: "loosely raised, elbow bent ~100°, guard position",
      leftHand: "loosely fisted at mid-torso",
      rightArm: "near hip, elbow bent ~110°",
      rightHand: "loosely fisted near right hip",
      leftLeg: "forward, knee slightly bent",
      leftFoot: "flat on ground",
      rightLeg: "back, knee slightly bent",
      rightFoot: "flat on ground",
      weight: "centered between both feet, balanced stance",
    };
  }
  return {
    head: "facing right, chin slightly lowered, relaxed expression",
    shoulders: "settling slightly forward, relaxed",
    torso: "upright, chest slightly compressed (breathing out), shoulders settling",
    hips: "level, centered",
    leftArm: "loosely raised, elbow bent, guard slightly lower than inhale",
    leftHand: "loosely fisted, slightly lower, relaxed",
    rightArm: "near hip, relaxed, slightly lower",
    rightHand: "loosely fisted near hip",
    leftLeg: "forward, slight knee bend",
    leftFoot: "flat on ground",
    rightLeg: "back, bearing slightly more weight",
    rightFoot: "flat on ground",
    weight: "slightly shifted to front (left) foot, gentle sway forward",
  };
}

function getJumpBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.15) {
    return {
      head: "facing right, looking down slightly, chin tucked, preparing",
      shoulders: "hunched forward and up, compressing with body",
      torso: "hunched forward, bending down into deep crouch, spine curved",
      hips: "pushed back and low, compressed into crouch",
      leftArm: "swinging back and DOWN behind body, elbow slightly bent, loading momentum",
      leftHand: "open or loosely fisted, behind and below hip level",
      rightArm: "swinging back and DOWN alongside left arm, gathering momentum",
      rightHand: "open or loosely fisted, behind and below hip level",
      leftLeg: "deeply bent, thigh near horizontal, knee angle ~60°, foot flat on ground",
      leftFoot: "flat on ground, toes gripping for launch",
      rightLeg: "deeply bent alongside left leg, knee angle ~60°, coiled to spring",
      rightFoot: "flat on ground, toes gripping for launch",
      weight: "low, compressed, loaded on BOTH feet equally, center of gravity at lowest point, ready to explode upward",
    };
  }
  if (progress < 0.35) {
    return {
      head: "facing right, tilting up, looking upward, expression focused",
      shoulders: "pulling upward and back, opening up with the jump",
      torso: "straightening rapidly upward, core engaged, spine extending vertically",
      hips: "driving upward, straightening from crouch",
      leftArm: "sweeping UP and overhead for momentum, elbow extending",
      leftHand: "open, reaching upward above shoulder height",
      rightArm: "sweeping UP and overhead alongside left arm",
      rightHand: "open, reaching upward above shoulder height",
      leftLeg: "pushing hard against ground, knee straightening rapidly, generating upward force",
      leftFoot: "rolling onto toes, heel off ground, pushing off",
      rightLeg: "pushing hard alongside left, knee straightening, last contact with ground",
      rightFoot: "rolling onto toes, about to leave ground entirely",
      weight: "driving upward explosively through both legs, toes as last ground contact",
    };
  }
  if (progress < 0.55) {
    return {
      head: "facing right, looking slightly up, expression focused",
      shoulders: "level or slightly raised, relaxed in air",
      torso: "upright, fully extended, body at peak height",
      hips: "at highest point, slightly forward of center",
      leftArm: "one arm raised above head, elbow slightly bent",
      leftHand: "open or fisted, above head level",
      rightArm: "at shoulder level, slightly spread for balance",
      rightHand: "open, spread for aerial balance",
      leftLeg: "TUCKED UP — knee bent ~90° toward chest, thigh pulled up",
      leftFoot: "OFF GROUND, tucked up under body, pointed slightly down",
      rightLeg: "slightly lower than left, knee bent ~70°, compact air pose",
      rightFoot: "OFF GROUND, tucked, pointed down",
      weight: "FULLY AIRBORNE at apex — body momentarily weightless, maximum height, no ground contact",
    };
  }
  if (progress < 0.75) {
    return {
      head: "facing right, looking downward toward landing spot",
      shoulders: "leveling, arms adjusting for balance",
      torso: "slight forward lean, preparing body for descent",
      hips: "tilting slightly forward, preparing for landing",
      leftArm: "lowering, extending outward/forward for aerial balance",
      leftHand: "open, spread for balance",
      rightArm: "extending to right side for aerial balance",
      rightHand: "open, spread for balance",
      leftLeg: "extending DOWNWARD, knee straightening, reaching for ground",
      leftFoot: "angling toward ground, preparing for landing contact",
      rightLeg: "extending downward alongside left, feet reaching together",
      rightFoot: "angling toward ground, preparing for landing",
      weight: "descending, arms used for balance, legs reaching toward ground",
    };
  }
  if (progress < 0.9) {
    return {
      head: "facing right, bracing for impact, chin slightly tucked",
      shoulders: "bracing, pulling in slightly",
      torso: "slight forward lean, core bracing for landing shock",
      hips: "absorbing impact, pushing back slightly",
      leftArm: "extended forward and down for balance and bracing",
      leftHand: "open, reaching forward for balance",
      rightArm: "extended to side for balance",
      rightHand: "open, stabilizing",
      leftLeg: "foot touching ground, knee bending DEEPLY to absorb impact, acting as shock absorber",
      leftFoot: "forefoot/toes making contact first, absorbing initial shock",
      rightLeg: "touching down alongside left, knee bending to absorb",
      rightFoot: "forefoot/toes contacting ground, knee absorbing shock",
      weight: "feet making ground contact, knees deeply bent absorbing deceleration force",
    };
  }
  return {
    head: "facing right, settling, returning to neutral gaze",
    shoulders: "settling back to level, relaxing from landing",
    torso: "upright, recovering from landing, straightening spine",
    hips: "re-centering between feet",
    leftArm: "returning to guard position at mid-torso, elbow bending",
    leftHand: "loosely fisting, returning to guard",
    rightArm: "returning to side/guard position, elbow bending",
    rightHand: "loosely fisting, at hip level",
    leftLeg: "knees still slightly bent from impact, straightening",
    leftFoot: "flat on ground, weight settling",
    rightLeg: "knees straightening, returning to stance",
    rightFoot: "flat on ground, settling",
    weight: "both feet firmly on ground, center of gravity settling, returning to fighting stance",
  };
}

function getPunchBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.2) {
    // Wind-up / coil
    return {
      head: "facing right, eyes locked on target, jaw set",
      shoulders: "rotating AWAY from target — right shoulder pulled back, left shoulder forward",
      torso: "rotating away (coiling), chest angled ~30° from forward, spine twisting",
      hips: "cocked/coiled — right hip pulled back, storing rotational energy",
      leftArm: "guard arm UP in front of face, elbow tight to body, protecting chin",
      leftHand: "fisted tight, guard position near left cheek/chin",
      rightArm: "pulled BACK, upper arm near body, elbow high and back, loading the punch",
      rightHand: "fist cocked tight beside right ear/chin, knuckles pointing up, ready to fire",
      leftLeg: "front, planted, knee slightly bent (~15°), stable base",
      leftFoot: "flat on ground, slightly turned, anchoring",
      rightLeg: "back, knee bent (~25°), weight loaded, ready to drive rotation",
      rightFoot: "flat on ground, about to pivot on ball for hip rotation",
      weight: "loaded 70% on right (back) foot, body coiled like a spring, storing rotational energy",
    };
  }
  if (progress < 0.4) {
    // Hip rotation / arm extension
    return {
      head: "facing right, eyes on target, expression fierce/focused",
      shoulders: "snapping toward target — right shoulder driving forward, left pulling back",
      torso: "rotating TOWARD target — hips snapping first, shoulders following, kinetic chain unloading",
      hips: "snapping forward — right hip driving toward target, generating rotational force",
      leftArm: "guard still protecting chin but pulling back slightly from rotation",
      leftHand: "fisted, still near left cheek, maintaining guard",
      rightArm: "DRIVING FORWARD from shoulder — elbow extending, arm accelerating, upper arm rotating inward",
      rightHand: "fist ACCELERATING toward target, knuckles rotating to horizontal, wrist straight",
      leftLeg: "front, foot pivoting slightly from hip rotation, knee bent",
      leftFoot: "slightly pivoted, toes turning with hip rotation",
      rightLeg: "back foot pivoting on ball, heel lifting, driving rotation through hips",
      rightFoot: "on BALL of foot, heel lifted ~2cm, ball pivoting to drive hip rotation",
      weight: "transferring rapidly from right to left foot through hip rotation, kinetic chain flowing",
    };
  }
  if (progress < 0.6) {
    // Full extension / impact
    return {
      head: "facing right, focused on impact point, chin slightly tucked",
      shoulders: "fully rotated — right shoulder forward, left shoulder back, shoulders in line with punch",
      torso: "fully rotated, chest angled ~30° past forward, maximum rotation, core tight",
      hips: "fully rotated forward, right hip past center line",
      leftArm: "pulled back to left side of body, guarding ribs, elbow tight",
      leftHand: "fisted, protecting left ribs/solar plexus",
      rightArm: "FULLY EXTENDED — straight from shoulder to fist, arm at full reach, locked out",
      rightHand: "fist at target height, knuckles horizontal, wrist straight and rigid, IMPACT POINT",
      leftLeg: "front, knee slightly bent, anchoring against punch force",
      leftFoot: "flat, firmly planted, absorbing forward force",
      rightLeg: "back, nearly straight, heel off ground, fully rotated",
      rightFoot: "on BALL/toes, heel well off ground, fully rotated outward from hip drive",
      weight: "60% on left (front) foot, body fully committed, maximum extension into the punch",
    };
  }
  if (progress < 0.8) {
    // Retraction
    return {
      head: "facing right, alert, beginning to reset",
      shoulders: "unrotating, coming back toward neutral stance alignment",
      torso: "beginning to unrotate, shoulders coming back to fighting position",
      hips: "unwinding from rotated position, returning to neutral",
      leftArm: "starting to rise back to guard position in front of face",
      leftHand: "fisted, rising toward guard at chin level",
      rightArm: "retracting — elbow bending, pulling fist back from extension",
      rightHand: "fist pulling back toward face/chin, elbow bending",
      leftLeg: "front, stable, knee slightly bent",
      leftFoot: "flat, stable on ground",
      rightLeg: "back heel lowering toward ground, unrotating",
      rightFoot: "heel lowering, returning to flat contact",
      weight: "recentering between both feet, shifting back toward balanced stance",
    };
  }
  // Recovery
  return {
    head: "facing right, alert, eyes forward, returning to guard",
    shoulders: "level, back to fighting-stance alignment",
    torso: "back to neutral facing, spine straight, fighting position",
    hips: "level, centered between feet",
    leftArm: "guard UP, protecting face/chin, elbow bent and tight to body",
    leftHand: "fisted tight, at chin/cheek height, guard position",
    rightArm: "returned to guard — elbow bent, fist near right chin, tight",
    rightHand: "fisted tight, near right chin/cheek, guard fully restored",
    leftLeg: "front, knee slightly bent, fighting stance",
    leftFoot: "flat on ground, fighting stance",
    rightLeg: "back, knee slightly bent, fighting stance",
    rightFoot: "flat on ground, fighting stance resumed",
    weight: "evenly distributed, back in ready fighting stance, balanced",
  };
}

function getKickBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.2) {
    // Chamber — kicking knee drives up
    return {
      head: "facing right, eyes on target, chin level",
      shoulders: "opening slightly for balance, left shoulder dipping slightly",
      torso: "upright, beginning to lean slightly LEFT (away from right kicking leg) for counterbalance",
      hips: "rotating to chamber right leg, right hip lifting",
      leftArm: "extending to left side and slightly behind for balance, elbow bent",
      leftHand: "open, spread for balance at shoulder height",
      rightArm: "at right side, adjusting for balance, near guard position",
      rightHand: "loosely fisted, near right hip/ribs",
      leftLeg: "SUPPORT LEG — planted flat, knee slightly bent (~15°), preparing to bear ALL weight",
      leftFoot: "flat on ground, toes gripping, sole fully planted",
      rightLeg: "KICKING LEG — knee driving UPWARD toward chest, thigh rising, chambering the kick",
      rightFoot: "OFF GROUND, lifted, tucked near right glute as knee chambers upward",
      weight: "shifting ENTIRELY to left (support) leg, right leg lifting for kick",
    };
  }
  if (progress < 0.4) {
    // Extension — kick extending outward
    return {
      head: "facing right, tracking target, focused",
      shoulders: "leaning away from kick, left side drops for counterbalance",
      torso: "leaning LEFT ~10-15° for counterbalance, core braced, spine forming angle",
      hips: "rotating INTO kick, right hip driving the extension forward/outward",
      leftArm: "extended to LEFT side and slightly behind for counterbalance, wider than chamber",
      leftHand: "open, spread wide at shoulder height or above for balance",
      rightArm: "near body, elbow bent, stabilizing",
      rightHand: "loosely fisted, near right ribs",
      leftLeg: "support leg firmly planted, knee bent ~20°, absorbing kicking force reaction",
      leftFoot: "flat on ground, toes may pivot slightly from hip rotation",
      rightLeg: "kicking leg EXTENDING — knee straightening powerfully, shin snapping out from chamber",
      rightFoot: "OFF GROUND, foot accelerating toward target, toes/heel leading the strike",
      weight: "entirely on left support leg, body counterbalancing the extending kick force",
    };
  }
  if (progress < 0.6) {
    // Full extension / impact
    return {
      head: "facing right, focused on impact point, expression fierce",
      shoulders: "significantly tilted — right shoulder higher, left lower, body forming diagonal",
      torso: "leaning LEFT ~15-20°, forming strong diagonal line OPPOSITE to extended right leg, core tight",
      hips: "fully rotated, right hip extended, open for maximum kick reach",
      leftArm: "extended BEHIND and to left for maximum counterbalance",
      leftHand: "open, behind body at shoulder height",
      rightArm: "near body guard position, stabilizing",
      rightHand: "loosely fisted, protecting right side",
      leftLeg: "support leg bearing ALL weight, knee slightly bent (~15°), stable column",
      leftFoot: "flat and firm on ground, all weight concentrated here",
      rightLeg: "FULLY EXTENDED at target height — leg straight, hip-to-toe forms one line, maximum reach",
      rightFoot: "at STRIKE POINT — foot horizontal (side kick) or vertical (front kick), maximum extension",
      weight: "100% on left support leg, body and right leg form a counterbalanced diagonal line",
    };
  }
  if (progress < 0.8) {
    // Retraction
    return {
      head: "facing right, beginning to reset",
      shoulders: "returning to level, straightening",
      torso: "returning toward upright, reducing lean",
      hips: "unrotating, right hip pulling back from extended position",
      leftArm: "pulling back toward guard position from extended balance pose",
      leftHand: "fisting, returning toward guard",
      rightArm: "returning to guard",
      rightHand: "fisting, rising toward guard position",
      leftLeg: "support leg stable, still bearing weight, knee slightly bent",
      leftFoot: "flat on ground, maintaining support",
      rightLeg: "retracting — knee bending, pulling foot back toward body from extension",
      rightFoot: "off ground, shin folding back, foot pulling toward right glute",
      weight: "still mostly on left support leg, right leg retracting, balance recovering",
    };
  }
  // Recovery to stance
  return {
    head: "facing right, alert, settled back into stance",
    shoulders: "level, back to fighting position",
    torso: "upright, fighting position, spine straight",
    hips: "level, centered between feet",
    leftArm: "guard up at face level, elbow bent and tight",
    leftHand: "fisted, at chin guard position",
    rightArm: "guard up, elbow bent, near right side",
    rightHand: "fisted, at chin guard position",
    leftLeg: "front, settling into fighting stance, knee slightly bent",
    leftFoot: "flat on ground, fighting stance",
    rightLeg: "right foot returning to ground, stepping back into fighting distance",
    rightFoot: "touching down, flat on ground, settling into stance",
    weight: "redistributing to both feet, fighting stance resumed, balanced",
  };
}

function getCrouchBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.35) {
    return {
      head: "facing right, ducking DOWN, chin dropping toward chest",
      shoulders: "hunching up toward ears, compressing",
      torso: "bending forward and down, hunching, spine curving forward",
      hips: "pushing back and down, lowering center of gravity",
      leftArm: "pulling inward and down, elbow bending tight, arm compacting",
      leftHand: "fisted, pulling in toward chest/face for defense",
      rightArm: "drawing in, elbow close to ribs, compacting",
      rightHand: "fisted, near right ribs, tight defense",
      leftLeg: "front knee bending deeply (~60°), thigh lowering",
      leftFoot: "flat on ground, weight distributing forward",
      rightLeg: "back knee bending deeply, hips lowering toward right heel",
      rightFoot: "on ball of foot, heel slightly lifted as hips lower",
      weight: "lowering center of gravity, distributing to both deeply bent legs",
    };
  }
  if (progress < 0.7) {
    return {
      head: "facing right at LOW height, eyes looking UP/forward from under brow, alert",
      shoulders: "hunched, nearly at knee level, compressed",
      torso: "hunched low, torso nearly horizontal, shoulders over knees",
      hips: "at minimum height, pushed back, close to ankles",
      leftArm: "held tight to body, forearm vertical protecting midsection",
      leftHand: "fisted, guarding face from low position",
      rightArm: "tucked in, elbow on or near right thigh",
      rightHand: "fisted, guarding right side of face",
      leftLeg: "deeply bent (~45° knee angle), thigh nearly parallel to ground",
      leftFoot: "flat on ground, weight on forefoot",
      rightLeg: "deeply bent, crouching very low, thigh near horizontal",
      rightFoot: "on ball of foot, heel lifted, weight forward",
      weight: "low and centered, ready to spring upward or move laterally",
    };
  }
  return {
    head: "facing right at LOWEST point, peeking forward from minimum height",
    shoulders: "fully compressed, at knee level",
    torso: "fully compressed, as low as possible, curled protective posture",
    hips: "at absolute lowest point, seat nearly at ankle height",
    leftArm: "tight defensive guard from low position, forearm protecting face",
    leftHand: "fisted near face, tight guard",
    rightArm: "covering body, elbow close to right thigh",
    rightHand: "fisted, protecting right side",
    leftLeg: "maximum bend (~40° knee angle), sitting deep into crouch",
    leftFoot: "flat or on forefoot, gripping ground",
    rightLeg: "maximum bend, spring-loaded to explode upward",
    rightFoot: "on ball of foot, heel lifted, spring-loaded",
    weight: "at lowest point, balanced on both legs, coiled and spring-loaded for quick action",
  };
}

function getHurtBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.35) {
    return {
      head: "SNAPPING BACK from impact, face grimacing with pain, hair whipping backward",
      shoulders: "jarred upward and back, left higher than right from asymmetric impact",
      torso: "bending BACKWARD at impact point, chest thrust out involuntarily, spine arching back",
      hips: "pushed backward by impact force, pelvis tilting back",
      leftArm: "flung OUTWARD to the left from the hit force, guard completely broken, elbow straightening",
      leftHand: "fingers splayed open involuntarily from shock, reaching into air",
      rightArm: "flung BACK and outward to right, no control, reactive, elbow straightening",
      rightHand: "fingers splayed open, reactive, no grip control",
      leftLeg: "front foot slightly off ground or lifting from impact force, knee buckling",
      leftFoot: "lifting off ground or barely touching, impact pushing body off balance",
      rightLeg: "back foot sliding BACKWARD from impact force, knee bending, trying to catch balance",
      rightFoot: "sliding back on ground, friction against surface, heel dragging",
      weight: "thrown BACKWARD by the hit, center of gravity behind feet, off-balance and staggering",
    };
  }
  if (progress < 0.65) {
    return {
      head: "tilted, pained expression, eyes squinting or shut, teeth gritted",
      shoulders: "hunched forward, collapsing inward at impact zone",
      torso: "hunched FORWARD at the point of impact, doubled over slightly, clutching",
      hips: "tucked under, body curling inward around impact",
      leftArm: "reaching toward hurt area on body, protective instinct, elbow bent",
      leftHand: "pressing against or reaching toward impact point, fingers partly curled",
      rightArm: "hanging loosely at right side, not yet recovered, elbow slightly bent",
      rightHand: "dangling, loosely open, no grip strength yet",
      leftLeg: "front, unsteady, knee wobbling, barely supporting",
      leftFoot: "on ground but unstable, weight shifting unpredictably",
      rightLeg: "back, planted for stability after sliding, knee bent, catching body",
      rightFoot: "planted on ground, bearing most weight after stagger",
      weight: "off-center, back-weighted, trying to regain balance, staggering backward",
    };
  }
  return {
    head: "returning to level, still pained expression but recovering, eyes reopening",
    shoulders: "lifting back to stance position, still tense",
    torso: "straightening up, re-engaging core, spine uncurling",
    hips: "re-centering between feet, leveling",
    leftArm: "starting to raise back to guard position, elbow bending",
    leftHand: "re-fisting, pulling up toward guard at chin",
    rightArm: "lifting back toward defensive position, elbow bending",
    rightHand: "re-fisting, pulling toward right cheek guard",
    leftLeg: "planting foot firmly again, knee stabilizing",
    leftFoot: "flat on ground, re-establishing contact",
    rightLeg: "weight resettling, adjusting stance width",
    rightFoot: "flat on ground, finding fighting stance position",
    weight: "regaining center of gravity, returning to fighting stance, balance restoring",
  };
}

function getKOBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.15) {
    return {
      head: "snapping back VIOLENTLY, eyes wide/blank/rolled, mouth open",
      shoulders: "jolted back, stiffening from final impact shock",
      torso: "jolted upright/backward from final devastating impact, muscles stiffening briefly",
      hips: "locked, body stiff from knockout shock",
      leftArm: "flying outward uncontrolled to the left, limp, no muscle control",
      leftHand: "fingers splayed, completely limp",
      rightArm: "flying outward to the right, limp, uncontrolled",
      rightHand: "fingers splayed, no grip, limp",
      leftLeg: "stiffening momentarily from shock, locked straight",
      leftFoot: "still on ground but about to lose contact, stiff",
      rightLeg: "stiffening alongside left, locked straight",
      rightFoot: "on ground but body about to topple, stiff",
      weight: "total LOSS of balance control, body stiff as a board, about to topple backward",
    };
  }
  if (progress < 0.35) {
    return {
      head: "falling backward, eyes closed or rolled back, unconscious",
      shoulders: "dropping, all tension lost, limp",
      torso: "tilting backward ~30°, ALL muscle tone lost, body going completely limp",
      hips: "buckling, losing structure, hinging backward",
      leftArm: "hanging limp at left side, trailing the fall, no control",
      leftHand: "limp, fingers slightly curled, dangling",
      rightArm: "dropping loosely at right side, gravity pulling down",
      rightHand: "limp, fingers relaxed, no grip",
      leftLeg: "knee BUCKLING inward, no longer supporting body weight",
      leftFoot: "sliding, losing contact with ground as knees fold",
      rightLeg: "knee giving way, legs folding under body weight",
      rightFoot: "losing ground contact, being dragged by falling body",
      weight: "COLLAPSING — knees failing completely, body toppling backward, no muscle resistance",
    };
  }
  if (progress < 0.55) {
    return {
      head: "tilted back, almost horizontal, fully unconscious, facing up",
      shoulders: "falling, one shoulder leading the impact toward ground",
      torso: "angled ~45-60° from vertical, falling freely",
      hips: "below shoulders now, legs splaying",
      leftArm: "limp, trailing the fall, one arm might be outstretched from impact",
      leftHand: "limp, fingers loose, no control",
      rightArm: "completely limp at right side, gravity dragging down",
      rightHand: "limp, open",
      leftLeg: "bent and splayed, no muscle control, being pulled by gravity",
      leftFoot: "off ground or dragging, no weight",
      rightLeg: "collapsed, folding under body, no control",
      rightFoot: "off ground, legs folding",
      weight: "past the point of no return, in freefall toward ground, body ~45° from horizontal",
    };
  }
  if (progress < 0.75) {
    return {
      head: "nearly on ground, facing up, unconscious",
      shoulders: "about to hit ground, or one shoulder already contacting",
      torso: "nearly horizontal, back about to contact ground",
      hips: "near ground level",
      leftArm: "splayed outward to left, about to hit ground or already contacting",
      leftHand: "limp on or near ground, palm up",
      rightArm: "trailing or pinned, near ground",
      rightHand: "limp, near or on ground",
      leftLeg: "bent at odd angle, no muscle control, gravity dictating position",
      leftFoot: "on ground or near it, limp",
      rightLeg: "folded or splayed, no control",
      rightFoot: "on or near ground, limp",
      weight: "about to hit ground fully, body nearly horizontal, impact imminent",
    };
  }
  if (progress < 0.9) {
    return {
      head: "ON the ground, turned to one side, unconscious",
      shoulders: "on ground, slight bounce from impact",
      torso: "flat on ground (back down), slight bounce from impact settling",
      hips: "on ground, settling",
      leftArm: "splayed on ground to the left, motionless, palm up",
      leftHand: "on ground, open, limp, motionless",
      rightArm: "on ground to the right side, limp",
      rightHand: "on ground, limp, motionless",
      leftLeg: "on ground, one leg may be bent at the knee",
      leftFoot: "on ground, turned outward, motionless",
      rightLeg: "on ground, splayed or slightly bent",
      rightFoot: "on ground, limp",
      weight: "FULLY on the ground, impact just occurred, small settling bounce",
    };
  }
  return {
    head: "on ground, eyes closed, completely still, unconscious",
    shoulders: "flat on ground, no movement",
    torso: "flat on ground, motionless, no muscle activity whatsoever",
    hips: "on ground, still",
    leftArm: "resting on ground wherever it fell, completely still",
    leftHand: "open on ground, limp, no movement",
    rightArm: "on ground at right side, limp and motionless",
    rightHand: "open on ground, no grip, motionless",
    leftLeg: "resting on ground in fallen position, still",
    leftFoot: "on ground, turned outward, motionless",
    rightLeg: "on ground, motionless, defeated",
    rightFoot: "on ground, limp, no movement",
    weight: "entirely on ground, completely collapsed, absolutely motionless — defeated",
  };
}

function getBlockBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.35) {
    return {
      head: "facing right, ducking slightly, chin tucking behind forearms",
      shoulders: "RISING toward ears to protect neck, both shoulders lifting",
      torso: "compressing slightly, chest hollowing, bracing for impact",
      hips: "lowering slightly, center of gravity dropping",
      leftArm: "rising QUICKLY, forearm moving to vertical position in front of LEFT side of face",
      leftHand: "fisted TIGHT, forearm vertical, knuckles facing outward to absorb hit",
      rightArm: "rising QUICKLY, forearm crossing in front of chest and RIGHT side of face",
      rightHand: "fisted TIGHT, forearm crossing, knuckles outward",
      leftLeg: "front, foot planted, knee bending ~20° for stability and low center",
      leftFoot: "flat on ground, planted firmly, weight distributing",
      rightLeg: "back, foot planted firmly, knee bent ~25°, grounding the stance",
      rightFoot: "flat on ground, firm contact, grounding",
      weight: "dropping center of gravity, distributing EVENLY for maximum stability against impact",
    };
  }
  if (progress < 0.7) {
    return {
      head: "tucked BEHIND crossed forearms, only eyes visible peeking between arms",
      shoulders: "raised, protecting neck, hunched forward into guard",
      torso: "slightly hollow/concave, braced for impact, all muscles tensed and rigid",
      hips: "low, centered, stable platform",
      leftArm: "forearm VERTICAL in front of left side of face, absorbing hit, rigid",
      leftHand: "fisted TIGHT against forearm, braced, knuckles outward",
      rightArm: "forearm CROSSED in front of chest/stomach, tight guard, rigid",
      rightHand: "fisted TIGHT, pressing against left forearm, double-layered defense",
      leftLeg: "front, knee bent ~30°, solidly grounded, not moving",
      leftFoot: "flat on ground, full surface contact, rooted",
      rightLeg: "back, knee bent ~30°, weight low and centered, solid base",
      rightFoot: "flat on ground, firmly planted, pushing against impact force",
      weight: "LOW and centered between both feet, maximum grounding, braced like a wall",
    };
  }
  return {
    head: "still tucked behind forearms, eyes forward through gap in guard",
    shoulders: "still raised, maintaining protective posture",
    torso: "braced, muscles tense, holding firm, absorbing residual force",
    hips: "low, holding position",
    leftArm: "locked in block position, forearm rigid, absorbing follow-up impacts",
    leftHand: "fisted tight, braced against continued force",
    rightArm: "locked in crossed block, tight to body",
    rightHand: "fisted, maintaining pressure against guard",
    leftLeg: "may have slid back slightly from impact force, still planted",
    leftFoot: "flat, slight backward slide, grip marks on ground",
    rightLeg: "firmly planted, resisting pushback, leg muscles engaged",
    rightFoot: "flat, holding ground against impact pushback",
    weight: "shifted slightly backward from absorbed impact, feet dug in, still grounded and solid",
  };
}

function getSpecialBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.2) {
    return {
      head: "facing right, intense focus, expression concentrating, brow furrowed",
      shoulders: "pulling inward, compressing, both shoulders raised and forward",
      torso: "pulling inward, coiling, body gathering energy, spine slightly curved forward",
      hips: "lowered, centered, stable platform for energy channeling",
      leftArm: "pulling toward center of body, hand moving to meet right hand at chest/waist",
      leftHand: "palm facing right, cupping toward center, fingers slightly spread, energy starting to glow",
      rightArm: "pulling toward center, hand meeting left hand at energy focal point",
      rightHand: "palm facing left, cupping toward center, fingers spread, energy flickering between palms",
      leftLeg: "front, knee bending ~20°, foot planted wide for stability",
      leftFoot: "flat on ground, toes gripping, stable foundation",
      rightLeg: "back, knee bending ~20°, planted wide, rooted to ground",
      rightFoot: "flat on ground, pressing firmly, channeling energy through body into ground",
      weight: "low and centered, wide stable foundation for energy channeling, grounded",
    };
  }
  if (progress < 0.4) {
    return {
      head: "facing right, gritting teeth or YELLING, intense expression",
      shoulders: "tensed, vibrating with contained energy, both raised",
      torso: "coiled TIGHT, muscles visibly straining, body trembling with gathered power",
      hips: "locked low, anchoring the energy surge, trembling",
      leftArm: "both hands together, energy ball/glow forming BETWEEN palms, arms trembling",
      leftHand: "cupped, fingers spread, visible energy crackling and growing between hands",
      rightArm: "alongside left, channeling into the gathering point, trembling with effort",
      rightHand: "cupped, fingers spread, energy intensifying, glow at maximum between palms",
      leftLeg: "braced, wide stance, absorbing energy surge through legs, muscle visible",
      leftFoot: "pressed hard into ground, toes curling from effort, anchored",
      rightLeg: "braced alongside, planted, pushing against ground from energy force",
      rightFoot: "pressed into ground, absorbing the recoil of gathering energy",
      weight: "centered and LOW, resisting energy forces pulling upward/outward, maximum grounding",
    };
  }
  if (progress < 0.6) {
    return {
      head: "facing right, eyes WIDE, release expression — mouth open yelling, fierce",
      shoulders: "snapping OPEN, left shoulder forward, driving the release direction",
      torso: "snapping open — chest thrust FORWARD, body extending fully toward target, spine straightening",
      hips: "driving FORWARD, left hip forward, rotating into the release",
      leftArm: "THRUSTING FORWARD — both arms driving toward target, elbows extending",
      leftHand: "palms OPEN facing target, fingers spread, energy RELEASING in a burst from palms",
      rightArm: "alongside left arm, thrusting forward, or extended behind for counterbalance",
      rightHand: "palm open, energy trailing, releasing everything gathered",
      leftLeg: "front leg LUNGING forward, knee bent ~45°, driving body into the release",
      leftFoot: "flat on ground, pressing forward, maximum forward lean",
      rightLeg: "back leg extended LONG, pushing off, driving the release forward, nearly straight",
      rightFoot: "on ball of foot, heel lifted, maximum push-off driving the release",
      weight: "driving FORWARD through left leg, FULL body behind the energy release, committed",
    };
  }
  if (progress < 0.8) {
    return {
      head: "facing right, watching the energy wave travel toward target",
      shoulders: "held in extended pose, left forward, right back, dramatic stillness",
      torso: "still extended, held in dramatic pose at maximum stretch, core engaged",
      hips: "forward, held in lunge position",
      leftArm: "still extended toward target, fingers spread, energy trail visible from palms",
      leftHand: "fingers spread, palm forward, energy fading from hands, residual glow",
      rightArm: "extended or at side, completing release gesture, dramatic pose",
      rightHand: "open, at side or extended back, dramatic line",
      leftLeg: "still bent in lunge, holding release stance firmly",
      leftFoot: "flat, planted in lunge position",
      rightLeg: "back leg extended long, dramatic wide stance held",
      rightFoot: "on ball of foot, holding dramatic pose",
      weight: "committed forward in lunge, held in dramatic pose, effects at peak display",
    };
  }
  return {
    head: "facing right, relaxing, energy spent, expression easing",
    shoulders: "settling, rolling back to neutral",
    torso: "straightening, returning from extended pose, spine normalizing",
    hips: "re-centering as stance narrows",
    leftArm: "lowering from extended position, dropping toward guard",
    leftHand: "relaxing, fingers closing, lowering to side",
    rightArm: "dropping to side, relaxing",
    rightHand: "relaxing, loosely fisting",
    leftLeg: "stepping back from lunge to normal fighting distance",
    leftFoot: "settling into fighting stance position",
    rightLeg: "right foot resettling as stance narrows",
    rightFoot: "coming down flat, returning to fighting stance",
    weight: "rebalancing, returning to neutral fighting stance, recovering from exertion",
  };
}

function getIntroBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.25) {
    return {
      head: "entering from edge of screen, partially visible, dramatic angle, expression obscured",
      shoulders: "partially visible, silhouetted or in dramatic shadow",
      torso: "body partially visible, stepping or landing into the arena",
      hips: "in motion, entering the scene",
      leftArm: "at side or in a dramatic entry pose, partially visible",
      leftHand: "at side, may be gripping weapon or in fist",
      rightArm: "at side or trailing, partially visible",
      rightHand: "at side, matching entry pose",
      leftLeg: "mid-step into the scene, or landing from a dramatic leap",
      leftFoot: "making contact with arena floor or still airborne",
      rightLeg: "trailing behind or following the step into the scene",
      rightFoot: "trailing or about to plant",
      weight: "transitioning into the scene, not yet fully planted, dynamic motion",
    };
  }
  if (progress < 0.5) {
    return {
      head: "facing right, strong expression — smirk/glare/focus, fully visible now",
      shoulders: "broad, pulled back for powerful presence, chest forward",
      torso: "in mid-dramatic pose — chest puffed, or in powerful stance, fully visible",
      hips: "planted, strong foundation, wide stance",
      leftArm: "performing signature gesture — pointing at opponent, cracking knuckles, fist raised, or beckoning",
      leftHand: "in gesture pose — pointing finger, raised fist, open beckoning palm",
      rightArm: "complementing gesture — at hip, crossed, or part of signature move",
      rightHand: "matching gesture — on hip, or fisted at side",
      leftLeg: "planted dramatically, wide and strong stance",
      leftFoot: "flat on ground, firmly planted",
      rightLeg: "planted, strong foundation supporting dramatic pose",
      rightFoot: "flat on ground, wide powerful stance",
      weight: "fully in the scene, commanding presence, wide and grounded",
    };
  }
  if (progress < 0.75) {
    return {
      head: "facing right, eyes narrowed or confident smirk, locked onto opponent",
      shoulders: "at peak of signature pose, broad, confident, open or tensed",
      torso: "in peak signature pose, chest forward, shoulders back, maximum presence",
      hips: "stable, confident stance, grounded",
      leftArm: "at PEAK of signature gesture — the character's defining intro moment",
      leftHand: "holding signature pose — pointed finger, thumbs-down, clenched fist raised, etc.",
      rightArm: "complementing the peak pose, supporting the statement",
      rightHand: "in complementary position",
      leftLeg: "firmly planted in powerful dramatic stance",
      leftFoot: "flat, grounded, unmovable",
      rightLeg: "firmly planted, grounded, wide",
      rightFoot: "flat, grounded, wide stance held at peak",
      weight: "centered in powerful dramatic stance, maximum commanding presence",
    };
  }
  return {
    head: "facing right, settling into focused ready expression, eyes locked",
    shoulders: "transitioning to fighting stance, squaring up",
    torso: "transitioning from dramatic pose to fighting stance, settling",
    hips: "centering for fighting stance balance",
    leftArm: "moving from signature pose into guard position, fist rising to face",
    leftHand: "fisting, pulling up to guard at chin level",
    rightArm: "coming up to guard position, elbow bending",
    rightHand: "fisting, rising to guard at right cheek",
    leftLeg: "shifting into fighting stance, left foot forward",
    leftFoot: "settling into front fighting stance position",
    rightLeg: "settling into back-foot fighting stance position",
    rightFoot: "planting into fighting stance rear position",
    weight: "settling into ready fighting stance, evenly distributed, intro complete",
  };
}

function getWinBodyPositions(progress: number): BodyPartPositions {
  if (progress < 0.25) {
    return {
      head: "facing right, tension releasing, slight upward tilt, expression shifting to satisfaction",
      shoulders: "dropping from fighting tension, rolling back, opening up",
      torso: "straightening from fighting stance, chest expanding, standing TALL, spine straightening",
      hips: "centering, standing taller as knees straighten",
      leftArm: "lowering from guard, relaxing, elbow straightening",
      leftHand: "opening from fist, fingers uncurling, relaxing",
      rightArm: "dropping from guard, tension leaving, elbow straightening",
      rightHand: "opening from fist, relaxing",
      leftLeg: "straightening from fighting stance bend, stepping into natural position",
      leftFoot: "flat on ground, settling into relaxed stance",
      rightLeg: "straightening, coming together to stable natural stance",
      rightFoot: "flat on ground, narrowing from fighting width",
      weight: "redistributing from fighting stance to relaxed proud standing, center rising",
    };
  }
  if (progress < 0.5) {
    return {
      head: "facing right or angled UP, triumphant expression — smirking, grinning, or stoic satisfaction",
      shoulders: "back and DOWN, chest proud, open posture, dominant",
      torso: "tall and PROUD, chest out, spine straight, expanded posture",
      hips: "centered, confident stance, possibly one hip cocked",
      leftArm: "victory gesture — fist pumping SKYWARD, or arms crossing, or pointing down at fallen opponent",
      leftHand: "fist raised in victory, or palms crossed on chest, or finger pointing at downed foe",
      rightArm: "complementing victory — on hip, raised alongside left, or part of crossed arms",
      rightHand: "matching gesture — on hip, fist raised, or arms crossed",
      leftLeg: "planted firmly, strong victorious stance, straight and powerful",
      leftFoot: "flat on ground, grounded, confident",
      rightLeg: "planted, possibly one foot slightly forward in dominant display",
      rightFoot: "flat on ground, solid",
      weight: "centered and confident, standing tall, dominant posture, grounded",
    };
  }
  if (progress < 0.75) {
    return {
      head: "holding triumphant angle, PEAK celebration expression, chin up",
      shoulders: "held in victory pose, broad, open, confident",
      torso: "at peak of victory pose, maximum confidence display, chest fully expanded",
      hips: "stable, commanding stance",
      leftArm: "holding victory gesture at PEAK — maximum fist height, or tightest arm cross",
      leftHand: "at peak — fist at maximum height, or grip tight in crossed pose",
      rightArm: "holding complementary pose at peak",
      rightHand: "at peak of complementary gesture",
      leftLeg: "firmly planted, not moving, solid immovable stance",
      leftFoot: "flat, rooted, unwavering",
      rightLeg: "solid, unmovable foundation",
      rightFoot: "flat, planted, rooted",
      weight: "planted, UNWAVERING, total dominance displayed, perfectly balanced",
    };
  }
  return {
    head: "settling into relaxed confident expression, facing right, chin slightly elevated",
    shoulders: "settled back, relaxed but still proud, open posture",
    torso: "settling from peak pose into proud standing position, still expanded",
    hips: "relaxed, weight settled",
    leftArm: "lowering from gesture, relaxing into casual confident posture, at side",
    leftHand: "relaxing, open or loosely fisted, at side",
    rightArm: "relaxing, perhaps resting on hip or at side",
    rightHand: "on hip or loosely at side, casual confidence",
    leftLeg: "relaxed standing, casual but proud, straight",
    leftFoot: "flat on ground, relaxed",
    rightLeg: "relaxed standing position, straight",
    rightFoot: "flat on ground, comfortable",
    weight: "relaxed and centered, victory established, at ease, confident balance",
  };
}

/** Get key frame indices for "key frames only" mode.
 *  Returns evenly-spaced indices including first and last.
 *  @param totalFrames  – the template's total frame count (pose range)
 *  @param desiredCount – how many key frames the user wants generated (defaults to 3)
 */
export function getKeyFrameIndices(totalFrames: number, desiredCount: number = 3): number[] {
  const count = Math.max(1, Math.min(desiredCount, totalFrames));
  if (count === 1) return [0];
  if (count >= totalFrames) return Array.from({ length: totalFrames }, (_, i) => i);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(Math.round((i * (totalFrames - 1)) / (count - 1)));
  }
  return indices;
}
