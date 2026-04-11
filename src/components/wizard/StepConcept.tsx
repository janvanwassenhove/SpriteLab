"use client";

import { useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useWizardStore,
  type CharacterStyle,
} from "@/stores/wizard-store";
import {
  Swords,
  Gamepad2,
  Shield,
  SmilePlus,
  User,
  Monitor,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";

const CHARACTER_STYLES: {
  value: CharacterStyle;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  { value: "fighter", label: "Fighter", desc: "Fighting game character with combat moves", icon: Swords },
  { value: "platformer", label: "Platformer", desc: "Side-scrolling action character", icon: Gamepad2 },
  { value: "rpg", label: "RPG", desc: "Role-playing game character with gestures", icon: Shield },
  { value: "chibi", label: "Chibi", desc: "Cute super-deformed proportions", icon: SmilePlus },
  { value: "realistic", label: "Realistic", desc: "Proportional human-like character", icon: User },
  { value: "retro", label: "Retro", desc: "Classic 8-bit / 16-bit style", icon: Monitor },
];

export function StepConcept() {
  const characterName = useWizardStore((s) => s.characterName);
  const characterDescription = useWizardStore((s) => s.characterDescription);
  const characterStyle = useWizardStore((s) => s.characterStyle);
  const setCharacterName = useWizardStore((s) => s.setCharacterName);
  const setCharacterDescription = useWizardStore((s) => s.setCharacterDescription);
  const setCharacterStyle = useWizardStore((s) => s.setCharacterStyle);
  const uploadedImage = useWizardStore((s) => s.uploadedImage);
  const setUploadedImage = useWizardStore((s) => s.setUploadedImage);
  const uploadPixelise = useWizardStore((s) => s.uploadPixelise);
  const setUploadPixelise = useWizardStore((s) => s.setUploadPixelise);
  const uploadRemoveBg = useWizardStore((s) => s.uploadRemoveBg);
  const setUploadRemoveBg = useWizardStore((s) => s.setUploadRemoveBg);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix to get raw base64
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        setUploadedImage(base64);
      };
      reader.readAsDataURL(file);
    },
    [setUploadedImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Character Concept</h2>
        <p className="text-muted text-sm">
          Define your character&apos;s identity and visual style.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Character Name</Label>
          <Input
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="e.g. Shadow Ninja, Fire Knight, Space Ranger..."
            className="mt-1.5 h-11 text-base"
            autoFocus
          />
        </div>

        <div>
          <Label>Description</Label>
          <textarea
            value={characterDescription}
            onChange={(e) => setCharacterDescription(e.target.value)}
            placeholder="Describe the character's appearance in detail: body type, clothing, armor, weapons, colors, distinguishing features..."
            className="mt-1.5 w-full h-28 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border resize-none"
          />
          <p className="text-xs text-muted mt-1">
            Be specific about colors, clothing, weapons, and unique features for better results.
          </p>
        </div>

        <div>
          <Label>Character Type</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
            {CHARACTER_STYLES.map((style) => {
              const Icon = style.icon;
              const selected = characterStyle === style.value;
              return (
                <button
                  key={style.value}
                  onClick={() => setCharacterStyle(style.value)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-lg border transition-colors text-left ${
                    selected
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-surface/50 text-muted hover:border-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{style.label}</span>
                  </div>
                  <span className="text-xs text-muted">{style.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload existing image */}
        <div>
          <Label>Start from Existing Image (optional)</Label>
          <p className="text-xs text-muted mt-0.5 mb-2">
            Upload a character image to use as the base. It will be pixelised and cleaned up automatically.
          </p>
          {uploadedImage ? (
            <div className="flex items-start gap-4 p-3 rounded-lg border border-border bg-surface/50">
              <div className="w-24 h-24 rounded border border-border bg-surface-alt flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={`data:image/png;base64,${uploadedImage}`}
                  alt="Uploaded character"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-foreground">Image uploaded</span>
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="ml-auto p-1 rounded hover:bg-surface-hover text-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadPixelise}
                    onChange={(e) => setUploadPixelise(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-xs text-muted">Pixelise to sprite size</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadRemoveBg}
                    onChange={(e) => setUploadRemoveBg(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-xs text-muted">Remove background (transparent PNG)</span>
                </label>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border bg-surface/50 hover:border-muted hover:bg-surface-hover cursor-pointer transition-colors"
            >
              <Upload className="h-8 w-8 text-muted" />
              <span className="text-sm text-muted">
                Drop an image here or click to browse
              </span>
              <span className="text-xs text-muted">PNG, JPG, or WebP</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
