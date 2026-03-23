"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Key, Palette, Monitor } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [tab, setTab] = useState("canvas");
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const [width, setWidth] = useState(canvasWidth);
  const [height, setHeight] = useState(canvasHeight);

  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  function handleSaveCanvas() {
    if (width > 0 && width <= 512 && height > 0 && height <= 512) {
      setCanvasSize(width, height);
    }
    onClose();
  }

  function handleSaveApiKeys() {
    // Store in localStorage (not ideal for production, but works for self-hosted)
    if (openaiKey) localStorage.setItem("OPENAI_API_KEY", openaiKey);
    if (geminiKey) localStorage.setItem("GEMINI_API_KEY", geminiKey);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>
          <Settings className="h-4 w-4 inline mr-2" />
          Settings
        </DialogTitle>
      </DialogHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="canvas">
            <Monitor className="h-3.5 w-3.5 mr-1" />
            Canvas
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="h-3.5 w-3.5 mr-1" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="theme">
            <Palette className="h-3.5 w-3.5 mr-1" />
            Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="canvas">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Width (px)</Label>
                <Input
                  type="number"
                  min={1}
                  max={512}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Height (px)</Label>
                <Input
                  type="number"
                  min={1}
                  max={512}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Changing canvas size will not resize existing sprites.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="api">
          <div className="space-y-3">
            <div>
              <Label>OpenAI API Key</Label>
              <Input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Google Gemini API Key</Label>
              <Input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AI..."
                className="mt-1"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Keys are stored locally. For production, set them in your .env file.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="theme">
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Theme customization coming soon. Currently using dark theme.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (tab === "canvas") handleSaveCanvas();
            else if (tab === "api") handleSaveApiKeys();
            else onClose();
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
