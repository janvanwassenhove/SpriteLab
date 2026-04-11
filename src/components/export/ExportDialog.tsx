"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Loader2, Image, Film, Package } from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import { flattenLayers } from "@/lib/canvas/layer";
import { downloadBlob } from "@/lib/export/bundle";
import { packSpriteSheet, imageDataToBlob } from "@/lib/export/sprite-sheet";
import { createAnimatedGif } from "@/lib/export/gif";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [tab, setTab] = useState("spritesheet");
  const [layout, setLayout] = useState<"horizontal" | "vertical" | "auto">("horizontal");
  const [scale, setScale] = useState(1);
  const [gifDelay, setGifDelay] = useState(100);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const currentAnimation = useProjectStore((s) => s.currentAnimation);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);

  function getFrameImageData(): ImageData[] {
    if (!currentAnimation) return [];
    return currentAnimation.frames.map((frame) => {
      const flat = flattenLayers(frame.layers, canvasWidth, canvasHeight);
      const copy = new Uint8ClampedArray(flat.length);
      copy.set(flat);
      return new ImageData(copy, canvasWidth, canvasHeight);
    });
  }

  async function handleExportSpriteSheet() {
    setExporting(true);
    setProgress(20);

    try {
      if (!currentAnimation || currentAnimation.frames.length === 0) return;

      setProgress(50);

      const { imageData } = packSpriteSheet(
        currentAnimation.frames,
        canvasWidth,
        canvasHeight,
        layout
      );

      setProgress(80);

      const blob = await imageDataToBlob(imageData);
      downloadBlob(blob, `${currentAnimation.name ?? "spritesheet"}.png`);

      setProgress(100);
    } catch (err) {
      console.error("Spritesheet export error:", err);
      alert("Export failed");
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }

  async function handleExportGif() {
    setExporting(true);
    setProgress(20);

    try {
      if (!currentAnimation || currentAnimation.frames.length === 0) return;

      setProgress(50);

      const framesWithDelay = currentAnimation.frames.map((f) => ({
        ...f,
        delay: gifDelay,
      }));

      const blob = await createAnimatedGif(framesWithDelay, {
        width: canvasWidth,
        height: canvasHeight,
        scale,
      });

      setProgress(80);

      downloadBlob(blob, `${currentAnimation.name ?? "animation"}.gif`);

      setProgress(100);
    } catch (err) {
      console.error("GIF export error:", err);
      alert("Export failed");
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }

  async function handleExportPng() {
    setExporting(true);
    try {
      const frames = getFrameImageData();
      if (frames.length === 0) return;

      // Export individual frames as PNGs
      for (let i = 0; i < frames.length; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = frames[i].width * scale;
        canvas.height = frames[i].height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = frames[i].width;
        tempCanvas.height = frames[i].height;
        tempCanvas.getContext("2d")!.putImageData(frames[i], 0, 0);

        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );
        downloadBlob(
          blob,
          `${currentAnimation?.name ?? "frame"}_${String(i).padStart(3, "0")}.png`
        );

        setProgress(Math.round(((i + 1) / frames.length) * 100));
      }
    } catch (err) {
      console.error("PNG export error:", err);
      alert("Export failed");
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Export Animation</DialogTitle>
      </DialogHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="spritesheet">
            <Image className="h-3.5 w-3.5 mr-1" />
            Sprite Sheet
          </TabsTrigger>
          <TabsTrigger value="gif">
            <Film className="h-3.5 w-3.5 mr-1" />
            GIF
          </TabsTrigger>
          <TabsTrigger value="png">
            <Package className="h-3.5 w-3.5 mr-1" />
            PNG Sequence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spritesheet">
          <div className="space-y-3">
            <div>
              <Label>Layout</Label>
              <Select
                value={layout}
                onChange={(e) => setLayout(e.target.value as typeof layout)}
                options={[
                  { value: "horizontal", label: "Horizontal Strip" },
                  { value: "vertical", label: "Vertical Strip" },
                  { value: "auto", label: "Auto (Packed)" },
                ]}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted">
              {currentAnimation?.frames.length ?? 0} frames at {canvasWidth}×{canvasHeight}px
            </p>
          </div>
        </TabsContent>

        <TabsContent value="gif">
          <div className="space-y-3">
            <div>
              <Label>Frame Delay (ms)</Label>
              <Input
                type="number"
                min={10}
                max={5000}
                value={gifDelay}
                onChange={(e) => setGifDelay(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Scale</Label>
              <Select
                value={String(scale)}
                onChange={(e) => setScale(Number(e.target.value))}
                options={[
                  { value: "1", label: "1x" },
                  { value: "2", label: "2x" },
                  { value: "4", label: "4x" },
                  { value: "8", label: "8x" },
                ]}
                className="mt-1"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="png">
          <div className="space-y-3">
            <div>
              <Label>Scale</Label>
              <Select
                value={String(scale)}
                onChange={(e) => setScale(Number(e.target.value))}
                options={[
                  { value: "1", label: "1x" },
                  { value: "2", label: "2x" },
                  { value: "4", label: "4x" },
                  { value: "8", label: "8x" },
                ]}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted">
              Exports {currentAnimation?.frames.length ?? 0} individual PNG files
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {exporting && progress > 0 && (
        <div className="mt-3">
          <Progress value={progress} />
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (tab === "spritesheet") handleExportSpriteSheet();
            else if (tab === "gif") handleExportGif();
            else handleExportPng();
          }}
          disabled={exporting || !currentAnimation?.frames.length}
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
