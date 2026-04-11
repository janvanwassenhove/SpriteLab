"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import {
  Plus,
  Swords,
  FolderOpen,
  Sparkles,
  Upload,
  Trash2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { listProjectsLocal } from "@/lib/storage/local-db";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher";

const SPRITE_SIZES = [
  { value: "16", label: "16×16" },
  { value: "32", label: "32×32" },
  { value: "48", label: "48×48" },
  { value: "64", label: "64×64" },
  { value: "96", label: "96×96" },
  { value: "128", label: "128×128" },
  { value: "256", label: "256×256" },
];

interface ProjectEntry {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
  thumbnail?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [showNewProject, setShowNewProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [projectName, setProjectName] = useState("New Fighter");
  const [spriteSize, setSpriteSize] = useState("64");
  const [projects, setProjects] = useState<ProjectEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("sprite-projects") ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Hydrate thumbnails from IndexedDB for projects missing them
    listProjectsLocal().then((dbProjects) => {
      const thumbMap = new Map<string, string>();
      for (const dbp of dbProjects) {
        if (dbp.thumbnail) thumbMap.set(dbp.id, dbp.thumbnail);
      }
      if (thumbMap.size === 0) return;

      setProjects((prev) => {
        let changed = false;
        const updated = prev.map((p) => {
          if (!p.thumbnail && thumbMap.has(p.id)) {
            changed = true;
            return { ...p, thumbnail: thumbMap.get(p.id) };
          }
          return p;
        });
        if (changed) {
          localStorage.setItem("sprite-projects", JSON.stringify(updated));
        }
        return changed ? updated : prev;
      });
    });
  }, []);

  function createProject() {
    const id = uuid();
    const size = parseInt(spriteSize);
    const entry: ProjectEntry = {
      id,
      name: projectName || "Untitled",
      width: size,
      height: size,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...projects];
    setProjects(updated);
    localStorage.setItem("sprite-projects", JSON.stringify(updated));
    setShowNewProject(false);
    router.push(`/editor/${id}?w=${size}&h=${size}&name=${encodeURIComponent(entry.name)}`);
  }

  function deleteProject(id: string) {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    localStorage.setItem("sprite-projects", JSON.stringify(updated));
    localStorage.removeItem(`project-${id}`);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Swords className="h-7 w-7 text-accent" />
          <h1 className="text-xl font-bold tracking-tight">SpriteLab</h1>
          <span className="text-xs text-muted font-mono">v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push("/wizard")} size="sm">
            <Sparkles className="h-4 w-4" />
            Character Wizard
          </Button>
          <Button onClick={() => setShowNewProject(true)} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
          <ThemeSwitcher />
          <Button onClick={() => setShowSettings(true)} size="sm" variant="ghost">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-24 h-24 rounded-2xl bg-surface flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-muted" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Create Your First Fighter</h2>
              <p className="text-muted max-w-md">
                Design pixel art fighter sprites with a built-in editor and AI generation.
                Generate complete fighter packs with all animations.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push("/wizard")}>
                <Sparkles className="h-4 w-4" />
                Character Wizard
              </Button>
              <Button variant="outline" onClick={() => setShowNewProject(true)}>
                <Plus className="h-4 w-4" />
                Blank Project
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Projects</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* New project card */}
              <button
                onClick={() => setShowNewProject(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 hover:border-accent hover:bg-surface-hover transition-colors min-h-[200px]"
              >
                <Plus className="h-8 w-8 text-muted" />
                <span className="text-sm text-muted">New Project</span>
              </button>

              {/* Project cards */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group relative flex flex-col rounded-lg border border-border bg-surface hover:border-muted transition-colors cursor-pointer overflow-hidden"
                  onClick={() =>
                    router.push(
                      `/editor/${project.id}?w=${project.width}&h=${project.height}&name=${encodeURIComponent(project.name)}`
                    )
                  }
                >
                  {/* Thumbnail */}
                  <div className="flex items-center justify-center h-32 bg-surface-alt">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="max-w-full max-h-full"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <FolderOpen className="h-10 w-10 text-muted" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted">
                      {project.width}×{project.height} &middot;{" "}
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded bg-surface/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onClose={() => setShowNewProject(false)}>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Fighter Name</Label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Shadow Knight"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Sprite Size</Label>
            <Select
              value={spriteSize}
              onChange={(e) => setSpriteSize(e.target.value)}
              options={SPRITE_SIZES}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewProject(false)}>
            Cancel
          </Button>
          <Button onClick={createProject}>Create</Button>
        </DialogFooter>
      </Dialog>

      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
