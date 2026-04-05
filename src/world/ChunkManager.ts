import * as THREE from "three";
import {
  buildTerrainChunk,
  TerrainChunkResult,
  CHUNK_SIZE,
} from "./TerrainChunkBuilder.js";
import {
  getTerrainHeight,
  getBiomeNoise,
  seededNoise2D,
  WATER_LEVEL,
} from "./Noise.js";
import RAPIER from "@dimforge/rapier3d-compat";

export { CHUNK_SIZE, WATER_LEVEL };

export const LOAD_RADIUS = 3;
export const UNLOAD_RADIUS = 4;

interface LoadedChunk extends TerrainChunkResult {
  collider: RAPIER.RigidBody | null;
}

export class ChunkManager {
  private chunks: Map<string, LoadedChunk> = new Map();
  private scene: THREE.Scene;
  private rapiWorld: RAPIER.World | null;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private currentChunk: { x: number; z: number } = { x: 0, z: 0 };
  private pendingLoads: { x: number; z: number; priority: number }[] = [];
  private maxLoadsPerFrame = 2;
  private loadingState: "init" | "loading" | "complete" = "init";
  private loadProgress = 0;
  private requiredChunks = 0;
  private loadedChunks = 0;

  constructor(scene: THREE.Scene, rapiWorld: RAPIER.World | null) {
    this.scene = scene;
    this.rapiWorld = rapiWorld;
  }

  private getChunkKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  update(playerPosition: THREE.Vector3): void {
    this.playerPosition.copy(playerPosition);

    const newChunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
    const newChunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);

    if (
      newChunkX !== this.currentChunk.x ||
      newChunkZ !== this.currentChunk.z
    ) {
      this.currentChunk.x = newChunkX;
      this.currentChunk.z = newChunkZ;
      this.updateChunks();
    }

    this.processPendingLoads();
    this.unloadDistantChunks();
  }

  private updateChunks(): void {
    for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
      for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
        const chunkX = this.currentChunk.x + dx;
        const chunkZ = this.currentChunk.z + dz;
        const key = this.getChunkKey(chunkX, chunkZ);

        if (!this.chunks.has(key) && !this.isPending(key)) {
          const distance = Math.sqrt(dx * dx + dz * dz);
          this.pendingLoads.push({ x: chunkX, z: chunkZ, priority: distance });
        }
      }
    }

    this.pendingLoads.sort((a, b) => a.priority - b.priority);
  }

  private processPendingLoads(): void {
    let loaded = 0;
    const stillPending: typeof this.pendingLoads = [];

    for (const load of this.pendingLoads) {
      if (loaded >= this.maxLoadsPerFrame) {
        stillPending.push(load);
        continue;
      }

      const key = this.getChunkKey(load.x, load.z);
      if (!this.chunks.has(key)) {
        this.loadChunkImmediate(load.x, load.z);
        loaded++;
      }
    }

    this.pendingLoads = stillPending;
  }

  private loadChunkImmediate(chunkX: number, chunkZ: number): void {
    const key = this.getChunkKey(chunkX, chunkZ);
    if (this.chunks.has(key)) return;

    try {
      const result = buildTerrainChunk(chunkX, chunkZ);
      this.scene.add(result.mesh);

      let collider: RAPIER.RigidBody | null = null;
      if (this.rapiWorld) {
        collider = this.createTerrainPhysics(result);
      }

      this.chunks.set(key, { ...result, collider });

      if (this.loadingState === "loading") {
        this.loadedChunks++;
        this.loadProgress =
          this.loadedChunks / Math.max(1, this.requiredChunks);
      }
    } catch (e) {
      console.error(`Failed to load chunk ${key}:`, e);
    }
  }

  private createTerrainPhysics(
    chunk: TerrainChunkResult,
  ): RAPIER.RigidBody | null {
    if (!this.rapiWorld) return null;

    const heights = chunk.heightData;
    const resolution = chunk.resolution;
    const worldX = chunk.chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
    const worldZ = chunk.chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;

    try {
      const colliderDesc = RAPIER.ColliderDesc.heightfield(
        resolution - 1,
        resolution - 1,
        heights,
        { x: CHUNK_SIZE, y: 1.0, z: CHUNK_SIZE },
      );

      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
        worldX,
        0,
        worldZ,
      );
      const rigidBody = this.rapiWorld.createRigidBody(rigidBodyDesc);

      colliderDesc.setTranslation(0, 0, 0);
      this.rapiWorld.createCollider(colliderDesc, rigidBody);

      return rigidBody;
    } catch (e) {
      console.error("Failed to create terrain physics:", e);
      return null;
    }
  }

  private unloadDistantChunks(): void {
    const neededKeys: Set<string> = new Set();

    for (let dz = -UNLOAD_RADIUS; dz <= UNLOAD_RADIUS; dz++) {
      for (let dx = -UNLOAD_RADIUS; dx <= UNLOAD_RADIUS; dx++) {
        const chunkX = this.currentChunk.x + dx;
        const chunkZ = this.currentChunk.z + dz;
        const key = this.getChunkKey(chunkX, chunkZ);
        neededKeys.add(key);
      }
    }

    for (const [key, chunk] of this.chunks) {
      if (!neededKeys.has(key)) {
        this.unloadChunk(key, chunk);
      }
    }
  }

  private unloadChunk(key: string, chunk: LoadedChunk): void {
    this.scene.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();

    if (chunk.collider && this.rapiWorld) {
      this.rapiWorld.removeRigidBody(chunk.collider);
    }

    this.chunks.delete(key);
  }

  private isPending(key: string): boolean {
    return this.pendingLoads.some((l) => this.getChunkKey(l.x, l.z) === key);
  }

  getHeightAt(worldX: number, worldZ: number): number {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const key = this.getChunkKey(chunkX, chunkZ);

    const chunk = this.chunks.get(key);
    if (chunk) {
      return this.getHeightFromChunk(chunk, worldX, worldZ);
    }

    return getTerrainHeight(worldX, worldZ);
  }

  private getHeightFromChunk(
    chunk: LoadedChunk,
    worldX: number,
    worldZ: number,
  ): number {
    const localX = worldX - chunk.chunkX * CHUNK_SIZE;
    const localZ = worldZ - chunk.chunkZ * CHUNK_SIZE;
    const res = chunk.resolution;

    const gridX = (localX / CHUNK_SIZE) * (res - 1);
    const gridZ = (localZ / CHUNK_SIZE) * (res - 1);
    const ix = Math.min(Math.floor(gridX), res - 2);
    const iz = Math.min(Math.floor(gridZ), res - 2);
    const fx = gridX - ix;
    const fz = gridZ - iz;

    const h00 = chunk.heightData[iz * res + ix];
    const h10 = chunk.heightData[iz * res + ix + 1];
    const h01 = chunk.heightData[(iz + 1) * res + ix];
    const h11 = chunk.heightData[(iz + 1) * res + ix + 1];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }

  getTerrainHeightAt(worldX: number, worldZ: number): number | null {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const key = this.getChunkKey(chunkX, chunkZ);

    const chunk = this.chunks.get(key);
    if (chunk) {
      return this.getHeightFromChunk(chunk, worldX, worldZ);
    }

    return null;
  }

  isChunkLoaded(key: string): boolean {
    return this.chunks.has(key);
  }

  getHeightAtLocal(x: number, z: number): number {
    return getTerrainHeight(x, z);
  }

  getSlopeAt(worldX: number, worldZ: number): number {
    const delta = 0.5;
    const h = getTerrainHeight(worldX, worldZ);
    const hRight = getTerrainHeight(worldX + delta, worldZ);
    const hForward = getTerrainHeight(worldX, worldZ + delta);

    const slopeX = Math.abs(hRight - h) / delta;
    const slopeZ = Math.abs(hForward - h) / delta;

    return Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
  }

  getBiomeAt(worldX: number, worldZ: number) {
    const biomeNoise = getBiomeNoise(worldX, worldZ);

    let biome: string;
    let blendFactor = 0;

    if (biomeNoise < -0.25) {
      biome = "desert";
      blendFactor = Math.max(0, (-biomeNoise - 0.25) / 0.2);
    } else if (biomeNoise > 0.3) {
      biome = "snow";
      blendFactor = Math.min(1, (biomeNoise - 0.3) / 0.2);
    } else {
      biome = "forest";
    }

    return { biome, blendFactor };
  }

  getActiveChunks(): LoadedChunk[] {
    return Array.from(this.chunks.values());
  }

  getLoadedChunkCount(): number {
    return this.chunks.size;
  }

  getLoadingProgress(): number {
    return this.loadProgress;
  }

  isLoadingComplete(): boolean {
    return this.loadingState === "complete";
  }

  async loadInitialChunks(centerX: number, centerZ: number): Promise<void> {
    this.loadingState = "loading";
    this.loadedChunks = 0;

    const essentialChunks: { x: number; z: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        essentialChunks.push({ x: centerX + dx, z: centerZ + dz });
      }
    }

    this.requiredChunks = essentialChunks.length;

    for (let i = 0; i < essentialChunks.length; i++) {
      const c = essentialChunks[i];
      this.loadChunkImmediate(c.x, c.z);
      this.loadProgress = (i + 1) / essentialChunks.length;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.loadingState = "complete";
  }

  dispose(): void {
    for (const [key, chunk] of this.chunks) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      if (chunk.collider && this.rapiWorld) {
        this.rapiWorld.removeRigidBody(chunk.collider);
      }
    }
    this.chunks.clear();
    this.pendingLoads = [];
  }
}
