import * as THREE from "three";
import { buildCharacter, CharacterParts } from "./CharacterBuilder.js";
import { CharacterAnimator } from "./CharacterAnimator.js";
import { buildAnimal, AnimalParts, AnimalType } from "./AnimalBuilder.js";
import { AnimalAnimator } from "./AnimalAnimator.js";

interface NPC {
  parts: CharacterParts;
  animator: CharacterAnimator;
  state: "idle" | "walk" | "wave";
  stateTimer: number;
  waypoint: THREE.Vector3;
  speed: number;
}

interface Animal {
  parts: AnimalParts;
  animator: AnimalAnimator;
  type: AnimalType;
  state: "idle" | "walk";
  stateTimer: number;
  waypoint: THREE.Vector3;
  speed: number;
  baseSpeed: number;
}

const NPC_VARIANTS = [
  { shirtColor: "#3B7DD8", pantsColor: "#4A4A4A", skinColor: "#DEB887" },
  { shirtColor: "#C0392B", pantsColor: "#2C3E50", skinColor: "#D2A679" },
  { shirtColor: "#27AE60", pantsColor: "#795548", skinColor: "#8D5524" },
  { shirtColor: "#8E44AD", pantsColor: "#34495E", skinColor: "#F5CBA7" },
  { shirtColor: "#F39C12", pantsColor: "#2C3E50", skinColor: "#C68642" },
  { shirtColor: "#1ABC9C", pantsColor: "#4A4A4A", skinColor: "#E0AC69" },
  { shirtColor: "#E74C3C", pantsColor: "#5D4E37", skinColor: "#A67B5B" },
  { shirtColor: "#2980B9", pantsColor: "#3E2723", skinColor: "#FFDBB4" },
];

export class CreatureSystem {
  private scene: THREE.Scene;
  private npcs: NPC[] = [];
  private animals: Animal[] = [];
  private heightFn: (x: number, z: number) => number;
  private spawnRadius = 150;
  private readonly _tempVec = new THREE.Vector3();

  constructor(scene: THREE.Scene, heightFn: (x: number, z: number) => number) {
    this.scene = scene;
    this.heightFn = heightFn;
  }

  spawnInitial(playerPos: THREE.Vector3): void {
    for (let i = 0; i < 12; i++) {
      this.spawnNPC(playerPos, i);
    }

    for (let i = 0; i < 6; i++) this.spawnAnimal(playerPos, "deer");
    for (let i = 0; i < 8; i++) this.spawnAnimal(playerPos, "rabbit");
    for (let i = 0; i < 4; i++) this.spawnAnimal(playerPos, "fox");
    for (let i = 0; i < 10; i++) this.spawnAnimal(playerPos, "bird");
  }

  private spawnNPC(center: THREE.Vector3, variantIndex: number): void {
    const variant = NPC_VARIANTS[variantIndex % NPC_VARIANTS.length];
    const parts = buildCharacter({
      ...variant,
      height: 0.92 + Math.random() * 0.16,
      bodyWidth: 0.9 + Math.random() * 0.2,
    });

    const pos = this.findSpawnPosition(center);
    parts.root.position.copy(pos);

    this.scene.add(parts.root);

    const animator = new CharacterAnimator(parts);

    this.npcs.push({
      parts,
      animator,
      state: "idle",
      stateTimer: 2 + Math.random() * 5,
      waypoint: pos.clone(),
      speed: 1.2 + Math.random() * 0.6,
    });
  }

  private spawnAnimal(center: THREE.Vector3, type: AnimalType): void {
    const parts = buildAnimal(type);
    const pos = this.findSpawnPosition(center);

    const scaleMap: Record<AnimalType, number> = {
      deer: 0.9 + Math.random() * 0.3,
      rabbit: 0.7 + Math.random() * 0.3,
      fox: 0.8 + Math.random() * 0.2,
      bird: 0.6 + Math.random() * 0.3,
    };
    parts.root.scale.setScalar(scaleMap[type]);
    parts.root.position.copy(pos);

    this.scene.add(parts.root);

    const animator = new AnimalAnimator(parts, type);

    const speedMap: Record<AnimalType, number> = {
      deer: 2.0 + Math.random() * 1.5,
      rabbit: 1.5 + Math.random() * 2.0,
      fox: 1.8 + Math.random() * 1.0,
      bird: 0.8 + Math.random() * 0.5,
    };

    const baseSpeed = speedMap[type];

    this.animals.push({
      parts,
      animator,
      type,
      state: "idle",
      stateTimer: 1 + Math.random() * 6,
      waypoint: pos.clone(),
      speed: baseSpeed,
      baseSpeed,
    });
  }

  private findSpawnPosition(center: THREE.Vector3): THREE.Vector3 {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * this.spawnRadius;
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;
      const y = this.heightFn(x, z);

      if (y < 2) continue;

      const yRight = this.heightFn(x + 1, z);
      const yForward = this.heightFn(x, z + 1);
      const slope = Math.abs(yRight - y) + Math.abs(yForward - y);
      if (slope > 1.5) continue;

      return new THREE.Vector3(x, y, z);
    }

    const y = this.heightFn(center.x + 10, center.z + 10);
    return new THREE.Vector3(center.x + 10, Math.max(y, 5), center.z + 10);
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    this.updateNPCs(dt, playerPos);
    this.updateAnimals(dt, playerPos);
  }

  private updateNPCs(dt: number, playerPos: THREE.Vector3): void {
    for (const npc of this.npcs) {
      npc.stateTimer -= dt;
      npc.animator.update(dt);

      const pos = npc.parts.root.position;
      const distToPlayer = pos.distanceTo(playerPos);

      if (npc.stateTimer <= 0) {
        if (distToPlayer < 12) {
          npc.state = "wave";
          npc.stateTimer = 2 + Math.random() * 2;
          npc.animator.setState("wave");

          this._tempVec.copy(playerPos).sub(pos);
          this._tempVec.y = 0;
          if (this._tempVec.length() > 0.1) {
            npc.parts.root.rotation.y = Math.atan2(
              this._tempVec.x,
              this._tempVec.z,
            );
          }
        } else if (Math.random() < 0.5) {
          npc.state = "walk";
          npc.stateTimer = 3 + Math.random() * 6;
          npc.animator.setState("walk");

          const angle = Math.random() * Math.PI * 2;
          const dist = 5 + Math.random() * 15;
          npc.waypoint.set(
            pos.x + Math.cos(angle) * dist,
            0,
            pos.z + Math.sin(angle) * dist,
          );
          npc.waypoint.y = this.heightFn(npc.waypoint.x, npc.waypoint.z);
        } else {
          npc.state = "idle";
          npc.stateTimer = 2 + Math.random() * 5;
          npc.animator.setState("idle");
        }
      }

      if (npc.state === "walk") {
        this._tempVec.copy(npc.waypoint).sub(pos);
        this._tempVec.y = 0;
        const dist = this._tempVec.length();

        if (dist > 0.5) {
          this._tempVec.normalize();
          pos.x += this._tempVec.x * npc.speed * dt;
          pos.z += this._tempVec.z * npc.speed * dt;
          pos.y = this.heightFn(pos.x, pos.z);

          npc.parts.root.rotation.y = Math.atan2(
            this._tempVec.x,
            this._tempVec.z,
          );
        } else {
          npc.state = "idle";
          npc.stateTimer = 1 + Math.random() * 3;
          npc.animator.setState("idle");
        }
      }
    }
  }

  private updateAnimals(dt: number, playerPos: THREE.Vector3): void {
    for (const animal of this.animals) {
      animal.stateTimer -= dt;
      animal.animator.update(dt);

      const pos = animal.parts.root.position;
      const distToPlayer = pos.distanceTo(playerPos);

      if (animal.stateTimer <= 0) {
        if (distToPlayer < 8 && animal.type !== "bird") {
          animal.state = "walk";
          animal.stateTimer = 2 + Math.random() * 3;
          animal.animator.setMoving(true);

          this._tempVec.copy(pos).sub(playerPos).normalize();
          animal.waypoint.set(
            pos.x + this._tempVec.x * 20,
            0,
            pos.z + this._tempVec.z * 20,
          );
          animal.waypoint.y = this.heightFn(
            animal.waypoint.x,
            animal.waypoint.z,
          );
          animal.speed = animal.baseSpeed * 1.5;
        } else if (Math.random() < 0.4) {
          animal.state = "walk";
          animal.stateTimer = 2 + Math.random() * 5;
          animal.animator.setMoving(true);

          const angle = Math.random() * Math.PI * 2;
          const dist = 3 + Math.random() * 10;
          animal.waypoint.set(
            pos.x + Math.cos(angle) * dist,
            0,
            pos.z + Math.sin(angle) * dist,
          );
          animal.waypoint.y = this.heightFn(
            animal.waypoint.x,
            animal.waypoint.z,
          );
          animal.speed = animal.baseSpeed;
        } else {
          animal.state = "idle";
          animal.stateTimer = 2 + Math.random() * 8;
          animal.animator.setMoving(false);
          animal.speed = animal.baseSpeed;
        }
      }

      if (animal.state === "walk") {
        this._tempVec.copy(animal.waypoint).sub(pos);
        this._tempVec.y = 0;
        const dist = this._tempVec.length();

        if (dist > 0.3) {
          this._tempVec.normalize();
          pos.x += this._tempVec.x * animal.speed * dt;
          pos.z += this._tempVec.z * animal.speed * dt;
          pos.y = this.heightFn(pos.x, pos.z);

          animal.parts.root.rotation.y = Math.atan2(
            this._tempVec.x,
            this._tempVec.z,
          );
        } else {
          animal.state = "idle";
          animal.stateTimer = 1 + Math.random() * 4;
          animal.animator.setMoving(false);
        }
      }
    }
  }

  getAllNPCPositions(): THREE.Vector3[] {
    return this.npcs.map((n) => n.parts.root.position);
  }

  getAllAnimalPositions(): THREE.Vector3[] {
    return this.animals.map((a) => a.parts.root.position);
  }

  dispose(): void {
    for (const npc of this.npcs) {
      this.scene.remove(npc.parts.root);
    }
    for (const animal of this.animals) {
      this.scene.remove(animal.parts.root);
    }
    this.npcs = [];
    this.animals = [];
  }
}
