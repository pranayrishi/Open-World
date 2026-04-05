export class AudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;
  private windStarted = false;

  initialize(): void {
    if (this.initialized) return;

    try {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.context.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("AudioSystem failed to initialize:", e);
    }
  }

  async resume(): Promise<void> {
    if (this.context && this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch (e) {}
    }
  }

  startWind(): void {
    if (!this.context || !this.masterGain || this.windStarted) return;
    this.windStarted = true;

    try {
      const baseFreq = 200;

      for (let i = 0; i < 3; i++) {
        const osc = this.context.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = baseFreq + Math.random() * 100;

        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 150 + Math.random() * 100;
        filter.Q.value = 0.5;

        const gain = this.context.createGain();
        gain.gain.value = 0.02;

        const lfo = this.context.createOscillator();
        lfo.frequency.value = 0.1 + Math.random() * 0.2;
        const lfoGain = this.context.createGain();
        lfoGain.gain.value = 80;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
      }
    } catch (e) {
      console.warn("Wind audio failed:", e);
    }
  }

  playFootstep(surface: "grass" | "rock" | "sand" | "snow" = "grass"): void {
    if (!this.context || !this.masterGain) return;

    try {
      const bufferSize = this.context.sampleRate * 0.08;
      const buffer = this.context.createBuffer(
        1,
        bufferSize,
        this.context.sampleRate,
      );
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const source = this.context.createBufferSource();
      source.buffer = buffer;

      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";

      switch (surface) {
        case "grass":
          filter.frequency.value = 400;
          break;
        case "rock":
          filter.frequency.value = 2000;
          break;
        case "sand":
          filter.frequency.value = 200;
          break;
        case "snow":
          filter.frequency.value = 300;
          break;
      }

      const gain = this.context.createGain();
      gain.gain.value = 0.08;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();
    } catch (e) {}
  }

  dispose(): void {
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    this.initialized = false;
  }

  get isReady(): boolean {
    return this.initialized;
  }

  update(
    position: { x: number; y: number; z: number },
    inWater: boolean,
  ): void {}
}
