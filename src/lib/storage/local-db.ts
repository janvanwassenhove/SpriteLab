import Dexie, { type EntityTable } from "dexie";

interface DBProject {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  paletteId?: string;
  data: string; // JSON-serialized project data
  thumbnail?: string; // data URL
  createdAt: Date;
  updatedAt: Date;
}

interface DBSprite {
  id: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
  layers: ArrayBuffer; // serialized layer pixel data
}

interface DBAnimation {
  id: string;
  projectId: string;
  name: string;
  data: string; // JSON-serialized animation data
}

class SpriteLabDB extends Dexie {
  projects!: EntityTable<DBProject, "id">;
  sprites!: EntityTable<DBSprite, "id">;
  animations!: EntityTable<DBAnimation, "id">;

  constructor() {
    super("SpriteLabDB");
    this.version(1).stores({
      projects: "id, name, updatedAt",
      sprites: "id, projectId",
      animations: "id, projectId",
    });
  }
}

const db = new SpriteLabDB();

// ---- Projects ----

export async function saveProjectLocal(project: {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  paletteId?: string;
  data: unknown;
  thumbnail?: string;
}) {
  const now = new Date();
  const existing = await db.projects.get(project.id);

  await db.projects.put({
    id: project.id,
    name: project.name,
    canvasWidth: project.canvasWidth,
    canvasHeight: project.canvasHeight,
    paletteId: project.paletteId,
    data: JSON.stringify(project.data),
    thumbnail: project.thumbnail,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

export async function loadProjectLocal(id: string): Promise<DBProject | undefined> {
  return db.projects.get(id);
}

export async function listProjectsLocal(): Promise<DBProject[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function deleteProjectLocal(id: string) {
  await db.transaction("rw", [db.projects, db.sprites, db.animations], async () => {
    await db.sprites.where("projectId").equals(id).delete();
    await db.animations.where("projectId").equals(id).delete();
    await db.projects.delete(id);
  });
}

// ---- Sprites ----

export async function saveSpriteLocal(sprite: {
  id: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
  layers: ArrayBuffer;
}) {
  await db.sprites.put(sprite);
}

export async function loadSpritesForProject(projectId: string): Promise<DBSprite[]> {
  return db.sprites.where("projectId").equals(projectId).toArray();
}

// ---- Animations ----

export async function saveAnimationLocal(animation: {
  id: string;
  projectId: string;
  name: string;
  data: unknown;
}) {
  await db.animations.put({
    id: animation.id,
    projectId: animation.projectId,
    name: animation.name,
    data: JSON.stringify(animation.data),
  });
}

export async function loadAnimationsForProject(projectId: string): Promise<DBAnimation[]> {
  return db.animations.where("projectId").equals(projectId).toArray();
}

// ---- Full Project Persistence (animations with pixel data) ----

interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  data: string; // base64-encoded RGBA
  width: number;
  height: number;
}

interface SerializedFrame {
  id: string;
  layers: SerializedLayer[];
  delay: number;
  hitboxes?: unknown[];
}

interface SerializedAnimation {
  id: string;
  name: string;
  frames: SerializedFrame[];
  loop: string;
}

interface SerializedProject {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  animations: SerializedAnimation[];
  sprites: unknown[];
  fighterPacks: unknown[];
  baseCharacterImage?: string;
  baseCharacterName?: string;
  baseCharacterPrompt?: string;
  baseCharacterProvider?: string;
  createdAt: string;
  updatedAt: string;
}

function uint8ArrayToBase64(data: Uint8ClampedArray): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(b64: string): Uint8ClampedArray {
  const binary = atob(b64);
  const arr = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

function generateThumbnail(project: import("@/types").Project): string | undefined {
  const firstFrame = project.animations[0]?.frames[0];
  if (!firstFrame?.layers.length) return undefined;

  const w = project.canvasWidth;
  const h = project.canvasHeight;
  const composite = new Uint8ClampedArray(w * h * 4);

  for (const layer of firstFrame.layers) {
    if (!layer.visible || layer.opacity === 0) continue;
    const alpha = layer.opacity;
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const srcA = (layer.data[idx + 3] / 255) * alpha;
      const dstA = composite[idx + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA > 0) {
        composite[idx] = (layer.data[idx] * srcA + composite[idx] * dstA * (1 - srcA)) / outA;
        composite[idx + 1] = (layer.data[idx + 1] * srcA + composite[idx + 1] * dstA * (1 - srcA)) / outA;
        composite[idx + 2] = (layer.data[idx + 2] * srcA + composite[idx + 2] * dstA * (1 - srcA)) / outA;
        composite[idx + 3] = outA * 255;
      }
    }
  }

  // Check if there are any non-transparent pixels
  let hasContent = false;
  for (let i = 3; i < composite.length; i += 4) {
    if (composite[i] > 0) {
      hasContent = true;
      break;
    }
  }
  if (!hasContent) return undefined;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(w, h);
  imgData.data.set(composite);
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

function updateLocalStorageMetadata(project: import("@/types").Project, thumbnail?: string) {
  try {
    const stored: Array<{ id: string; name?: string; thumbnail?: string }> = JSON.parse(
      localStorage.getItem("sprite-projects") ?? "[]"
    );
    const idx = stored.findIndex((p) => p.id === project.id);
    if (idx !== -1) {
      stored[idx] = { ...stored[idx], name: project.name, thumbnail };
      localStorage.setItem("sprite-projects", JSON.stringify(stored));
    }
  } catch {
    // localStorage unavailable or corrupt — ignore
  }
}

export async function saveProjectFull(project: import("@/types").Project) {
  const thumbnail = typeof document !== "undefined" ? generateThumbnail(project) : undefined;

  const serialized: SerializedProject = {
    id: project.id,
    name: project.name,
    canvasWidth: project.canvasWidth,
    canvasHeight: project.canvasHeight,
    animations: project.animations.map((anim) => ({
      id: anim.id,
      name: anim.name,
      loop: anim.loop,
      frames: anim.frames.map((frame) => ({
        id: frame.id,
        delay: frame.delay,
        hitboxes: frame.hitboxes,
        layers: frame.layers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode,
          width: layer.width,
          height: layer.height,
          data: uint8ArrayToBase64(layer.data),
        })),
      })),
    })),
    sprites: project.sprites,
    fighterPacks: project.fighterPacks,
    baseCharacterImage: project.baseCharacterImage,
    baseCharacterName: project.baseCharacterName,
    baseCharacterPrompt: project.baseCharacterPrompt,
    baseCharacterProvider: project.baseCharacterProvider,
    createdAt: project.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveProjectLocal({
    id: project.id,
    name: project.name,
    canvasWidth: project.canvasWidth,
    canvasHeight: project.canvasHeight,
    data: serialized,
    thumbnail,
  });

  updateLocalStorageMetadata(project, thumbnail);
}

export async function loadProjectFull(
  id: string
): Promise<import("@/types").Project | null> {
  const row = await loadProjectLocal(id);
  if (!row) return null;

  let serialized: SerializedProject;
  try {
    serialized = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  } catch {
    return null;
  }

  if (!serialized?.animations?.length) return null;

  return {
    id: serialized.id,
    name: serialized.name,
    canvasWidth: serialized.canvasWidth,
    canvasHeight: serialized.canvasHeight,
    animations: serialized.animations.map((anim) => ({
      id: anim.id,
      name: anim.name,
      loop: anim.loop as import("@/types").LoopMode,
      frames: anim.frames.map((frame) => ({
        id: frame.id,
        delay: frame.delay,
        hitboxes: (frame.hitboxes ?? []) as import("@/types").Hitbox[],
        layers: frame.layers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode as import("@/types").BlendMode,
          width: layer.width,
          height: layer.height,
          data: base64ToUint8Array(layer.data),
        })),
      })),
    })),
    sprites: (serialized.sprites ?? []) as import("@/types").SpriteData[],
    fighterPacks: (serialized.fighterPacks ?? []) as import("@/types").FighterPack[],
    baseCharacterImage: serialized.baseCharacterImage,
    baseCharacterName: serialized.baseCharacterName,
    baseCharacterPrompt: serialized.baseCharacterPrompt,
    baseCharacterProvider: serialized.baseCharacterProvider as import("@/types").AIProvider | undefined,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
  };
}

// ---- Wizard Results (temporary transfer blobs) ----

interface DBWizardResult {
  projectId: string;
  data: string; // JSON-serialized wizard result
}

// Bump DB version to add wizardResults table
db.version(2).stores({
  projects: "id, name, updatedAt",
  sprites: "id, projectId",
  animations: "id, projectId",
  wizardResults: "projectId",
});

const wizardResults = db.table<DBWizardResult, string>("wizardResults");

export async function saveWizardResult(projectId: string, data: unknown) {
  await wizardResults.put({ projectId, data: JSON.stringify(data) });
}

export async function loadWizardResult(projectId: string): Promise<unknown | undefined> {
  const row = await wizardResults.get(projectId);
  return row ? JSON.parse(row.data) : undefined;
}

export async function deleteWizardResult(projectId: string) {
  await wizardResults.delete(projectId);
}

export { db };
export type { DBProject, DBSprite, DBAnimation };
