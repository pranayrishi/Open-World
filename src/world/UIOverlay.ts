import * as THREE from "three";

export interface MinimapData {
  playerX: number;
  playerZ: number;
  playerRotation: number;
  npcs: { x: number; z: number; type: string }[];
  water: { x: number; z: number; size: number }[];
}

export class UIOverlay {
  private container: HTMLElement;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D;
  private compassEl: HTMLElement | null = null;
  private controlsHint: HTMLElement | null = null;
  private statsEl: HTMLElement | null = null;
  private lastMinimapUpdate = 0;
  private readonly MINIMAP_UPDATE_INTERVAL = 100;

  constructor() {
    this.container = document.createElement("div");
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
    document.body.appendChild(this.container);

    this.createMinimap();
    this.createCompass();
    this.createStats();
  }

  private createMinimap(): void {
    this.minimapCanvas = document.createElement("canvas");
    this.minimapCanvas.width = 150;
    this.minimapCanvas.height = 150;
    this.minimapCanvas.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 150px;
      height: 150px;
      border-radius: 8px;
      border: 2px solid rgba(255,255,255,0.3);
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
    `;
    this.container.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext("2d")!;
  }

  private createCompass(): void {
    this.compassEl = document.createElement("div");
    this.compassEl.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 5px 15px;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      border-radius: 15px;
      color: white;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: bold;
      border: 1px solid rgba(255,255,255,0.2);
    `;
    this.compassEl.textContent = "N";
    this.container.appendChild(this.compassEl);
  }

  private createStats(): void {
    this.statsEl = document.createElement("div");
    this.statsEl.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 8px 12px;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      border-radius: 4px;
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      border: 1px solid rgba(255,255,255,0.2);
    `;
    this.container.appendChild(this.statsEl);
  }

  update(
    playerRotation: number,
    stats: { fps: number; drawCalls: number; triangles: number },
  ): void {
    if (this.compassEl) {
      const degrees = ((playerRotation * 180) / Math.PI + 180) % 360;
      let direction = "N";
      if (degrees > 45 && degrees <= 135) direction = "E";
      else if (degrees > 135 && degrees <= 225) direction = "S";
      else if (degrees > 225 && degrees <= 315) direction = "W";
      this.compassEl.textContent = direction;
    }

    if (this.statsEl) {
      this.statsEl.innerHTML = `
        FPS: ${stats.fps}<br>
        Draws: ${stats.drawCalls}<br>
        Tris: ${stats.triangles}
      `;
    }
  }

  updateMinimap(data: MinimapData): void {
    const now = performance.now();
    if (now - this.lastMinimapUpdate < this.MINIMAP_UPDATE_INTERVAL) return;
    this.lastMinimapUpdate = now;

    const ctx = this.minimapCtx;
    const size = 150;
    const scale = 0.5;

    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-data.playerRotation + Math.PI);

    for (const water of data.water) {
      const wx = (water.x - data.playerX) * scale;
      const wz = (water.z - data.playerZ) * scale;
      ctx.fillStyle = "rgba(100,150,200,0.5)";
      ctx.beginPath();
      ctx.arc(wx, wz, water.size * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const npc of data.npcs) {
      const nx = (npc.x - data.playerX) * scale;
      const nz = (npc.z - data.playerZ) * scale;
      if (Math.abs(nx) < size / 2 && Math.abs(nz) < size / 2) {
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.arc(nx, nz, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    ctx.fillStyle = "#4a9eff";
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2 - 6, size / 2 + 10);
    ctx.lineTo(size / 2 + 6, size / 2 + 10);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2, size / 2 - 8);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();
  }

  showControlsHint(): void {
    if (this.controlsHint) {
      this.controlsHint.style.opacity = "1";
    }
  }

  hideControlsHint(): void {
    if (this.controlsHint) {
      this.controlsHint.style.opacity = "0";
    }
  }

  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
