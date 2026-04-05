import * as THREE from "three";
import { CharacterParts } from "./CharacterBuilder.js";

type AnimState = "idle" | "walk" | "run" | "wave";

export class CharacterAnimator {
  private parts: CharacterParts;
  private state: AnimState = "idle";
  private time = 0;
  private transitionTime = 0;
  private prevState: AnimState = "idle";
  private currentLegSwing = 0;
  private currentArmSwing = 0;
  private targetLegSwing = 0;
  private targetArmSwing = 0;

  constructor(parts: CharacterParts) {
    this.parts = parts;
  }

  setState(newState: AnimState): void {
    if (newState !== this.state) {
      this.prevState = this.state;
      this.state = newState;
      this.transitionTime = 0;
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.transitionTime += dt;

    const blend = Math.min(this.transitionTime / 0.3, 1.0);

    switch (this.state) {
      case "idle":
        this.animateIdle(blend);
        break;
      case "walk":
        this.animateWalk(blend);
        break;
      case "run":
        this.animateRun(blend);
        break;
      case "wave":
        this.animateWave(blend);
        break;
    }
  }

  private lerp(current: number, target: number, blend: number): number {
    return current + (target - current) * blend;
  }

  private animateIdle(blend: number): void {
    const t = this.time;
    const p = this.parts;

    p.torso.position.y = 1.25 + Math.sin(t * 1.5) * 0.005;
    p.head.position.y = 1.62 + Math.sin(t * 1.5) * 0.005;

    p.root.rotation.z = Math.sin(t * 0.8) * 0.01;

    this.targetLegSwing = 0;
    this.targetArmSwing = 0;

    p.leftUpperArm.rotation.x = this.lerp(
      p.leftUpperArm.rotation.x,
      Math.sin(t * 0.7) * 0.03,
      blend,
    );
    p.rightUpperArm.rotation.x = this.lerp(
      p.rightUpperArm.rotation.x,
      Math.sin(t * 0.7 + 1) * 0.03,
      blend,
    );

    p.leftUpperLeg.rotation.x = this.lerp(p.leftUpperLeg.rotation.x, 0, blend);
    p.rightUpperLeg.rotation.x = this.lerp(
      p.rightUpperLeg.rotation.x,
      0,
      blend,
    );

    p.head.rotation.y = Math.sin(t * 0.3) * 0.15;
  }

  private animateWalk(blend: number): void {
    const t = this.time;
    const speed = 3.0;
    const p = this.parts;

    this.targetLegSwing = Math.sin(t * speed) * 0.5;
    this.targetArmSwing = Math.sin(t * speed) * 0.35;

    this.currentLegSwing = this.lerp(
      this.currentLegSwing,
      this.targetLegSwing,
      blend,
    );
    this.currentArmSwing = this.lerp(
      this.currentArmSwing,
      this.targetArmSwing,
      blend,
    );

    p.leftUpperLeg.rotation.x = this.currentLegSwing;
    p.rightUpperLeg.rotation.x = -this.currentLegSwing;

    p.leftUpperArm.rotation.x = -this.currentArmSwing;
    p.rightUpperArm.rotation.x = this.currentArmSwing;

    const bob = Math.abs(Math.sin(t * speed)) * 0.02;
    p.torso.position.y = 1.25 + bob;
    p.head.position.y = 1.62 + bob;

    p.torso.rotation.x = 0.05;
    p.torso.rotation.y = Math.sin(t * speed) * 0.05;

    p.head.rotation.y = Math.sin(t * speed) * -0.03;
    p.head.rotation.x = -0.03;
  }

  private animateRun(blend: number): void {
    const t = this.time;
    const speed = 5.0;
    const p = this.parts;

    this.targetLegSwing = Math.sin(t * speed) * 0.7;
    this.targetArmSwing = Math.sin(t * speed) * 0.55;

    this.currentLegSwing = this.lerp(
      this.currentLegSwing,
      this.targetLegSwing,
      blend,
    );
    this.currentArmSwing = this.lerp(
      this.currentArmSwing,
      this.targetArmSwing,
      blend,
    );

    p.leftUpperLeg.rotation.x = this.currentLegSwing;
    p.rightUpperLeg.rotation.x = -this.currentLegSwing;

    p.leftUpperArm.rotation.x = -this.currentArmSwing;
    p.rightUpperArm.rotation.x = this.currentArmSwing;

    const bob = Math.abs(Math.sin(t * speed)) * 0.04;
    p.torso.position.y = 1.25 + bob;
    p.head.position.y = 1.62 + bob;

    p.torso.rotation.x = 0.12;
    p.head.rotation.x = -0.05;
    p.torso.rotation.y = Math.sin(t * speed) * 0.08;
  }

  private animateWave(blend: number): void {
    const t = this.time;
    const p = this.parts;

    this.animateIdle(blend);

    p.rightUpperArm.rotation.x = -0.2;
    p.rightUpperArm.rotation.z = -2.5;
    p.rightLowerArm.rotation.z = Math.sin(t * 4) * 0.3 - 0.5;
  }

  reset(): void {
    const p = this.parts;
    p.leftUpperArm.rotation.set(0, 0, 0);
    p.rightUpperArm.rotation.set(0, 0, 0);
    p.leftUpperLeg.rotation.set(0, 0, 0);
    p.rightUpperLeg.rotation.set(0, 0, 0);
    p.torso.rotation.set(0, 0, 0);
    p.head.rotation.set(0, 0, 0);
    this.currentLegSwing = 0;
    this.currentArmSwing = 0;
  }
}
