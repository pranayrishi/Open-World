export type GameState = "loading" | "ready" | "playing" | "paused";

export class GameStateManager {
  private state: GameState = "loading";
  private loadingProgress = 0;
  private onStateChange: ((state: GameState) => void) | null = null;

  getState(): GameState {
    return this.state;
  }

  setStateChangeCallback(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  setState(state: GameState): void {
    if (this.state !== state) {
      this.state = state;
      if (this.onStateChange) {
        this.onStateChange(state);
      }
    }
  }

  getLoadingProgress(): number {
    return this.loadingProgress;
  }

  setLoadingProgress(progress: number): void {
    this.loadingProgress = Math.max(0, Math.min(1, progress));
    this.updateLoadingUI();
  }

  isPlaying(): boolean {
    return this.state === "playing";
  }

  isLoading(): boolean {
    return this.state === "loading";
  }

  private loadingOverlay: HTMLDivElement | null = null;

  showLoadingScreen(): void {
    if (this.loadingOverlay) return;

    this.loadingOverlay = document.createElement("div");
    this.loadingOverlay.id = "loading-screen";
    this.loadingOverlay.innerHTML = `
      <div style="
        position: fixed; inset: 0; z-index: 9999;
        background: #0a0a0f;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: system-ui, sans-serif; color: #e0e0e0;
      ">
        <h1 style="font-size: 2rem; margin-bottom: 1rem; font-weight: 300; letter-spacing: 0.2em;">
          LOADING WORLD
        </h1>
        <div style="width: 300px; height: 4px; background: #1a1a2e; border-radius: 2px; overflow: hidden;">
          <div id="load-bar" style="width: 0%; height: 100%; background: #4a9eff; transition: width 0.3s ease; border-radius: 2px;"></div>
        </div>
        <p id="load-text" style="margin-top: 0.8rem; font-size: 0.85rem; color: #888;">
          Generating terrain...
        </p>
      </div>
    `;
    document.body.appendChild(this.loadingOverlay);
  }

  private updateLoadingUI(): void {
    const bar = document.getElementById("load-bar");
    const text = document.getElementById("load-text");
    if (bar) bar.style.width = `${Math.round(this.loadingProgress * 100)}%`;
    if (text) {
      if (this.loadingProgress < 0.3)
        text.textContent = "Generating terrain...";
      else if (this.loadingProgress < 0.6)
        text.textContent = "Building landscape...";
      else if (this.loadingProgress < 0.9)
        text.textContent = "Placing vegetation...";
      else text.textContent = "Almost ready...";
    }
  }

  hideLoadingScreen(): void {
    if (this.loadingOverlay) {
      const inner = this.loadingOverlay.firstElementChild as HTMLElement;
      if (inner) {
        inner.style.transition = "opacity 0.8s ease";
        inner.style.opacity = "0";
      }
      setTimeout(() => {
        this.loadingOverlay?.remove();
        this.loadingOverlay = null;
      }, 800);
    }
  }
}
