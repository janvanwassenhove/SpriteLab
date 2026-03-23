import { v4 as uuidv4 } from "uuid";
import type { Layer, BlendMode } from "@/types";
import { createEmptyPixelData } from "@/utils";

export function createLayer(
  width: number,
  height: number,
  name = "Layer",
  options?: Partial<Pick<Layer, "visible" | "opacity" | "blendMode">>
): Layer {
  return {
    id: uuidv4(),
    name,
    visible: true,
    opacity: 1,
    blendMode: "normal" as BlendMode,
    data: createEmptyPixelData(width, height),
    width,
    height,
    ...options,
  };
}

export function duplicateLayer(layer: Layer, newName?: string): Layer {
  return {
    ...layer,
    id: uuidv4(),
    name: newName ?? `${layer.name} (copy)`,
    data: layer.data.slice(),
  };
}

export function mergeLayerDown(upper: Layer, lower: Layer): Layer {
  const merged = createLayer(lower.width, lower.height, lower.name);
  const total = lower.width * lower.height * 4;

  // Start with lower layer
  merged.data.set(lower.data);

  // Alpha composite upper onto merged
  const src = upper.data;
  const dst = merged.data;
  const opacity = upper.opacity;

  if (!upper.visible || opacity === 0) return merged;

  for (let i = 0; i < total; i += 4) {
    const sa = (src[i + 3] / 255) * opacity;
    if (sa === 0) continue;
    const da = dst[i + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA === 0) continue;

    dst[i] = (src[i] * sa + dst[i] * da * (1 - sa)) / outA;
    dst[i + 1] = (src[i + 1] * sa + dst[i + 1] * da * (1 - sa)) / outA;
    dst[i + 2] = (src[i + 2] * sa + dst[i + 2] * da * (1 - sa)) / outA;
    dst[i + 3] = outA * 255;
  }

  return merged;
}

export function flattenLayers(layers: Layer[], width: number, height: number): Uint8ClampedArray {
  const result = createEmptyPixelData(width, height);
  const total = width * height * 4;

  for (const layer of layers) {
    if (!layer.visible || layer.opacity === 0) continue;
    const src = layer.data;
    const opacity = layer.opacity;

    for (let i = 0; i < total; i += 4) {
      const sa = (src[i + 3] / 255) * opacity;
      if (sa === 0) continue;
      const da = result[i + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA === 0) continue;

      result[i] = (src[i] * sa + result[i] * da * (1 - sa)) / outA;
      result[i + 1] = (src[i + 1] * sa + result[i + 1] * da * (1 - sa)) / outA;
      result[i + 2] = (src[i + 2] * sa + result[i + 2] * da * (1 - sa)) / outA;
      result[i + 3] = outA * 255;
    }
  }
  return result;
}
