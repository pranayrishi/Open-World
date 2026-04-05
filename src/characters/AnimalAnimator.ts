import * as THREE from "three";
import { AnimalParts, AnimalType } from "./AnimalBuilder.js";

export class AnimalAnimator {
  private parts: AnimalParts;
  private type: AnimalType;
  private time = 0;
  private isMoving = false;

  constructor(parts: AnimalParts, type: AnimalType) {
    this.parts = parts;
    this.type = type;
  }

  setMoving(moving: boolean): void {
    this.isMoving = moving;
  }

  update(dt: number): void {
    this.time += dt;

    if (this.isMoving) {
      this.animateWalk();
    } else {
      this.animateIdle();
    }
  }

  private animateWalk(): void {
    const t = this.time;
    const legs = this.parts.legs;

    switch (this.type) {
      case "deer": {
        const speed = 4.0;
        legs[0].rotation.x = Math.sin(t * speed) * 0.4;
        legs[1].rotation.x = Math.sin(t * speed + Math.PI) * 0.4;
        legs[2].rotation.x = Math.sin(t * speed + Math.PI) * 0.45;
        legs[3].rotation.x = Math.sin(t * speed) * 0.45;
        this.parts.head.position.y = 0.9 + Math.sin(t * speed * 2) * 0.02;
        this.parts.head.rotation.x = Math.sin(t * speed) * 0.05;
        if (this.parts.tail) {
          this.parts.tail.rotation.x = Math.sin(t * 2) * 0.2;
        }
        break;
      }

      case "rabbit": {
        const hopCycle = Math.sin(t * 6);
        const hopPhase = Math.max(0, hopCycle);
        legs[0].rotation.x = hopPhase * 0.3;
        legs[1].rotation.x = hopPhase * 0.3;
        legs[2].rotation.x = -hopPhase * 0.6;
        legs[3].rotation.x = -hopPhase * 0.6;
        this.parts.body.position.y = 0.22 + hopPhase * 0.06;
        this.parts.head.position.y = 0.32 + hopPhase * 0.06;
        break;
      }

      case "fox": {
        const speed = 5.0;
        legs[0].rotation.x = Math.sin(t * speed) * 0.45;
        legs[1].rotation.x = Math.sin(t * speed + Math.PI) * 0.45;
        legs[2].rotation.x = Math.sin(t * speed + Math.PI) * 0.5;
        legs[3].rotation.x = Math.sin(t * speed) * 0.5;
        if (this.parts.tail) {
          this.parts.tail.rotation.y = Math.sin(t * 3) * 0.2;
        }
        break;
      }

      case "bird": {
        const speed = 8.0;
        legs[0].rotation.x = Math.sin(t * speed) * 0.3;
        legs[1].rotation.x = Math.sin(t * speed + Math.PI) * 0.3;
        this.parts.head.position.x = 0.06 + Math.sin(t * speed) * 0.015;
        break;
      }
    }
  }

  private animateIdle(): void {
    const t = this.time;

    const baseScaleY = 1.0 + Math.sin(t * 2) * 0.02;
    this.parts.body.scale.y = baseScaleY;

    for (const leg of this.parts.legs) {
      leg.rotation.x *= 0.9;
    }

    switch (this.type) {
      case "deer":
        this.parts.head.rotation.y = Math.sin(t * 0.5) * 0.3;
        if (this.parts.tail) {
          this.parts.tail.rotation.x = Math.sin(t * 1.5) * 0.1;
        }
        break;

      case "rabbit":
        this.parts.head.rotation.x = Math.sin(t * 3) * 0.05;
        break;

      case "fox":
        this.parts.head.rotation.y = Math.sin(t * 0.4) * 0.25;
        if (this.parts.tail) {
          this.parts.tail.rotation.y = Math.sin(t * 1.5) * 0.15;
        }
        break;

      case "bird":
        this.parts.head.rotation.y = Math.sin(t * 0.8) * 0.5;
        break;
    }
  }

  reset(): void {
    for (const leg of this.parts.legs) {
      leg.rotation.set(0, 0, 0);
    }
    this.parts.body.scale.set(1, 1, 1);
    this.parts.body.position.y = this.parts.body.position.y;
    this.parts.head.rotation.set(0, 0, 0);
    if (this.parts.tail) {
      this.parts.tail.rotation.set(0, 0, 0);
    }
  }
}
