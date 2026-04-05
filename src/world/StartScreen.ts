export class StartScreen {
  private overlay: HTMLDivElement;
  private resolved = false;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.id = "start-screen";
    this.overlay.innerHTML = `
      <div style="
        position: fixed; inset: 0; z-index: 10000;
        background: #0a0a0f;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        cursor: pointer;
        font-family: system-ui, -apple-system, sans-serif;
        color: #e0e0e0;
        user-select: none;
      ">
        <h1 style="
          font-size: 2.4rem; font-weight: 300;
          letter-spacing: 0.3em; margin-bottom: 2rem;
        ">OPEN WORLD</h1>
        <div style="
          padding: 0.8rem 2.5rem;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 4px;
          font-size: 1rem;
          letter-spacing: 0.15em;
          transition: all 0.3s ease;
        ">CLICK TO PLAY</div>
        <p style="
          margin-top: 1.5rem; font-size: 0.75rem;
          color: #555; letter-spacing: 0.1em;
        ">WASD Move · Mouse Look · Shift Run · Space Jump</p>
      </div>
    `;
  }

  waitForClick(): Promise<void> {
    return new Promise((resolve) => {
      document.body.appendChild(this.overlay);

      const handleInteraction = () => {
        if (this.resolved) return;
        this.resolved = true;

        const inner = this.overlay.firstElementChild as HTMLElement;
        if (inner) {
          inner.style.transition = "opacity 0.5s ease";
          inner.style.opacity = "0";
        }

        setTimeout(() => {
          this.overlay.remove();
          resolve();
        }, 500);

        this.overlay.removeEventListener("click", handleInteraction);
        this.overlay.removeEventListener("touchstart", handleInteraction);
      };

      this.overlay.addEventListener("click", handleInteraction);
      this.overlay.addEventListener("touchstart", handleInteraction);
    });
  }
}
