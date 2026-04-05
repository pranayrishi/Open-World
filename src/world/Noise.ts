export const WATER_LEVEL = 3.0;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function seededNoise2D(x: number, z: number, seed: number): number {
  function hash(ix: number, iz: number): number {
    let h = seed + ix * 374761393 + iz * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return h;
  }

  function grad(hashVal: number, dx: number, dz: number): number {
    const h = hashVal & 7;
    const u = h < 4 ? dx : dz;
    const v = h < 4 ? dz : dx;
    return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -v : v);
  }

  function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  const u = fade(fx);
  const v = fade(fz);

  const n00 = grad(hash(ix, iz), fx, fz);
  const n10 = grad(hash(ix + 1, iz), fx - 1, fz);
  const n01 = grad(hash(ix, iz + 1), fx, fz - 1);
  const n11 = grad(hash(ix + 1, iz + 1), fx - 1, fz - 1);

  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);
  return nx0 + v * (nx1 - nx0);
}

export function getTerrainHeight(worldX: number, worldZ: number): number {
  let height = 0;

  height += seededNoise2D(worldX * 0.0008, worldZ * 0.0008, 100) * 35;
  height += seededNoise2D(worldX * 0.003, worldZ * 0.003, 200) * 15;
  height += seededNoise2D(worldX * 0.008, worldZ * 0.008, 300) * 6;
  height += seededNoise2D(worldX * 0.025, worldZ * 0.025, 400) * 1.5;

  const biomeNoise = seededNoise2D(worldX * 0.0005, worldZ * 0.0005, 500);

  if (biomeNoise > 0.3) {
    const ridgeNoise =
      1.0 - Math.abs(seededNoise2D(worldX * 0.004, worldZ * 0.004, 600));
    const ridge = ridgeNoise * ridgeNoise * 40;
    const mountainBlend = smoothstep(0.3, 0.5, biomeNoise);
    height += ridge * mountainBlend;
  } else if (biomeNoise < -0.25) {
    const flattenAmount = smoothstep(-0.25, -0.45, biomeNoise);
    height = lerp(height, 8, flattenAmount * 0.6);
    height +=
      seededNoise2D(worldX * 0.01, worldZ * 0.012, 700) * 3 * flattenAmount;
  }

  if (height < 8) {
    height = lerp(height, 5, smoothstep(8, 2, height) * 0.5);
  }

  const riverNoise = seededNoise2D(worldX * 0.001, worldZ * 0.002, 800);
  const riverPath =
    Math.sin(worldX * 0.005 + riverNoise * 3) * 0.5 +
    Math.sin(worldZ * 0.003 + riverNoise * 2) * 0.5;
  const riverWidth = 0.15;
  const distFromRiver = Math.abs(riverPath);

  if (distFromRiver < riverWidth) {
    const carveStrength = 1.0 - distFromRiver / riverWidth;
    const carveSmooth = carveStrength * carveStrength;
    height -= carveSmooth * 8;
    height = Math.max(height, -1);
  } else if (distFromRiver < riverWidth * 3) {
    const bankFactor = (distFromRiver - riverWidth) / (riverWidth * 2);
    height -= (1.0 - bankFactor) * 2;
  }

  return height;
}

export function getBiomeNoise(worldX: number, worldZ: number): number {
  return seededNoise2D(worldX * 0.0005, worldZ * 0.0005, 500);
}
