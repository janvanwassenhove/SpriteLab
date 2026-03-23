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

export { db };
export type { DBProject, DBSprite, DBAnimation };
