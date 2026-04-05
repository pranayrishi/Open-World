import * as THREE from "three";

export type AnimationState = "idle" | "walk" | "run" | "jump";

export class AnimationSystem {
  private mixer: THREE.AnimationMixer;
  private clips: Map<AnimationState, THREE.AnimationClip> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private bones: Map<string, THREE.Bone>;

  constructor(skeleton: THREE.Skeleton, bones: Map<string, THREE.Bone>) {
    this.mixer = new THREE.AnimationMixer(skeleton.bones[0].parent!);
    this.bones = bones;
    this.createAnimations();
    this.playAnimation("idle");
  }

  private createAnimations(): void {
    this.clips.set("idle", this.createIdleAnimation());
    this.clips.set("walk", this.createWalkAnimation());
    this.clips.set("run", this.createRunAnimation());
    this.clips.set("jump", this.createJumpAnimation());
  }

  private createIdleAnimation(): THREE.AnimationClip {
    const duration = 2.0;
    const tracks: THREE.KeyframeTrack[] = [];

    const breathTimes = [0, 0.5, 1, 1.5, 2];
    const breathValues = [0, 0.02, 0, -0.02, 0];
    const spineQ = new THREE.Quaternion();
    const spine = this.bones.get("spine");
    if (spine) {
      const euler = new THREE.Euler(0, 0, 0);
      spineQ.setFromEuler(euler);
      const flatValues: number[] = [];
      for (const v of breathValues) {
        euler.set(v, 0, 0);
        spineQ.setFromEuler(euler);
        flatValues.push(spineQ.x, spineQ.y, spineQ.z, spineQ.w);
      }
      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          "spine.quaternion",
          breathTimes,
          flatValues,
        ),
      );
    }

    const swayTimes = [0, 1, 2];
    const swayValues: number[] = [];
    for (const t of swayTimes) {
      const angle = Math.sin(t * Math.PI) * 0.03;
      const euler = new THREE.Euler(0, 0, angle);
      const q = new THREE.Quaternion().setFromEuler(euler);
      swayValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "root.quaternion",
        swayTimes,
        swayValues,
      ),
    );

    const headTimes = [0, 0.7, 1.4, 2.0];
    const headYValues: number[] = [];
    for (let i = 0; i < headTimes.length; i++) {
      const angle = Math.sin(i * 1.5) * 0.05;
      const euler = new THREE.Euler(0, angle, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      headYValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "head.quaternion",
        headTimes,
        headYValues,
      ),
    );

    return new THREE.AnimationClip("idle", duration, tracks);
  }

  private createWalkAnimation(): THREE.AnimationClip {
    const duration = 1.0;
    const tracks: THREE.KeyframeTrack[] = [];

    const leftLegTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const leftLegValues: number[] = [];
    for (const t of leftLegTimes) {
      const angle = Math.sin(t * Math.PI * 2) * 0.5;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      leftLegValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "leftUpperLeg.quaternion",
        leftLegTimes,
        leftLegValues,
      ),
    );

    const rightLegTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const rightLegValues: number[] = [];
    for (const t of rightLegTimes) {
      const angle = -Math.sin(t * Math.PI * 2) * 0.5;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      rightLegValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "rightUpperLeg.quaternion",
        rightLegTimes,
        rightLegValues,
      ),
    );

    const leftArmTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const leftArmValues: number[] = [];
    for (const t of leftArmTimes) {
      const angle = -Math.sin(t * Math.PI * 2) * 0.4;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      leftArmValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "leftUpperArm.quaternion",
        leftArmTimes,
        leftArmValues,
      ),
    );

    const rightArmTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const rightArmValues: number[] = [];
    for (const t of rightArmTimes) {
      const angle = Math.sin(t * Math.PI * 2) * 0.4;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      rightArmValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "rightUpperArm.quaternion",
        rightArmTimes,
        rightArmValues,
      ),
    );

    const hipTimes = [0, 0.5, 1.0];
    const hipValues: number[] = [];
    for (const t of hipTimes) {
      const angle = Math.sin(t * Math.PI * 2) * 0.05;
      const euler = new THREE.Euler(0, 0, angle);
      const q = new THREE.Quaternion().setFromEuler(euler);
      hipValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack("root.quaternion", hipTimes, hipValues),
    );

    const spineTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const spineValues: number[] = [];
    for (const t of spineTimes) {
      const angle = -0.1 + Math.sin(t * Math.PI * 4) * 0.02;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      spineValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "spine.quaternion",
        spineTimes,
        spineValues,
      ),
    );

    return new THREE.AnimationClip("walk", duration, tracks);
  }

  private createRunAnimation(): THREE.AnimationClip {
    const duration = 0.6;
    const tracks: THREE.KeyframeTrack[] = [];

    const leftLegTimes = [0, 0.15, 0.3, 0.45, 0.6];
    const leftLegValues: number[] = [];
    for (const t of leftLegTimes) {
      const angle = Math.sin((t / 0.6) * Math.PI * 2) * 0.8;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      leftLegValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "leftUpperLeg.quaternion",
        leftLegTimes,
        leftLegValues,
      ),
    );

    const rightLegTimes = [0, 0.15, 0.3, 0.45, 0.6];
    const rightLegValues: number[] = [];
    for (const t of rightLegTimes) {
      const angle = -Math.sin((t / 0.6) * Math.PI * 2) * 0.8;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      rightLegValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "rightUpperLeg.quaternion",
        rightLegTimes,
        rightLegValues,
      ),
    );

    const leftArmTimes = [0, 0.15, 0.3, 0.45, 0.6];
    const leftArmValues: number[] = [];
    for (const t of leftArmTimes) {
      const angle = -Math.sin((t / 0.6) * Math.PI * 2) * 0.9;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      leftArmValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "leftUpperArm.quaternion",
        leftArmTimes,
        leftArmValues,
      ),
    );

    const rightArmTimes = [0, 0.15, 0.3, 0.45, 0.6];
    const rightArmValues: number[] = [];
    for (const t of rightArmTimes) {
      const angle = Math.sin((t / 0.6) * Math.PI * 2) * 0.9;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      rightArmValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "rightUpperArm.quaternion",
        rightArmTimes,
        rightArmValues,
      ),
    );

    const spineTimes = [0, 0.3, 0.6];
    const spineValues: number[] = [];
    for (const t of spineTimes) {
      const angle = -0.15 + Math.sin((t / 0.6) * Math.PI * 4) * 0.03;
      const euler = new THREE.Euler(angle, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      spineValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "spine.quaternion",
        spineTimes,
        spineValues,
      ),
    );

    return new THREE.AnimationClip("run", duration, tracks);
  }

  private createJumpAnimation(): THREE.AnimationClip {
    const duration = 0.8;
    const tracks: THREE.KeyframeTrack[] = [];

    const crouchTimes = [0, 0.15];
    const crouchValues: number[] = [];
    for (const t of crouchTimes) {
      const factor = t < 0.15 ? -0.3 : 0;
      const euler = new THREE.Euler(factor, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      crouchValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "leftUpperLeg.quaternion",
        crouchTimes,
        crouchValues,
      ),
    );
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "rightUpperLeg.quaternion",
        crouchTimes,
        crouchValues,
      ),
    );

    const launchTimes = [0.15, 0.3, 0.45];
    const launchValues: number[] = [];
    for (const t of launchTimes) {
      const factor = t < 0.3 ? 0.2 : 0;
      const euler = new THREE.Euler(factor, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      launchValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "spine.quaternion",
        launchTimes,
        launchValues,
      ),
    );

    const armTimes = [0.15, 0.3, 0.45];
    const armValues: number[] = [];
    for (const t of armTimes) {
      const factor = t < 0.3 ? -0.5 : 0;
      const euler = new THREE.Euler(factor, 0, 0);
      const q = new THREE.Quaternion().setFromEuler(euler);
      armValues.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "leftUpperArm.quaternion",
        armTimes,
        armValues,
      ),
    );
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        "rightUpperArm.quaternion",
        armTimes,
        armValues,
      ),
    );

    return new THREE.AnimationClip("jump", duration, tracks);
  }

  playAnimation(state: AnimationState, fadeTime: number = 0.2): void {
    const clip = this.clips.get(state);
    if (!clip) return;

    const newAction = this.mixer.clipAction(clip);
    newAction.reset();

    if (this.currentAction) {
      newAction.crossFadeFrom(this.currentAction, fadeTime, true);
    }

    newAction.play();
    this.currentAction = newAction;
  }

  update(deltaTime: number): void {
    this.mixer.update(deltaTime);
  }

  getMixer(): THREE.AnimationMixer {
    return this.mixer;
  }

  isAnimationComplete(): boolean {
    if (!this.currentAction) return true;
    return (
      this.currentAction.paused ||
      this.currentAction.time >= this.currentAction.getClip().duration
    );
  }
}
