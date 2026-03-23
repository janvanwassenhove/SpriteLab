"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelHandle,
} from "react-resizable-panels";
import {
  ArrowLeft,
  Save,
  Download,
  Settings,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Canvas } from "./Canvas";
import { Toolbar } from "./Toolbar";
import { LayerPanel } from "./LayerPanel";
import { ColorPanel } from "./ColorPanel";
import { Timeline } from "@/components/animation/Timeline";
import { RightPanel } from "./RightPanel";
import { StatusBar } from "./StatusBar";
import { ExportDialog } from "@/components/export/ExportDialog";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useProjectStore } from "@/stores/project-store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function EditorLayout() {
  const router = useRouter();
  const projectName = useProjectStore((s) => s.project?.name ?? "Untitled");
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useKeyboardShortcuts();

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-3 py-1.5 h-10 shrink-0">
        <div className="flex items-center gap-2">
          <Tooltip content="Back to projects">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Swords className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium">{projectName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content="Save (Ctrl+S)">
            <Button variant="ghost" size="icon">
              <Save className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Export">
            <Button variant="ghost" size="icon" onClick={() => setShowExport(true)}>
              <Download className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Settings">
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </header>

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left toolbar (vertical) */}
        <Toolbar />

        {/* Wrapper gives PanelGroup a properly-sized parent so its internal width:100%/height:100% resolve correctly */}
        <div className="flex-1 min-w-0 min-h-0 h-full overflow-hidden">
          <PanelGroup
            orientation="horizontal"
            defaultLayout={{ left: 15, center: 60, right: 25 }}
          >
            {/* Left panel: Layers + Colors */}
            <Panel id="left" defaultSize="15%" minSize="12%" maxSize="25%">
              <div className="flex flex-col h-full min-w-0 min-h-0 border-r border-border bg-surface overflow-hidden">
                <div className="shrink-0">
                  <ColorPanel />
                </div>
                <LayerPanel />
              </div>
            </Panel>

            <PanelHandle className="w-1.5 bg-border hover:bg-accent transition-colors cursor-col-resize" />

            {/* Center: Canvas + Timeline */}
            <Panel id="center" defaultSize="60%" minSize="40%">
              <PanelGroup
                orientation="vertical"
                defaultLayout={{ canvas: 75, timeline: 25 }}
              >
                <Panel id="canvas" defaultSize="75%" minSize="50%">
                  <Canvas />
                </Panel>
                <PanelHandle className="h-1.5 bg-border hover:bg-accent transition-colors cursor-row-resize" />
                <Panel id="timeline" defaultSize="25%" minSize="15%" maxSize="40%">
                  <Timeline />
                </Panel>
              </PanelGroup>
            </Panel>

            <PanelHandle className="w-1.5 bg-border hover:bg-accent transition-colors cursor-col-resize" />

            {/* Right panel: AI / Fighter Pack / Hitbox */}
            <Panel id="right" defaultSize="25%" minSize="18%" maxSize="35%">
              <RightPanel />
            </Panel>
          </PanelGroup>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Dialogs */}
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
