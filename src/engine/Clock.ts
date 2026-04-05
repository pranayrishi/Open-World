export class Clock {
  private lastTime = 0;
  private deltaTime = 0;
  private elapsed = 0;

  getDelta(): number {
    return this.deltaTime;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  tick(): number {
    const now = performance.now() / 1000;
    if (this.lastTime === 0) {
      this.lastTime = now;
      this.deltaTime = 0;
    } else {
      this.deltaTime = Math.min(now - this.lastTime, 0.1);
      this.lastTime = now;
      this.elapsed += this.deltaTime;
    }
    return this.deltaTime;
  }

  reset(): void {
    this.lastTime = 0;
    this.deltaTime = 0;
    this.elapsed = 0;
  }
}
