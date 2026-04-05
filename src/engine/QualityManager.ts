export interface QualitySettings {
  grassCount: number;
  grassDistance: number;
  treeDistance: number;
  shadowMapSize: number;
  pixelRatio: number;
}

export const QUALITY_PRESETS: Record<string, QualitySettings> = {
  high: {
    grassCount: 15000,
    grassDistance: 40,
    treeDistance: 150,
    shadowMapSize: 1024,
    pixelRatio: 1,
  },
  medium: {
    grassCount: 8000,
    grassDistance: 30,
    treeDistance: 100,
    shadowMapSize: 512,
    pixelRatio: 1,
  },
  low: {
    grassCount: 4000,
    grassDistance: 20,
    treeDistance: 60,
    shadowMapSize: 512,
    pixelRatio: 1,
  },
};

export class QualityManager {
  private currentPreset = "high";
  private fpsHistory: number[] = [];
  private readonly historyLength = 60;
  private cooldown = 0;
  private readonly COOLDOWN_TIME = 3;

  update(fps: number, deltaTime: number): string {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.historyLength) {
      this.fpsHistory.shift();
    }

    this.cooldown -= deltaTime;
    if (this.cooldown > 0) return this.currentPreset;

    const avgFps =
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    if (avgFps < 25 && this.currentPreset !== "low") {
      this.downgrade();
      this.cooldown = this.COOLDOWN_TIME;
    } else if (
      avgFps > 50 &&
      this.currentPreset !== "high" &&
      this.cooldown <= -10
    ) {
      this.upgrade();
      this.cooldown = this.COOLDOWN_TIME;
    }

    return this.currentPreset;
  }

  private downgrade(): void {
    if (this.currentPreset === "high") this.currentPreset = "medium";
    else if (this.currentPreset === "medium") this.currentPreset = "low";
    console.log(`Quality: ${this.currentPreset}`);
  }

  private upgrade(): void {
    if (this.currentPreset === "low") this.currentPreset = "medium";
    else if (this.currentPreset === "medium") this.currentPreset = "high";
    console.log(`Quality: ${this.currentPreset}`);
  }

  getSettings(): QualitySettings {
    return QUALITY_PRESETS[this.currentPreset];
  }

  getPreset(): string {
    return this.currentPreset;
  }
}
