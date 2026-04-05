import * as THREE from "three";
import { BiomeSystem, BiomeType } from "./BiomeSystem.js";
import { smoothstep } from "../utils/MathUtils.js";

export const CHUNK_SIZE = 128;
export const CHUNK_RESOLUTION = 128;

export class TerrainChunk {
  public mesh: THREE.Mesh;
  public chunkX: number;
  public chunkZ: number;
  public position: THREE.Vector3;
  public heightData: Float32Array;
  public readonly resolution: number;
  public readonly size: number;

  private geometry: THREE.BufferGeometry;
  private biomeSystem: BiomeSystem;
  private disposed = false;

  constructor(chunkX: number, chunkZ: number, biomeSystem: BiomeSystem) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.biomeSystem = biomeSystem;
    this.resolution = CHUNK_RESOLUTION;
    this.size = CHUNK_SIZE;
    this.position = new THREE.Vector3(
      chunkX * CHUNK_SIZE,
      0,
      chunkZ * CHUNK_SIZE,
    );

    this.heightData = new Float32Array(this.resolution * this.resolution);
    this.geometry = this.generateGeometry();
    this.mesh = this.createMesh();
  }

  private generateGeometry(): THREE.BufferGeometry {
    const vertexCount = this.resolution * this.resolution;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const slopeData = new Float32Array(vertexCount);
    const biomeBlendData = new Float32Array(vertexCount);

    for (let z = 0; z < this.resolution; z++) {
      for (let x = 0; x < this.resolution; x++) {
        const idx = z * this.resolution + x;
        const worldX =
          this.position.x + (x / (this.resolution - 1)) * this.size;
        const worldZ =
          this.position.z + (z / (this.resolution - 1)) * this.size;

        const height = this.biomeSystem.getHeightAt(worldX, worldZ);
        this.heightData[idx] = height;

        positions[idx * 3] = worldX;
        positions[idx * 3 + 1] = height;
        positions[idx * 3 + 2] = worldZ;

        const slope = this.biomeSystem.getSlopeAt(worldX, worldZ);
        slopeData[idx] = Math.min(slope, 2.0) / 2.0;

        const { biome, blendFactor } = this.biomeSystem.getBiomeAt(
          worldX,
          worldZ,
        );
        biomeBlendData[idx] = blendFactor;

        const color = this.getVertexColor(
          worldX,
          worldZ,
          height,
          slope,
          biome,
          biomeBlendData[idx],
        );
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;

        uvs[idx * 2] = x / (this.resolution - 1);
        uvs[idx * 2 + 1] = z / (this.resolution - 1);
      }
    }

    this.calculateNormals(positions, normals);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute("a_slope", new THREE.BufferAttribute(slopeData, 1));
    geometry.setAttribute(
      "a_biomeBlend",
      new THREE.BufferAttribute(biomeBlendData, 1),
    );

    const indices: number[] = [];
    for (let z = 0; z < this.resolution - 1; z++) {
      for (let x = 0; x < this.resolution - 1; x++) {
        const topLeft = z * this.resolution + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * this.resolution + x;
        const bottomRight = bottomLeft + 1;

        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }
    geometry.setIndex(indices);

    return geometry;
  }

  private calculateNormals(
    positions: Float32Array,
    normals: Float32Array,
  ): void {
    const tempNormals = new Float32Array(positions.length);

    for (let z = 0; z < this.resolution - 1; z++) {
      for (let x = 0; x < this.resolution - 1; x++) {
        const idx = z * this.resolution + x;

        const p0 = new THREE.Vector3(
          positions[idx * 3],
          positions[idx * 3 + 1],
          positions[idx * 3 + 2],
        );
        const p1 = new THREE.Vector3(
          positions[(idx + 1) * 3],
          positions[(idx + 1) * 3 + 1],
          positions[(idx + 1) * 3 + 2],
        );
        const p2 = new THREE.Vector3(
          positions[(idx + this.resolution) * 3],
          positions[(idx + this.resolution) * 3 + 1],
          positions[(idx + this.resolution) * 3 + 2],
        );
        const p3 = new THREE.Vector3(
          positions[(idx + this.resolution + 1) * 3],
          positions[(idx + this.resolution + 1) * 3 + 1],
          positions[(idx + this.resolution + 1) * 3 + 2],
        );

        const v1 = new THREE.Vector3().subVectors(p2, p0);
        const v2 = new THREE.Vector3().subVectors(p1, p0);
        const n1 = new THREE.Vector3().crossVectors(v1, v2);

        tempNormals[idx * 3] += n1.x;
        tempNormals[idx * 3 + 1] += n1.y;
        tempNormals[idx * 3 + 2] += n1.z;

        const v3 = new THREE.Vector3().subVectors(p1, p2);
        const v4 = new THREE.Vector3().subVectors(p3, p2);
        const n2 = new THREE.Vector3().crossVectors(v3, v4);

        tempNormals[(idx + this.resolution) * 3] += n2.x;
        tempNormals[(idx + this.resolution) * 3 + 1] += n2.y;
        tempNormals[(idx + this.resolution) * 3 + 2] += n2.z;
      }
    }

    for (let i = 0; i < normals.length / 3; i++) {
      const x = tempNormals[i * 3];
      const y = tempNormals[i * 3 + 1];
      const z = tempNormals[i * 3 + 2];
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len > 0) {
        normals[i * 3] = x / len;
        normals[i * 3 + 1] = y / len;
        normals[i * 3 + 2] = z / len;
      } else {
        normals[i * 3] = 0;
        normals[i * 3 + 1] = 1;
        normals[i * 3 + 2] = 0;
      }
    }
  }

  private getVertexColor(
    x: number,
    z: number,
    height: number,
    slope: number,
    biome: BiomeType,
    blendFactor: number,
  ): THREE.Color {
    const noise = (Math.sin(x * 0.1) * Math.cos(z * 0.1) + 1) * 0.5;

    let baseColor: THREE.Color;
    let secondaryColor: THREE.Color;

    switch (biome) {
      case "forest":
        baseColor = new THREE.Color(0x4a7c4e);
        secondaryColor = new THREE.Color(0x3d6b40);
        if (height < 20) {
          baseColor.lerp(new THREE.Color(0x3d5c3d), 0.5);
        }
        break;
      case "desert":
        baseColor = new THREE.Color(0xd4a574);
        secondaryColor = new THREE.Color(0xc49464);
        if (slope > 0.3) {
          baseColor.lerp(new THREE.Color(0xa67c52), 0.5);
        }
        break;
      case "snow":
        baseColor = new THREE.Color(0xe8e8e8);
        secondaryColor = new THREE.Color(0xb8c4c8);
        if (height < 100) {
          baseColor.lerp(new THREE.Color(0x7a8b7a), 0.5);
        }
        break;
    }

    if (blendFactor > 0) {
      const prevBiome = biome === "desert" ? "forest" : "forest";
      let prevBase: THREE.Color;
      let prevSecondary: THREE.Color;

      if (biome === "desert") {
        prevBase = new THREE.Color(0x4a7c4e);
        prevSecondary = new THREE.Color(0x3d6b40);
      } else {
        prevBase = new THREE.Color(0x4a7c4e);
        prevSecondary = new THREE.Color(0x3d6b40);
      }

      baseColor.lerp(prevBase, blendFactor * 0.5);
      secondaryColor.lerp(prevSecondary, blendFactor * 0.5);
    }

    const color = baseColor.clone().lerp(secondaryColor, noise * 0.3);

    if (slope > 0.5) {
      const rockColor = new THREE.Color(0x808080);
      const slopeInfluence = smoothstep(0.5, 1.0, slope);
      color.lerp(rockColor, slopeInfluence * 0.7);
    }

    return color;
  }

  private createMesh(): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false,
      side: THREE.FrontSide,
    });

    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = `terrain_${this.chunkX}_${this.chunkZ}`;
    mesh.position.set(this.position.x, 0, this.position.z);

    return mesh;
  }

  getHeightAtLocal(x: number, z: number): number {
    const gridX = (x / this.size) * (this.resolution - 1);
    const gridZ = (z / this.size) * (this.resolution - 1);

    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(x0 + 1, this.resolution - 1);
    const z1 = Math.min(z0 + 1, this.resolution - 1);

    const fx = gridX - x0;
    const fz = gridZ - z0;

    const h00 = this.heightData[z0 * this.resolution + x0];
    const h10 = this.heightData[z0 * this.resolution + x1];
    const h01 = this.heightData[z1 * this.resolution + x0];
    const h11 = this.heightData[z1 * this.resolution + x1];

    const h0 = h00 + (h10 - h00) * fx;
    const h1 = h01 + (h11 - h01) * fx;

    return h0 + (h1 - h0) * fz;
  }

  getHeightAtWorld(worldX: number, worldZ: number): number {
    const localX = worldX - this.position.x;
    const localZ = worldZ - this.position.z;
    return this.getHeightAtLocal(localX, localZ);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}
