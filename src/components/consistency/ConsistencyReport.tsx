"use client";

import type {
  ConsistencyReport as ConsistencyReportType,
  AnimationConsistencyResult,
  FrameConsistencyResult,
  ConsistencyIssue,
  AnimationType,
} from "@/types";
import { ANIMATION_TEMPLATES } from "@/lib/fighter-pack/templates";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Wand2,
  RefreshCw,
  Sparkles,
  Play,
  Pause,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

// ---- Score Badge ----

export function ConsistencyScoreBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const pct = Math.round(score * 100);
  const colorClass =
    score >= 0.85
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : score >= 0.7
        ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
        : "text-red-400 border-red-500/30 bg-red-500/10";

  const Icon = score >= 0.85 ? CheckCircle : score >= 0.7 ? AlertTriangle : XCircle;

  const sizeClass =
    size === "lg"
      ? "w-20 h-20 text-2xl"
      : size === "md"
        ? "w-14 h-14 text-lg"
        : "w-9 h-9 text-xs";

  const iconSize = size === "lg" ? "h-5 w-5" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-full border ${colorClass} ${sizeClass}`}
    >
      <Icon className={iconSize} />
      <span className="font-bold leading-none">{pct}%</span>
    </div>
  );
}

// ---- Issue List ----

const ISSUE_TYPE_LABELS: Record<string, string> = {
  "palette-drift": "Palette Drift",
  "skin-tone-shift": "Skin Tone Shift",
  "outline-change": "Outline Change",
  "color-region-shift": "Color Region Shift",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-yellow-400 bg-yellow-500/10",
  medium: "text-orange-400 bg-orange-500/10",
  high: "text-red-400 bg-red-500/10",
};

export function IssueList({ issues }: { issues: ConsistencyIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <ul className="space-y-1">
      {issues.map((issue, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          <span
            className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${SEVERITY_COLORS[issue.severity]}`}
          >
            {issue.severity}
          </span>
          <span className="text-foreground">
            <span className="font-medium text-foreground">
              {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}:
            </span>{" "}
            {issue.description}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---- Frame Thumbnail ----

export function FrameConsistencyThumbnail({
  result,
  imageData,
  onAutoFix,
  onRegenerate,
  onAICheck,
  isRegenerating,
  isAIChecking,
}: {
  result: FrameConsistencyResult;
  imageData?: string;
  onAutoFix?: () => void;
  onRegenerate?: () => void;
  onAICheck?: () => void;
  isRegenerating?: boolean;
  isAIChecking?: boolean;
}) {
  const borderColor =
    result.overallScore < 0.5
      ? "border-red-500"
      : result.overallScore < 0.7
        ? "border-orange-500"
        : result.issues.length > 0
          ? "border-yellow-500/50"
          : "border-border";

  return (
    <div className={`rounded border-2 ${borderColor} bg-surface p-2 space-y-2`}>
      <div className="flex items-center gap-2">
        {imageData && (
          <img
            src={`data:image/png;base64,${imageData}`}
            alt={`Frame ${result.frameIndex}`}
            className="w-12 h-12 object-contain bg-surface rounded image-rendering-pixelated"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Frame {result.frameIndex + 1}
            </span>
            <ConsistencyScoreBadge score={result.overallScore} size="sm" />
          </div>
        </div>
      </div>

      {result.issues.length > 0 && <IssueList issues={result.issues} />}

      {/* Show action buttons when there are any issues OR when AI check is available */}
      {(result.issues.length > 0 || onAICheck) && (
        <div className="flex gap-1 flex-wrap">
          {onAutoFix && result.issues.length > 0 && (
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={onAutoFix}>
              <Wand2 className="h-3 w-3 mr-1" />
              Auto-fix
            </Button>
          )}
          {onRegenerate && result.issues.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRegenerating ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          )}
          {onAICheck && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={onAICheck}
              disabled={isAIChecking}
            >
              <Sparkles className={`h-3 w-3 mr-1 ${isAIChecking ? "animate-pulse" : ""}`} />
              AI Check
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Animation Card ----

export function AnimationConsistencyCard({
  result,
  frameImages,
  onAutoFixFrame,
  onRegenerateFrame,
  onAICheckFrame,
  onAutoFixAll,
  regeneratingFrames,
  aiCheckingFrames,
}: {
  result: AnimationConsistencyResult;
  frameImages?: Map<number, string>;
  onAutoFixFrame?: (animType: AnimationType, frameIndex: number) => void;
  onRegenerateFrame?: (animType: AnimationType, frameIndex: number) => void;
  onAICheckFrame?: (animType: AnimationType, frameIndex: number) => void;
  onAutoFixAll?: (animType: AnimationType) => void;
  regeneratingFrames?: Set<string>;
  aiCheckingFrames?: Set<string>;
}) {
  const [expanded, setExpanded] = useState(result.flaggedFrameCount > 0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const template = ANIMATION_TEMPLATES.find((t) => t.type === result.animationType);
  const label = template?.label ?? result.animationType;

  // Collect ordered frame images for preview
  const orderedFrameImages = result.frameResults
    .map((fr) => ({ index: fr.frameIndex, data: frameImages?.get(fr.frameIndex) }))
    .filter((f): f is { index: number; data: string } => !!f.data)
    .sort((a, b) => a.index - b.index);

  const animatePreview = useCallback(() => {
    if (!isPlaying || !expanded || orderedFrameImages.length === 0) return;
    const delay = template?.defaultDelay ?? 100;
    intervalRef.current = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % orderedFrameImages.length);
    }, delay);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, expanded, orderedFrameImages.length, template?.defaultDelay]);

  useEffect(() => {
    const cleanup = animatePreview();
    return cleanup;
  }, [animatePreview]);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-surface-hover transition-colors rounded-lg"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted shrink-0" />
        )}

        <span className="font-medium text-sm text-foreground flex-1">{label}</span>

        {result.flaggedFrameCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">
            {result.flaggedFrameCount} flagged
          </span>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20">
            <Progress
              value={result.averageScore * 100}
              className="h-1.5"
            />
          </div>
          <span className="text-xs font-mono text-muted w-10 text-right">
            {Math.round(result.averageScore * 100)}%
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Animation preview */}
          {orderedFrameImages.length > 0 && (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <div className="flex items-center justify-center rounded-lg border border-border bg-surface-alt w-full h-32">
                <img
                  src={`data:image/png;base64,${orderedFrameImages[currentFrameIdx % orderedFrameImages.length].data}`}
                  alt={`${label} preview`}
                  className="max-w-full max-h-[112px]"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <span className="text-[10px] text-muted">
                  Frame {(currentFrameIdx % orderedFrameImages.length) + 1}/{orderedFrameImages.length}
                </span>
              </div>
            </div>
          )}

          {onAutoFixAll && result.frameResults.some((fr) => fr.issues.length > 0) && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onAutoFixAll(result.animationType)}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Auto-fix All Issues
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {result.frameResults.map((fr) => {
              const key = `${result.animationType}-${fr.frameIndex}`;
              return (
                <FrameConsistencyThumbnail
                  key={key}
                  result={fr}
                  imageData={frameImages?.get(fr.frameIndex)}
                  onAutoFix={
                    onAutoFixFrame
                      ? () => onAutoFixFrame(result.animationType, fr.frameIndex)
                      : undefined
                  }
                  onRegenerate={
                    onRegenerateFrame
                      ? () => onRegenerateFrame(result.animationType, fr.frameIndex)
                      : undefined
                  }
                  onAICheck={
                    onAICheckFrame
                      ? () => onAICheckFrame(result.animationType, fr.frameIndex)
                      : undefined
                  }
                  isRegenerating={regeneratingFrames?.has(key)}
                  isAIChecking={aiCheckingFrames?.has(key)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Full Report View ----

export function ConsistencyReportView({
  report,
  frameImagesByAnim,
  onAutoFixFrame,
  onRegenerateFrame,
  onAICheckFrame,
  onAutoFixAll,
  regeneratingFrames,
  aiCheckingFrames,
}: {
  report: ConsistencyReportType;
  frameImagesByAnim?: Map<AnimationType, Map<number, string>>;
  onAutoFixFrame?: (animType: AnimationType, frameIndex: number) => void;
  onRegenerateFrame?: (animType: AnimationType, frameIndex: number) => void;
  onAICheckFrame?: (animType: AnimationType, frameIndex: number) => void;
  onAutoFixAll?: (animType: AnimationType) => void;
  regeneratingFrames?: Set<string>;
  aiCheckingFrames?: Set<string>;
}) {
  const totalFlagged = report.animations.reduce(
    (sum, a) => sum + a.flaggedFrameCount,
    0
  );

  return (
    <div className="space-y-4">
      {/* Overall score header */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface">
        <ConsistencyScoreBadge score={report.overallScore} size="lg" />
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {report.overallScore >= 0.85
              ? "Great Consistency"
              : report.overallScore >= 0.7
                ? "Minor Issues Detected"
                : "Consistency Issues Found"}
          </h3>
          <p className="text-sm text-muted">
            {report.animations.length} animation(s) evaluated
            {totalFlagged > 0 && ` · ${totalFlagged} frame(s) flagged`}
          </p>
        </div>
      </div>

      {/* Palette summary */}
      {report.baseSpritePalette.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted">Base palette:</span>
          <div className="flex gap-0.5">
            {report.baseSpritePalette.slice(0, 12).map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-sm border border-border"
                style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                title={`RGB(${c.r},${c.g},${c.b})`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Per-animation cards */}
      <div className="space-y-2">
        {report.animations.map((animResult) => (
          <AnimationConsistencyCard
            key={animResult.animationType}
            result={animResult}
            frameImages={frameImagesByAnim?.get(animResult.animationType)}
            onAutoFixFrame={onAutoFixFrame}
            onRegenerateFrame={onRegenerateFrame}
            onAICheckFrame={onAICheckFrame}
            onAutoFixAll={onAutoFixAll}
            regeneratingFrames={regeneratingFrames}
            aiCheckingFrames={aiCheckingFrames}
          />
        ))}
      </div>
    </div>
  );
}
