import { Noise } from "../utils/Noise.js";
import { smoothstep } from "../utils/MathUtils.js";

export type BiomeType = "forest" | "desert" | "snow";

export interface BiomeData {
  type: BiomeType;
  baseHeight: number;
  heightVariation: number;
  primaryColor: string;
  secondaryColor: string;
  vegetationDensity: number;
}

export const BIOME_DATA: Record<BiomeType, BiomeData> = {
  forest: {
    type: "forest",
    baseHeight: 30,
    heightVariation: 40,
    primaryColor: "#4a7c4e",
    secondaryColor: "#3d6b40",
    vegetationDensity: 1.0,
  },
  desert: {
    type: "desert",
    baseHeight: 10,
    heightVariation: 30,
    primaryColor: "#d4a574",
    secondaryColor: "#c49464",
    vegetationDensity: 0.1,
  },
  snow: {
    type: "snow",
    baseHeight: 100,
    heightVariation: 80,
    primaryColor: "#e8e8e8",
    secondaryColor: "#b8c4c8",
    vegetationDensity: 0.3,
  },
};

export class BiomeSystem {
  private biomeNoise: Noise;
  private heightNoise: Noise;
  private detailNoise: Noise;
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
    this.biomeNoise = new Noise(seed);
    this.heightNoise = new Noise(seed + 1);
    this.detailNoise = new Noise(seed + 2);
  }

  getBiomeAt(x: number, z: number): { biome: BiomeType; blendFactor: number } {
    const biomeValue = this.biomeNoise.fbm(x * 0.0005, z * 0.0005, 3, 2.0, 0.5);

    if (biomeValue < -0.2) {
      return { biome: "desert", blendFactor: 0 };
    } else if (biomeValue > 0.3) {
      return { biome: "snow", blendFactor: 0 };
    } else if (biomeValue < -0.05) {
      const blendFactor = smoothstep(-0.2, -0.05, biomeValue);
      return { biome: "desert", blendFactor: blendFactor };
    } else if (biomeValue > 0.15) {
      const blendFactor = smoothstep(0.15, 0.3, biomeValue);
      return { biome: "snow", blendFactor: blendFactor };
    }
    return { biome: "forest", blendFactor: 0 };
  }

  getHeightAt(x: number, z: number): number {
    const { biome, blendFactor } = this.getBiomeAt(x, z);

    const forestHeight = this.getForestHeight(x, z);
    const desertHeight = this.getDesertHeight(x, z);
    const snowHeight = this.getSnowHeight(x, z);

    if (blendFactor === 0) {
      switch (biome) {
        case "forest":
          return forestHeight;
        case "desert":
          return desertHeight;
        case "snow":
          return snowHeight;
      }
    }

    let height: number;
    if (biome === "desert") {
      const t = smoothstep(
        -0.2,
        -0.05,
        this.biomeNoise.fbm(x * 0.0005, z * 0.0005, 3, 2.0, 0.5),
      );
      height = this.lerpBiome(forestHeight, desertHeight, t);
    } else {
      const t = smoothstep(
        0.15,
        0.3,
        this.biomeNoise.fbm(x * 0.0005, z * 0.0005, 3, 2.0, 0.5),
      );
      height = this.lerpBiome(forestHeight, snowHeight, t);
    }

    return height;
  }

  private getForestHeight(x: number, z: number): number {
    const base = this.heightNoise.warpedNoise(
      x * 0.003,
      z * 0.003,
      0.5,
      this.seed,
    );
    const hills = this.heightNoise.fbm(x * 0.008, z * 0.008, 3, 2.0, 0.5, 1.0);
    const detail = this.detailNoise.fbm(x * 0.02, z * 0.02, 2, 2.0, 0.5, 2.0);

    return base * 50 + hills * 20 + detail * 5;
  }

  private getDesertHeight(x: number, z: number): number {
    const base = this.heightNoise.fbm(x * 0.002, z * 0.002, 4, 2.0, 0.6);

    const canyonNoise = this.heightNoise.ridgeNoise(
      x * 0.005,
      z * 0.005,
      4,
      2.0,
      0.6,
    );
    const canyons = (1 - canyonNoise) * 30;

    const dunes =
      this.heightNoise.fbm(x * 0.01, z * 0.01, 3, 2.0, 0.5, 1.5) * 8;

    return base * 25 - canyons + dunes;
  }

  private getSnowHeight(x: number, z: number): number {
    const ridges = this.heightNoise.ridgeNoise(
      x * 0.002,
      z * 0.002,
      6,
      2.0,
      0.5,
    );
    const base = this.heightNoise.fbm(x * 0.004, z * 0.004, 4, 2.0, 0.5);

    const peaks = Math.pow(ridges, 0.8) * 150;
    const baseHeight = base * 30 + 60;

    return peaks + baseHeight;
  }

  private lerpBiome(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  getSlopeAt(x: number, z: number): number {
    const delta = 1.0;
    const heightCenter = this.getHeightAt(x, z);
    const heightRight = this.getHeightAt(x + delta, z);
    const heightForward = this.getHeightAt(x, z + delta);

    const dx = (heightRight - heightCenter) / delta;
    const dz = (heightForward - heightCenter) / delta;

    return Math.sqrt(dx * dx + dz * dz);
  }

  getBiomeColors(
    biome: BiomeType,
    blendFactor: number,
  ): { primary: string; secondary: string } {
    if (blendFactor === 0) {
      const data = BIOME_DATA[biome];
      return { primary: data.primaryColor, secondary: data.secondaryColor };
    }

    const colors1 =
      BIOME_DATA[
        biome === "desert" ? "forest" : biome === "snow" ? "forest" : "desert"
      ];
    const colors2 = BIOME_DATA[biome];

    return {
      primary: this.lerpColor(
        colors1.primaryColor,
        colors2.primaryColor,
        blendFactor,
      ),
      secondary: this.lerpColor(
        colors1.secondaryColor,
        colors2.secondaryColor,
        blendFactor,
      ),
    };
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r},${g},${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }
}
