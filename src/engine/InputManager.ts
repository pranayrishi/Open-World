export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private justPressed: Set<string> = new Set();
  private justReleased: Set<string> = new Set();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private readonly MAX_MOUSE_DELTA = 50;
  private readonly MOUSE_SENSITIVITY = 0.002;
  private pointerLocked = false;
  private canvas: HTMLCanvasElement;
  private firstLock = true;
  private resumeHint: HTMLDivElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  private setupListeners(): void {
    document.addEventListener("keydown", (e) => {
      if (!this.keys.get(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.set(e.code, true);

      if (e.key === "Escape" && this.pointerLocked) {
        this.showResumeHint();
      }
    });

    document.addEventListener("keyup", (e) => {
      this.keys.set(e.code, false);
      this.justReleased.add(e.code);
    });

    document.addEventListener("mousemove", (e) => {
      if (this.pointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (this.pointerLocked) {
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.hideResumeHint();
      }
    });

    document.addEventListener("pointerlockerror", () => {
      this.pointerLocked = false;
    });

    this.canvas.addEventListener("click", () => {
      if (!this.pointerLocked) {
        try {
          this.canvas.requestPointerLock();
        } catch (e) {
          console.warn("Pointer lock request failed:", e);
        }
      }
    });

    this.canvas.addEventListener("mousedown", () => {
      if (!this.pointerLocked) {
        try {
          this.canvas.requestPointerLock();
        } catch (e) {
          console.warn("Pointer lock request failed:", e);
        }
      }
    });
  }

  private showResumeHint(): void {
    if (this.resumeHint) return;
    this.resumeHint = document.createElement("div");
    this.resumeHint.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.7); color: white; padding: 1rem 2rem;
      border-radius: 8px; font-family: system-ui; font-size: 0.9rem;
      z-index: 5000;
    `;
    this.resumeHint.textContent = "Click to resume";
    document.body.appendChild(this.resumeHint);

    const check = () => {
      if (this.pointerLocked) {
        this.hideResumeHint();
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  }

  private hideResumeHint(): void {
    if (this.resumeHint) {
      this.resumeHint.remove();
      this.resumeHint = null;
    }
  }

  isKeyDown(code: string): boolean {
    return this.keys.get(code) ?? false;
  }

  isJustPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  isJustReleased(code: string): boolean {
    return this.justReleased.has(code);
  }

  consumeMouseDelta(): { x: number; y: number } {
    const x = Math.max(
      -this.MAX_MOUSE_DELTA,
      Math.min(this.MAX_MOUSE_DELTA, this.mouseDeltaX),
    );
    const y = Math.max(
      -this.MAX_MOUSE_DELTA,
      Math.min(this.MAX_MOUSE_DELTA, this.mouseDeltaY),
    );

    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    return { x, y };
  }

  getMouseDeltaScaled(): { x: number; y: number } {
    const delta = this.consumeMouseDelta();
    return {
      x: delta.x * this.MOUSE_SENSITIVITY,
      y: delta.y * this.MOUSE_SENSITIVITY,
    };
  }

  clearFrameState(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  requestPointerLock(): void {}

  exitPointerLock(): void {
    document.exitPointerLock();
  }
}
