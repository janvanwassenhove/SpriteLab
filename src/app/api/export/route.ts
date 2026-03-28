import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      format: rawFormat,
      frames,
      width,
      height,
      delay,
      scale,
      layout,
    }: {
      format: string;
      frames: { data: number[]; width: number; height: number }[];
      width: number;
      height: number;
      delay?: number;
      scale?: number;
      layout?: "auto" | "horizontal" | "vertical";
    } = body;

    const format = rawFormat === "spritesheet" ? "sprite-sheet" : rawFormat;

    if (!format || !frames?.length) {
      return NextResponse.json(
        { error: "format and frames are required" },
        { status: 400 }
      );
    }

    if (format === "sprite-sheet") {
      const selectedLayout = layout ?? "horizontal";
      const frameCount = frames.length;

      let sheetWidth: number;
      let sheetHeight: number;

      if (selectedLayout === "horizontal") {
        sheetWidth = width * frameCount;
        sheetHeight = height;
      } else if (selectedLayout === "vertical") {
        sheetWidth = width;
        sheetHeight = height * frameCount;
      } else {
        // Auto: try to make roughly square
        const cols = Math.ceil(Math.sqrt(frameCount));
        const rows = Math.ceil(frameCount / cols);
        sheetWidth = width * cols;
        sheetHeight = height * rows;
      }

      // Build raw pixel data for spritesheet
      const sheetData = new Uint8ClampedArray(sheetWidth * sheetHeight * 4);

      frames.forEach((frame, i) => {
        const srcData = new Uint8ClampedArray(frame.data);
        let dx: number, dy: number;

        if (selectedLayout === "horizontal") {
          dx = i * width;
          dy = 0;
        } else if (selectedLayout === "vertical") {
          dx = 0;
          dy = i * height;
        } else {
          const cols = Math.ceil(Math.sqrt(frameCount));
          dx = (i % cols) * width;
          dy = Math.floor(i / cols) * height;
        }

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = ((dy + y) * sheetWidth + (dx + x)) * 4;
            sheetData[dstIdx] = srcData[srcIdx];
            sheetData[dstIdx + 1] = srcData[srcIdx + 1];
            sheetData[dstIdx + 2] = srcData[srcIdx + 2];
            sheetData[dstIdx + 3] = srcData[srcIdx + 3];
          }
        }
      });

      return NextResponse.json({
        pixelData: Array.from(sheetData),
        width: sheetWidth,
        height: sheetHeight,
        metadata: {
          frameWidth: width,
          frameHeight: height,
          frameCount,
          layout: selectedLayout,
        },
      });
    }

    // For gif and png, the heavy work is done client-side
    return NextResponse.json({ error: "Use client-side export for this format" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export failed";
    console.error("Export error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
