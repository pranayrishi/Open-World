const FNV_PRIME = 0x01000193;
const FNV_MASK = 0xffffffff;

export class Noise {
  private permutation: Uint8Array;
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): Uint8Array {
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;

    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = ((s ^ ((s >>> 15) | (s << 17))) * FNV_PRIME) >>> 0;
      const j = s % (i + 1);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return perm;
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  simplex2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.permutation[ii + this.permutation[jj]] % 12;
    const gi1 = this.permutation[ii + i1 + this.permutation[jj + j1]] % 12;
    const gi2 = this.permutation[ii + 1 + this.permutation[jj + 1]] % 12;

    let n0 = 0,
      n1 = 0,
      n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.grad(gi0, x0, y0, 0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.grad(gi1, x1, y1, 0);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.grad(gi2, x2, y2, 0);
    }

    return 70 * (n0 + n1 + n2);
  }

  simplex3D(x: number, y: number, z: number): number {
    const F3 = 1 / 3;
    const G3 = 1 / 6;

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);

    let i1: number, j1: number, k1: number;
    let i2: number, j2: number, k2: number;

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const gi0 =
      this.permutation[ii + this.permutation[jj + this.permutation[kk]]] % 12;
    const gi1 =
      this.permutation[
        ii + i1 + this.permutation[jj + j1 + this.permutation[kk + k1]]
      ] % 12;
    const gi2 =
      this.permutation[
        ii + i2 + this.permutation[jj + j2 + this.permutation[kk + k2]]
      ] % 12;
    const gi3 =
      this.permutation[
        ii + 1 + this.permutation[jj + 1 + this.permutation[kk + 1]]
      ] % 12;

    let n0 = 0,
      n1 = 0,
      n2 = 0,
      n3 = 0;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.grad(gi0, x0, y0, z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.grad(gi1, x1, y1, z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.grad(gi2, x2, y2, z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      t3 *= t3;
      n3 = t3 * t3 * this.grad(gi3, x3, y3, z3);
    }

    return 32 * (n0 + n1 + n2 + n3);
  }

  fbm(
    x: number,
    y: number,
    octaves: number = 8,
    lacunarity: number = 2.0,
    gain: number = 0.5,
    scale: number = 1.0,
  ): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.simplex2D(x * frequency, y * frequency);
      maxValue += amplitude;
      frequency *= lacunarity;
      amplitude *= gain;
    }

    return value / maxValue;
  }

  fbm3D(
    x: number,
    y: number,
    z: number,
    octaves: number = 8,
    lacunarity: number = 2.0,
    gain: number = 0.5,
    scale: number = 1.0,
  ): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value +=
        amplitude * this.simplex3D(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude;
      frequency *= lacunarity;
      amplitude *= gain;
    }

    return value / maxValue;
  }

  ridgeNoise(
    x: number,
    y: number,
    octaves: number = 6,
    lacunarity: number = 2.0,
    gain: number = 0.5,
    scale: number = 1.0,
  ): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = scale;
    let weight = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      let n = 1 - Math.abs(this.simplex2D(x * frequency, y * frequency));
      n = n * n;
      value += n * amplitude * weight;
      maxValue += amplitude * weight;
      weight = Math.min(Math.max(n * weight, 0), 1) * 2;
      frequency *= lacunarity;
      amplitude *= gain;
    }

    return value / maxValue;
  }

  warpedNoise(
    x: number,
    y: number,
    warpStrength: number = 1.0,
    seed: number = 1,
  ): number {
    const tempNoise = new Noise(seed);
    const wx = tempNoise.fbm(x + 100, y + 300, 4, 2.0, 0.5);
    const wz = tempNoise.fbm(x + 700, y + 500, 4, 2.0, 0.5);
    return this.fbm(x + wx * warpStrength, y + wz * warpStrength, 8, 2.0, 0.5);
  }

  hash2D(x: number, y: number): number {
    const a = this.fnv32a(`${x},${y},${this.seed}`);
    return (a >>> 0) / FNV_MASK;
  }

  hash3D(x: number, y: number, z: number): number {
    const a = this.fnv32a(`${x},${y},${z},${this.seed}`);
    return (a >>> 0) / FNV_MASK;
  }

  private fnv32a(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, FNV_PRIME);
    }
    return h;
  }
}
