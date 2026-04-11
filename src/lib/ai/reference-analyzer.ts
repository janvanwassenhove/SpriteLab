/**
 * Server-side utility to decode a base64 PNG reference image into raw pixel data
 * for palette extraction. This uses Node.js APIs so it can run in API routes.
 */

/**
 * Decode a base64 PNG and return its raw RGBA pixel data + dimensions.
 * Uses a lightweight approach: converts to a tiny canvas via sharp-like decoding.
 * Since we only need color frequencies (not pixel positions), we decode the PNG
 * raw data and extract colour info from the IDAT chunks.
 *
 * For simplicity and zero-dependency operation, we use the built-in Node.js
 * Buffer + a basic PNG RGBA extractor.
 */
export async function extractPaletteFromBase64(
  base64: string
): Promise<{ palette: Uint8ClampedArray; width: number; height: number }> {
  // Strip data-URL prefix if present
  const raw = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");

  // Use a dynamic import of the canvas library if available, otherwise
  // fall back to a simple frequency-based extraction from raw bytes.
  // We attempt to use the built-in ImageData decoding via 'canvas' npm package.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const canvasLib = require("canvas");
    const img = await canvasLib.loadImage(buffer);
    const canvas = canvasLib.createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    return {
      palette: new Uint8ClampedArray(imageData.data),
      width: img.width as number,
      height: img.height as number,
    };
  } catch {
    // 'canvas' package not available — extract colors from raw PNG bytes
    // This is a rough fallback that samples RGB triplets from the decompressed data
    return extractColorsFromPngBuffer(buffer);
  }
}

/**
 * Fallback: extract pixel-like RGBA data from raw PNG buffer by decompressing IDAT.
 * Returns a synthetic Uint8ClampedArray with color samples.
 */
function extractColorsFromPngBuffer(
  buffer: Buffer
): { palette: Uint8ClampedArray; width: number; height: number } {
  // Read PNG header to get dimensions
  // PNG signature: 8 bytes, then IHDR chunk
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  // Collect all IDAT data
  const idatChunks: Buffer[] = [];
  let offset = 8; // skip signature
  while (offset < buffer.length) {
    const chunkLen = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
    if (chunkType === "IDAT") {
      idatChunks.push(buffer.subarray(offset + 8, offset + 8 + chunkLen));
    }
    offset += 12 + chunkLen; // length(4) + type(4) + data + crc(4)
  }

  if (idatChunks.length === 0) {
    return { palette: new Uint8ClampedArray(0), width, height };
  }

  // Decompress
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const zlib = require("zlib") as typeof import("zlib");
  const compressed = Buffer.concat(idatChunks);
  let decompressed: Buffer;
  try {
    decompressed = zlib.inflateSync(compressed);
  } catch {
    return { palette: new Uint8ClampedArray(0), width, height };
  }

  // Parse decompressed data: each row has a filter byte then RGBA/RGB pixels
  // We assume RGBA (color type 6) with 8-bit depth as that's what PNG export produces
  const bytesPerPixel = 4; // RGBA
  const rowBytes = 1 + width * bytesPerPixel; // 1 filter byte + pixel data
  const result = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowBytes;
    if (rowStart >= decompressed.length) break;
    // Skip filter byte (byte 0 of row) — we do basic no-filter/sub handling
    const filterByte = decompressed[rowStart];
    for (let x = 0; x < width; x++) {
      const srcIdx = rowStart + 1 + x * bytesPerPixel;
      const dstIdx = (y * width + x) * 4;
      if (srcIdx + 3 >= decompressed.length) break;

      let r = decompressed[srcIdx];
      let g = decompressed[srcIdx + 1];
      let b = decompressed[srcIdx + 2];
      let a = decompressed[srcIdx + 3];

      // Apply Sub filter reconstruction
      if (filterByte === 1 && x > 0) {
        const prevIdx = srcIdx - bytesPerPixel;
        r = (r + decompressed[prevIdx]) & 0xff;
        g = (g + decompressed[prevIdx + 1]) & 0xff;
        b = (b + decompressed[prevIdx + 2]) & 0xff;
        a = (a + decompressed[prevIdx + 3]) & 0xff;
      }

      result[dstIdx] = r;
      result[dstIdx + 1] = g;
      result[dstIdx + 2] = b;
      result[dstIdx + 3] = a;
    }
  }

  return { palette: result, width, height };
}
