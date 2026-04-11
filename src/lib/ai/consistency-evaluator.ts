import {
  AnimationType,
  type Color,
  type ConsistencyIssue,
  type FrameConsistencyResult,
  type AnimationConsistencyResult,
  type ConsistencyReport,
} from "@/types";
import {
  extractDominantColors,
  detectOutline,
  consistencyScore,
} from "@/lib/fighter-pack/consistency";

const FLAG_THRESHOLD = 0.7;
const COLOR_DISTANCE_THRESHOLD = 60;

// ---- Helpers ----

function colorDistance(a: Color, b: Color): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function isSkinTone(r: number, g: number, b: number): boolean {
  const [h, s, l] = rgbToHsl(r, g, b);
  return h >= 0 && h <= 50 && s >= 0.2 && s <= 0.8 && l >= 0.3 && l <= 0.85;
}

function extractSkinColors(data: Uint8ClampedArray): Color[] {
  const skinMap = new Map<string, { color: Color; count: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    if (!isSkinTone(data[i], data[i + 1], data[i + 2])) continue;
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;
    const existing = skinMap.get(key);
    if (existing) existing.count++;
    else skinMap.set(key, { color: { r, g, b, a: 255 }, count: 1 });
  }
  return Array.from(skinMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((e) => e.color);
}

function findClosestDistance(color: Color, palette: Color[]): number {
  if (palette.length === 0) return Infinity;
  return Math.min(...palette.map((p) => colorDistance(color, p)));
}

/** Extract dominant non-transparent colors from a horizontal zone of the sprite. */
function extractZoneColors(
  data: Uint8ClampedArray,
  width: number,
  startY: number,
  endY: number,
  maxColors = 5
): Color[] {
  const colorMap = new Map<string, { color: Color; count: number }>();
  for (let y = startY; y < endY; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      const r = Math.round(data[i] / 8) * 8;
      const g = Math.round(data[i + 1] / 8) * 8;
      const b = Math.round(data[i + 2] / 8) * 8;
      const key = `${r},${g},${b}`;
      const existing = colorMap.get(key);
      if (existing) existing.count++;
      else colorMap.set(key, { color: { r, g, b, a: 255 }, count: 1 });
    }
  }
  return Array.from(colorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((e) => e.color);
}

// ---- Core evaluation ----

export function evaluateFrameConsistency(
  frameData: Uint8ClampedArray,
  baseData: Uint8ClampedArray,
  width: number,
  height: number,
  animationType: AnimationType,
  frameIndex: number
): FrameConsistencyResult {
  const issues: ConsistencyIssue[] = [];

  // 1. Overall pixel-level score
  const score = consistencyScore(frameData, baseData, width, height);

  // 2. Palette drift detection
  const baseColors = extractDominantColors(baseData, 16);
  const frameColors = extractDominantColors(frameData, 16);

  const driftedColors = frameColors.filter(
    (fc) => findClosestDistance(fc, baseColors) > COLOR_DISTANCE_THRESHOLD
  );

  if (driftedColors.length > 0) {
    const ratio = driftedColors.length / Math.max(frameColors.length, 1);
    const severity =
      ratio > 0.4 ? "high" : ratio > 0.2 ? "medium" : "low";
    issues.push({
      type: "palette-drift",
      severity,
      description: `${driftedColors.length} color(s) not found in base sprite palette`,
      details: {
        driftedCount: driftedColors.length,
        totalFrame: frameColors.length,
      },
    });
  }

  // 3. Skin-tone shift detection
  const baseSkin = extractSkinColors(baseData);
  const frameSkin = extractSkinColors(frameData);

  if (baseSkin.length > 0 && frameSkin.length > 0) {
    const avgBaseSkin = baseSkin[0];
    const avgFrameSkin = frameSkin[0];
    const skinDist = colorDistance(avgBaseSkin, avgFrameSkin);
    if (skinDist > 40) {
      issues.push({
        type: "skin-tone-shift",
        severity: skinDist > 80 ? "high" : "medium",
        description: `Skin tone shifted (distance: ${Math.round(skinDist)})`,
        details: {
          baseSkin: avgBaseSkin,
          frameSkin: avgFrameSkin,
          distance: Math.round(skinDist),
        },
      });
    }
  }

  // 4. Outline change detection
  const baseOutline = detectOutline(baseData, width, height);
  const frameOutline = detectOutline(frameData, width, height);

  if (baseOutline.hasOutline !== frameOutline.hasOutline) {
    issues.push({
      type: "outline-change",
      severity: "high",
      description: baseOutline.hasOutline
        ? "Outline present in base but missing in this frame"
        : "Outline appeared in this frame but not in base",
    });
  } else if (
    baseOutline.hasOutline &&
    frameOutline.hasOutline &&
    baseOutline.color &&
    frameOutline.color
  ) {
    const outlineDist = colorDistance(baseOutline.color, frameOutline.color);
    if (outlineDist > 50) {
      issues.push({
        type: "outline-change",
        severity: outlineDist > 100 ? "high" : "medium",
        description: `Outline color shifted (distance: ${Math.round(outlineDist)})`,
        details: {
          baseColor: baseOutline.color,
          frameColor: frameOutline.color,
        },
      });
    }
  }

  // 5. Major color region shifts (top-N colors diverged)
  if (baseColors.length >= 3 && frameColors.length >= 3) {
    for (let i = 0; i < Math.min(3, baseColors.length); i++) {
      const nearest = findClosestDistance(baseColors[i], frameColors);
      if (nearest > COLOR_DISTANCE_THRESHOLD * 1.5) {
        issues.push({
          type: "color-region-shift",
          severity: nearest > COLOR_DISTANCE_THRESHOLD * 2.5 ? "high" : "medium",
          description: `Major color #${i + 1} diverged significantly (distance: ${Math.round(nearest)})`,
          details: {
            baseColor: baseColors[i],
            nearestDistance: Math.round(nearest),
          },
        });
      }
    }
  }

  // 6. Clothing/body region consistency (zone-based color comparison)
  //    Divide sprite into 3 horizontal zones: head (top 30%), torso (mid 40%), legs (bottom 30%)
  //    Compare dominant colors per zone — catches clothing color shifts
  const zones = [
    { name: "head", startY: 0, endY: Math.floor(height * 0.3) },
    { name: "torso/clothing", startY: Math.floor(height * 0.3), endY: Math.floor(height * 0.7) },
    { name: "legs/footwear", startY: Math.floor(height * 0.7), endY: height },
  ] as const;

  for (const zone of zones) {
    const baseZoneColors = extractZoneColors(baseData, width, zone.startY, zone.endY);
    const frameZoneColors = extractZoneColors(frameData, width, zone.startY, zone.endY);

    if (baseZoneColors.length > 0 && frameZoneColors.length > 0) {
      // Check if the dominant color in this zone shifted
      const zoneDist = colorDistance(baseZoneColors[0], frameZoneColors[0]);
      if (zoneDist > 50) {
        const zoneColor = (c: Color) =>
          `rgb(${c.r},${c.g},${c.b})`;
        issues.push({
          type: "color-region-shift",
          severity: zoneDist > 100 ? "high" : zoneDist > 70 ? "medium" : "low",
          description: `${zone.name} region color changed: ${zoneColor(baseZoneColors[0])} → ${zoneColor(frameZoneColors[0])} (distance: ${Math.round(zoneDist)})`,
          affectedRegion: zone.name,
          details: {
            baseColor: baseZoneColors[0],
            frameColor: frameZoneColors[0],
            distance: Math.round(zoneDist),
          },
        });
      }
    }
  }

  return {
    animationType,
    frameIndex,
    overallScore: score,
    issues,
    dominantColors: frameColors,
    hasOutline: frameOutline.hasOutline,
  };
}

// ---- Movement validation helpers ----

/** Compare pixel differences in a specific horizontal zone between two frames. */
function getZoneDifference(
  frame1: Uint8ClampedArray,
  frame2: Uint8ClampedArray,
  width: number,
  startY: number,
  endY: number
): number {
  let diffPixels = 0;
  let totalPixels = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a1 = frame1[i + 3] >= 128;
      const a2 = frame2[i + 3] >= 128;

      // Count any pixel where visibility or color differs
      if (a1 || a2) {
        totalPixels++;
        if (a1 !== a2) {
          diffPixels++;
        } else if (a1) {
          const dr = Math.abs(frame1[i] - frame2[i]);
          const dg = Math.abs(frame1[i + 1] - frame2[i + 1]);
          const db = Math.abs(frame1[i + 2] - frame2[i + 2]);
          if (dr + dg + db > 30) diffPixels++;
        }
      }
    }
  }

  return totalPixels > 0 ? diffPixels / totalPixels : 0;
}

/**
 * Expected movement characteristics per animation type.
 * - minTotalDiff: minimum pixel difference ratio between first and a mid-frame (catch static sprites)
 * - activeZones: which body zones MUST show movement (supports multi-zone requirements)
 * - minZoneDiff: minimum diff threshold per active zone (default 0.05)
 */
interface MovementExpectation {
  minTotalDiff: number;
  activeZones: ("head" | "torso" | "legs")[];
  minZoneDiff?: Partial<Record<"head" | "torso" | "legs", number>>;
}

const MOVEMENT_EXPECTATIONS: Record<AnimationType, MovementExpectation> = {
  [AnimationType.IDLE]:    { minTotalDiff: 0.02, activeZones: ["torso"] },
  [AnimationType.WALK]:    { minTotalDiff: 0.15, activeZones: ["legs", "torso"], minZoneDiff: { legs: 0.10, torso: 0.05 } },
  [AnimationType.RUN]:     { minTotalDiff: 0.20, activeZones: ["legs", "torso"], minZoneDiff: { legs: 0.12, torso: 0.06 } },
  [AnimationType.JUMP]:    { minTotalDiff: 0.25, activeZones: ["legs", "torso", "head"] },
  [AnimationType.CROUCH]:  { minTotalDiff: 0.15, activeZones: ["legs", "torso"] },
  [AnimationType.PUNCH]:   { minTotalDiff: 0.15, activeZones: ["torso", "head"], minZoneDiff: { torso: 0.08 } },
  [AnimationType.KICK]:    { minTotalDiff: 0.20, activeZones: ["legs", "torso"], minZoneDiff: { legs: 0.10, torso: 0.05 } },
  [AnimationType.SPECIAL]: { minTotalDiff: 0.15, activeZones: ["torso", "legs"] },
  [AnimationType.HURT]:    { minTotalDiff: 0.15, activeZones: ["torso", "head"] },
  [AnimationType.KO]:      { minTotalDiff: 0.30, activeZones: ["legs", "torso", "head"] },
  [AnimationType.BLOCK]:   { minTotalDiff: 0.10, activeZones: ["torso"] },
  [AnimationType.INTRO]:   { minTotalDiff: 0.15, activeZones: ["torso", "legs"] },
  [AnimationType.WIN]:     { minTotalDiff: 0.10, activeZones: ["torso"] },
};

/**
 * Provide a human-readable hint about what movement is expected in a zone for a given animation.
 */
function getZoneMovementHint(animationType: AnimationType, zone: string): string {
  const hints: Partial<Record<AnimationType, Record<string, string>>> = {
    [AnimationType.WALK]: {
      legs: "legs must show alternating strides with clear heel-toe contact",
      torso: "arms should swing opposite to legs, shoulders counter-rotate",
      head: "head should bob slightly with walking rhythm",
    },
    [AnimationType.RUN]: {
      legs: "legs must show high knee drives and push-off with flight phases",
      torso: "arms must pump vigorously, shoulders drive rotation",
      head: "head tilts forward with running lean",
    },
    [AnimationType.JUMP]: {
      legs: "legs must show crouch preparation, push-off, tuck, and landing",
      torso: "arms sweep upward for momentum, then balance in air",
      head: "head looks up during ascent, down during descent",
    },
    [AnimationType.PUNCH]: {
      torso: "punching arm must extend fully, opposite arm guards, shoulders rotate",
      head: "head stays focused on target, chin tucks on impact",
    },
    [AnimationType.KICK]: {
      legs: "kicking leg must chamber, extend to full reach, and retract",
      torso: "body leans away for counterbalance, arms spread for balance",
    },
    [AnimationType.HURT]: {
      torso: "body recoils from impact, arms fling outward, then recover",
      head: "head snaps back from hit, expression changes to pain",
    },
    [AnimationType.KO]: {
      legs: "knees buckle and collapse, legs go limp",
      torso: "body falls, arms go limp, total loss of muscle control",
      head: "head snaps back then falls with body",
    },
  };
  return hints[animationType]?.[zone] ?? `${zone} should show visible movement for ${animationType}`;
}

/**
 * Evaluate whether frames in an animation show appropriate body movement
 * for the animation type. Checks:
 * 1. Sufficient overall pixel change between frames (not static)
 * 2. Movement in the expected body zones (legs move for walk, arms for punch, etc.)
 * 3. Frame-to-frame progression (no identical consecutive frames)
 */
function evaluateMovementConsistency(
  frames: { data: Uint8ClampedArray; frameIndex: number }[],
  width: number,
  height: number,
  animationType: AnimationType,
): ConsistencyIssue[] {
  if (frames.length < 2) return [];

  const issues: ConsistencyIssue[] = [];
  const expectations = MOVEMENT_EXPECTATIONS[animationType];
  if (!expectations) return [];

  // Zone boundaries
  const headEnd = Math.floor(height * 0.3);
  const torsoEnd = Math.floor(height * 0.7);

  // Compare first frame with the mid frame (should show peak difference)
  const firstFrame = frames[0];
  const midFrame = frames[Math.floor(frames.length / 2)];

  // 1. Check overall movement between first and mid frame
  const overallDiff = getZoneDifference(firstFrame.data, midFrame.data, width, 0, height);

  if (overallDiff < expectations.minTotalDiff) {
    issues.push({
      type: "insufficient-movement",
      severity: overallDiff < expectations.minTotalDiff * 0.5 ? "high" : "medium",
      description: `${animationType} animation shows too little movement between frames (${Math.round(overallDiff * 100)}% pixel change, expected >=${Math.round(expectations.minTotalDiff * 100)}%)`,
      details: { actualDiff: overallDiff, expectedMinDiff: expectations.minTotalDiff },
    });
  }

  // 2. Check that ALL expected body zones show activity
  const headDiff = getZoneDifference(firstFrame.data, midFrame.data, width, 0, headEnd);
  const torsoDiff = getZoneDifference(firstFrame.data, midFrame.data, width, headEnd, torsoEnd);
  const legsDiff = getZoneDifference(firstFrame.data, midFrame.data, width, torsoEnd, height);

  const zoneDiffs: Record<string, number> = { head: headDiff, torso: torsoDiff, legs: legsDiff };

  // Check EACH required active zone (not just one)
  for (const zone of expectations.activeZones) {
    const zoneDiff = zoneDiffs[zone];
    const threshold = expectations.minZoneDiff?.[zone] ?? 0.05;

    if (zoneDiff < threshold && overallDiff > 0.05) {
      const label = zone === "torso" ? "torso/arms" : zone;
      issues.push({
        type: "insufficient-movement",
        severity: zoneDiff < threshold * 0.5 ? "high" : "medium",
        description: `${animationType} animation: the ${label} zone shows only ${Math.round(zoneDiff * 100)}% change (expected >=${Math.round(threshold * 100)}%) — ${getZoneMovementHint(animationType, zone)}`,
        affectedRegion: zone,
        details: { zoneDiffs, zone, threshold, actualDiff: zoneDiff },
      });
    }
  }

  // Walk/run specific: enforce strict alternating leg movement
  if ((animationType === AnimationType.WALK || animationType === AnimationType.RUN) && legsDiff < 0.10) {
    issues.push({
      type: "insufficient-movement",
      severity: "high",
      description: `${animationType} animation: legs show only ${Math.round(legsDiff * 100)}% change — a proper ${animationType.toLowerCase()} cycle requires clearly different leg positions per frame with alternating strides, heel-toe contact, and opposite arm swing`,
      affectedRegion: "legs",
      details: { legsDiff, expected: ">= 10%" },
    });
  }

  // Punch/kick specific: torso (which includes arms in side-view) must show arm/body rotation
  if (animationType === AnimationType.PUNCH && torsoDiff < 0.08) {
    issues.push({
      type: "insufficient-movement",
      severity: "high",
      description: `Punch animation: torso/arms zone shows only ${Math.round(torsoDiff * 100)}% change — a punch requires visible arm extension, shoulder rotation, and hip drive`,
      affectedRegion: "torso/arms",
      details: { torsoDiff, expected: ">= 8%" },
    });
  }

  if (animationType === AnimationType.KICK && legsDiff < 0.12) {
    issues.push({
      type: "insufficient-movement",
      severity: "high",
      description: `Kick animation: legs zone shows only ${Math.round(legsDiff * 100)}% change — a kick requires the kicking leg to visibly chamber, extend to full reach, and retract`,
      affectedRegion: "legs",
      details: { legsDiff, expected: ">= 12%" },
    });
  }

  // 3. Check for identical consecutive frames (no movement between neighbors)
  for (let i = 1; i < frames.length; i++) {
    const frameDiff = getZoneDifference(frames[i - 1].data, frames[i].data, width, 0, height);
    if (frameDiff < 0.01 && animationType !== AnimationType.IDLE) {
      issues.push({
        type: "insufficient-movement",
        severity: "low",
        description: `Frames ${frames[i - 1].frameIndex + 1} and ${frames[i].frameIndex + 1} appear nearly identical (${Math.round(frameDiff * 100)}% difference) — each frame should show visible pose progression`,
        details: { frame1: frames[i - 1].frameIndex, frame2: frames[i].frameIndex, diff: frameDiff },
      });
    }
  }

  // 4. Check for excessive movement (might indicate character redesign rather than just pose change)
  if (overallDiff > 0.7) {
    issues.push({
      type: "excessive-movement",
      severity: "medium",
      description: `${animationType} animation shows ${Math.round(overallDiff * 100)}% pixel change between frames — this may indicate the character design changed rather than just the pose`,
      details: { actualDiff: overallDiff },
    });
  }

  return issues;
}

export function evaluateAnimationConsistency(
  frames: { data: Uint8ClampedArray; frameIndex: number }[],
  baseData: Uint8ClampedArray,
  width: number,
  height: number,
  animationType: AnimationType
): AnimationConsistencyResult {
  const frameResults = frames.map((f) =>
    evaluateFrameConsistency(f.data, baseData, width, height, animationType, f.frameIndex)
  );

  // Evaluate movement consistency across frames (not just vs base)
  const movementIssues = evaluateMovementConsistency(frames, width, height, animationType);

  // Append movement issues to the first frame result (animation-level issues)
  if (movementIssues.length > 0 && frameResults.length > 0) {
    frameResults[0] = {
      ...frameResults[0],
      issues: [...frameResults[0].issues, ...movementIssues],
    };
  }

  const avgScore =
    frameResults.length > 0
      ? frameResults.reduce((sum, r) => sum + r.overallScore, 0) / frameResults.length
      : 1;

  const flaggedCount = frameResults.filter((r) => r.overallScore < FLAG_THRESHOLD).length;

  return {
    animationType,
    averageScore: avgScore,
    frameResults,
    flaggedFrameCount: flaggedCount,
  };
}

export interface FrameInput {
  animationType: AnimationType;
  frameIndex: number;
  data: Uint8ClampedArray;
}

export function evaluateFullConsistency(
  allFrames: FrameInput[],
  baseData: Uint8ClampedArray,
  width: number,
  height: number
): ConsistencyReport {
  const byAnim = new Map<AnimationType, { data: Uint8ClampedArray; frameIndex: number }[]>();
  for (const f of allFrames) {
    const list = byAnim.get(f.animationType) || [];
    list.push({ data: f.data, frameIndex: f.frameIndex });
    byAnim.set(f.animationType, list);
  }

  const animations: AnimationConsistencyResult[] = [];
  for (const [animType, frames] of byAnim) {
    animations.push(
      evaluateAnimationConsistency(frames, baseData, width, height, animType)
    );
  }

  const overallScore =
    animations.length > 0
      ? animations.reduce((sum, a) => sum + a.averageScore, 0) / animations.length
      : 1;

  const baseSpritePalette = extractDominantColors(baseData, 16);

  return {
    overallScore,
    animations,
    baseSpritePalette,
    timestamp: new Date(),
    aiEvaluationAvailable: true,
  };
}
