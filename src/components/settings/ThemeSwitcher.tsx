"use client";

import { useState, useRef, useEffect } from "react";
import {
  Palette,
  Moon,
  Eye,
  Sun,
  Snowflake,
  Cpu,
  Trees,
  SunDim,
  Check,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { THEMES } from "@/types";
import type { ThemeId } from "@/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  moon: Moon,
  eye: Eye,
  sun: Sun,
  snowflake: Snowflake,
  palette: Palette,
  cpu: Cpu,
  trees: Trees,
  "sun-dim": SunDim,
};

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleSelect(id: ThemeId) {
    setTheme(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-foreground hover:bg-surface-hover transition-colors"
        title="Switch theme"
      >
        <Palette className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-surface shadow-xl overflow-hidden">
          {THEMES.map((t) => {
            const Icon = ICON_MAP[t.icon] ?? Palette;
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs text-left transition-colors ${
                  active
                    ? "bg-accent/15 text-accent"
                    : "hover:bg-surface-hover text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{t.name}</span>
                {active && <Check className="h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
