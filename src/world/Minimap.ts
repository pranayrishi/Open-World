import * as THREE from "three";

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLDivElement;
  private readonly SIZE = 150;
  private readonly WORLD_RANGE = 300;
  private updateTimer = 0;
  private heightFn: (x: number, z: number) => number;

  constructor(heightFn: (x: number, z: number) => number) {
    this.heightFn = heightFn;

    this.container = document.createElement("div");
    this.container.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: ${this.SIZE}px;
      height: ${this.SIZE}px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      pointer-events: none;
      background: #1a2a3a;
    `;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.SIZE;
    this.canvas.height = this.SIZE;
    this.ctx = this.canvas.getContext("2d")!;
    this.container.appendChild(this.canvas);

    const border = document.createElement("div");
    border.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
      pointer-events: none;
    `;
    this.container.appendChild(border);

    const northLabel = document.createElement("div");
    northLabel.textContent = "N";
    northLabel.style.cssText = `
      position: absolute;
      top: 4px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255, 255, 255, 0.6);
      font: bold 10px system-ui;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      pointer-events: none;
    `;
    this.container.appendChild(northLabel);

    document.body.appendChild(this.container);
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    npcPositions: THREE.Vector3[],
  ): void {
    this.updateTimer += dt;
    if (this.updateTimer < 0.25) return;
    this.updateTimer = 0;

    const ctx = this.ctx;
    const size = this.SIZE;
    const range = this.WORLD_RANGE;
    const halfRange = range / 2;
    const px = playerPos.x;
    const pz = playerPos.z;

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(0, 0, size, size);

    const step = 6;
    for (let sy = 0; sy < size; sy += step) {
      for (let sx = 0; sx < size; sx += step) {
        const worldX = px + (sx / size - 0.5) * range;
        const worldZ = pz + (sy / size - 0.5) * range;

        const height = this.heightFn(worldX, worldZ);

        let r: number, g: number, b: number;
        if (height < 1) {
          r = 40;
          g = 80;
          b = 140;
        } else if (height < 30) {
          const t = height / 30;
          r = 30 + t * 20;
          g = 55 + t * 30;
          b = 25 + t * 10;
        } else if (height < 70) {
          const t = (height - 30) / 40;
          r = 70 + t * 40;
          g = 65 + t * 30;
          b = 55 + t * 30;
        } else {
          const t = Math.min(1, (height - 70) / 50);
          r = 180 + t * 20;
          g = 185 + t * 15;
          b = 195 + t * 10;
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(sx, sy, step, step);
      }
    }

    ctx.fillStyle = "#FFD700";
    for (const npcPos of npcPositions) {
      const dx = npcPos.x - px;
      const dz = npcPos.z - pz;
      if (Math.abs(dx) < halfRange && Math.abs(dz) < halfRange) {
        const sx = (dx / range + 0.5) * size;
        const sy = (dz / range + 0.5) * size;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const centerX = size / 2;
    const centerY = size / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-playerYaw);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-6, 6);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#4a9eff";
    ctx.fill();
  }

  dispose(): void {
    this.container.remove();
  }
}
