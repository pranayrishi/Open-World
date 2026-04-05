import * as THREE from "three";
import {
  getTerrainHeight,
  getBiomeNoise,
  seededNoise2D,
  WATER_LEVEL,
} from "./Noise.js";

export interface TerrainChunkResult {
  mesh: THREE.Mesh;
  heightData: Float32Array;
  resolution: number;
  chunkX: number;
  chunkZ: number;
}

const CHUNK_SIZE = 128;
const RESOLUTION = 64;

export function buildTerrainChunk(
  chunkX: number,
  chunkZ: number,
): TerrainChunkResult {
  const resolution = RESOLUTION;
  const vertCount = resolution * resolution;

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const heightData = new Float32Array(vertCount);

  const worldOffsetX = chunkX * CHUNK_SIZE;
  const worldOffsetZ = chunkZ * CHUNK_SIZE;

  for (let iz = 0; iz < resolution; iz++) {
    for (let ix = 0; ix < resolution; ix++) {
      const idx = iz * resolution + ix;

      const localX = (ix / (resolution - 1)) * CHUNK_SIZE;
      const localZ = (iz / (resolution - 1)) * CHUNK_SIZE;

      const worldX = worldOffsetX + localX;
      const worldZ = worldOffsetZ + localZ;

      const height = getTerrainHeight(worldX, worldZ);
      heightData[idx] = height;

      positions[idx * 3] = localX;
      positions[idx * 3 + 1] = height;
      positions[idx * 3 + 2] = localZ;

      const color = getVertexColor(height, worldX, worldZ, ix, iz, resolution);
      colors[idx * 3] = color.r;
      colors[idx * 3 + 1] = color.g;
      colors[idx * 3 + 2] = color.b;
    }
  }

  for (let iz = 0; iz < resolution; iz++) {
    for (let ix = 0; ix < resolution; ix++) {
      const idx = iz * resolution + ix;

      const left =
        ix > 0 ? heightData[iz * resolution + (ix - 1)] : heightData[idx];
      const right =
        ix < resolution - 1
          ? heightData[iz * resolution + (ix + 1)]
          : heightData[idx];
      const up =
        iz > 0 ? heightData[(iz - 1) * resolution + ix] : heightData[idx];
      const down =
        iz < resolution - 1
          ? heightData[(iz + 1) * resolution + ix]
          : heightData[idx];

      const spacing = CHUNK_SIZE / (resolution - 1);

      const nx = (left - right) / (2 * spacing);
      const nz = (up - down) / (2 * spacing);
      const ny = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normals[idx * 3] = nx / len;
      normals[idx * 3 + 1] = ny / len;
      normals[idx * 3 + 2] = nz / len;
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < resolution - 1; iz++) {
    for (let ix = 0; ix < resolution - 1; ix++) {
      const topLeft = iz * resolution + ix;
      const topRight = topLeft + 1;
      const bottomLeft = (iz + 1) * resolution + ix;
      const bottomRight = bottomLeft + 1;

      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(worldOffsetX, 0, worldOffsetZ);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = `terrain_${chunkX}_${chunkZ}`;

  return { mesh, heightData, resolution, chunkX, chunkZ };
}

function getVertexColor(
  height: number,
  worldX: number,
  worldZ: number,
  ix: number,
  iz: number,
  resolution: number,
): THREE.Color {
  const biomeNoise = getBiomeNoise(worldX, worldZ);

  let left = height;
  let right = height;
  let up = height;
  let down = height;

  if (ix > 0)
    left = getTerrainHeight(worldX - CHUNK_SIZE / (resolution - 1), worldZ);
  if (ix < resolution - 1)
    right = getTerrainHeight(worldX + CHUNK_SIZE / (resolution - 1), worldZ);
  if (iz > 0)
    up = getTerrainHeight(worldX, worldZ - CHUNK_SIZE / (resolution - 1));
  if (iz < resolution - 1)
    down = getTerrainHeight(worldX, worldZ + CHUNK_SIZE / (resolution - 1));

  const slope =
    (Math.abs(right - left) + Math.abs(down - up)) /
    (2 * (CHUNK_SIZE / (resolution - 1)));

  let r: number, g: number, b: number;

  if (height < WATER_LEVEL - 0.5) {
    r = 0.55;
    g = 0.48;
    b = 0.35;
  } else if (height < WATER_LEVEL + 1.0) {
    r = 0.72;
    g = 0.65;
    b = 0.48;
  } else if (biomeNoise < -0.25) {
    if (slope > 0.4) {
      r = 0.6;
      g = 0.45;
      b = 0.3;
    } else {
      r = 0.82;
      g = 0.72;
      b = 0.52;
    }
  } else if (biomeNoise > 0.3 && height > 45) {
    if (height > 65) {
      r = 0.92;
      g = 0.93;
      b = 0.95;
    } else if (slope > 0.4) {
      r = 0.5;
      g = 0.48;
      b = 0.45;
    } else {
      const t = (height - 45) / 20;
      r = 0.35 + t * 0.15;
      g = 0.5 - t * 0.1;
      b = 0.25 + t * 0.15;
    }
  } else {
    if (slope > 0.5) {
      r = 0.42;
      g = 0.4;
      b = 0.35;
    } else {
      const grassVar = seededNoise2D(worldX * 0.05, worldZ * 0.05, 900) * 0.08;
      r = 0.25 + grassVar;
      g = 0.52 + grassVar;
      b = 0.18;

      const flowerNoise = seededNoise2D(worldX * 0.1, worldZ * 0.1, 950);
      if (flowerNoise > 0.6 && slope < 0.2) {
        r += 0.15;
        b += 0.05;
      }
    }
  }

  const variation = seededNoise2D(worldX * 0.2, worldZ * 0.2, 999) * 0.03;
  r = Math.max(0, Math.min(1, r + variation));
  g = Math.max(0, Math.min(1, g + variation));
  b = Math.max(0, Math.min(1, b + variation));

  return new THREE.Color(r, g, b);
}

export { CHUNK_SIZE, RESOLUTION as CHUNK_RESOLUTION };
