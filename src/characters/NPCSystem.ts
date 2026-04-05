import * as THREE from "three";
import { CharacterGenerator } from "./CharacterGenerator.js";
import { AnimationSystem, AnimationState } from "./AnimationSystem.js";
import { ChunkManager } from "../world/ChunkManager.js";

interface NPCData {
  mesh: THREE.SkinnedMesh;
  animationSystem: AnimationSystem;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  state: "idle" | "walk" | "look";
  stateTimer: number;
  rotation: number;
  variant: number;
}

export class NPCSystem {
  private scene: THREE.Scene;
  private chunkManager: ChunkManager;
  private npcs: Map<number, NPCData> = new Map();
  private characterGenerator: CharacterGenerator;
  private nextNPCId = 1;
  private readonly MAX_NPCS = 20;
  private readonly SPAWN_RADIUS = 100;
  private readonly DESPAWN_RADIUS = 150;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, chunkManager: ChunkManager) {
    this.scene = scene;
    this.chunkManager = chunkManager;
    this.characterGenerator = new CharacterGenerator();
  }

  initialize(): void {
    for (let i = 0; i < 8; i++) {
      this.spawnNPC();
    }
  }

  private spawnNPC(): void {
    if (this.npcs.size >= this.MAX_NPCS) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * this.SPAWN_RADIUS;

    const x = this.playerPosition.x + Math.cos(angle) * distance;
    const z = this.playerPosition.z + Math.sin(angle) * distance;
    const y = this.chunkManager.getHeightAt(x, z);

    const { biome } = this.chunkManager.getBiomeAt(x, z);
    const slope = this.chunkManager.getSlopeAt(x, z);

    if (slope > 0.4 || y < -5 || y > 150) {
      return;
    }

    const mesh = this.characterGenerator.generateCharacter();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const animationSystem = new AnimationSystem(
      this.characterGenerator.getSkeleton(),
      this.characterGenerator.getBones(),
    );

    const npcId = this.nextNPCId++;
    this.npcs.set(npcId, {
      mesh,
      animationSystem,
      position: new THREE.Vector3(x, y, z),
      targetPosition: new THREE.Vector3(x, y, z),
      state: "idle",
      stateTimer: 2 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      variant: Math.floor(Math.random() * 8),
    });

    this.scene.add(mesh);
  }

  update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.playerPosition.copy(playerPosition);

    for (const [npcId, npc] of this.npcs) {
      npc.stateTimer -= deltaTime;

      const distToPlayer = npc.position.distanceTo(playerPosition);

      if (distToPlayer < 10) {
        this.updateLookState(npc, playerPosition, deltaTime);
      } else {
        this.updateBehavior(npc, deltaTime);
      }

      this.updatePosition(npc, deltaTime);
      npc.animationSystem.update(deltaTime);

      this.checkDespawn(npcId, npc);
    }

    this.checkSpawn();
  }

  private updateBehavior(npc: NPCData, deltaTime: number): void {
    switch (npc.state) {
      case "idle":
        if (npc.stateTimer <= 0) {
          npc.state = "walk";
          npc.stateTimer = 3 + Math.random() * 5;
          const angle = Math.random() * Math.PI * 2;
          const distance = 5 + Math.random() * 15;
          npc.targetPosition.set(
            npc.position.x + Math.cos(angle) * distance,
            0,
            npc.position.z + Math.sin(angle) * distance,
          );
          npc.targetPosition.y = this.chunkManager.getHeightAt(
            npc.targetPosition.x,
            npc.targetPosition.z,
          );
          npc.animationSystem.playAnimation("walk");
        }
        break;

      case "walk":
        const dir = new THREE.Vector3().subVectors(
          npc.targetPosition,
          npc.position,
        );
        dir.y = 0;
        const dist = dir.length();

        if (dist < 1 || npc.stateTimer <= 0) {
          npc.state = "idle";
          npc.stateTimer = 3 + Math.random() * 4;
          npc.animationSystem.playAnimation("idle");
        } else {
          dir.normalize();
          const moveSpeed = 1.5 * deltaTime;
          npc.position.add(dir.multiplyScalar(moveSpeed));
          npc.position.y = this.chunkManager.getHeightAt(
            npc.position.x,
            npc.position.z,
          );

          npc.rotation = Math.atan2(dir.x, dir.z);
          npc.mesh.rotation.y = npc.rotation;
        }
        break;

      case "look":
        if (npc.stateTimer <= 0) {
          npc.state = "idle";
          npc.stateTimer = 2 + Math.random() * 3;
          npc.animationSystem.playAnimation("idle");
        }
        break;
    }
  }

  private updateLookState(
    npc: NPCData,
    playerPos: THREE.Vector3,
    deltaTime: number,
  ): void {
    if (npc.state !== "look") {
      npc.state = "look";
      npc.stateTimer = 2 + Math.random() * 2;
      npc.animationSystem.playAnimation("idle");
    }

    const dir = new THREE.Vector3().subVectors(playerPos, npc.position);
    const targetRotation = Math.atan2(dir.x, dir.z);

    let diff = targetRotation - npc.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    npc.rotation += diff * 0.1;
    npc.mesh.rotation.y = npc.rotation;
  }

  private updatePosition(npc: NPCData, deltaTime: number): void {
    npc.mesh.position.copy(npc.position);
  }

  private checkDespawn(npcId: number, npc: NPCData): void {
    const distToPlayer = npc.position.distanceTo(this.playerPosition);
    if (distToPlayer > this.DESPAWN_RADIUS) {
      this.scene.remove(npc.mesh);
      npc.mesh.geometry.dispose();
      if (Array.isArray(npc.mesh.material)) {
        npc.mesh.material.forEach((m) => m.dispose());
      } else {
        npc.mesh.material.dispose();
      }
      this.npcs.delete(npcId);
    }
  }

  private checkSpawn(): void {
    if (this.npcs.size < this.MAX_NPCS && Math.random() < 0.01) {
      this.spawnNPC();
    }
  }

  dispose(): void {
    for (const [npcId, npc] of this.npcs) {
      this.scene.remove(npc.mesh);
      npc.mesh.geometry.dispose();
      if (Array.isArray(npc.mesh.material)) {
        npc.mesh.material.forEach((m) => m.dispose());
      } else {
        npc.mesh.material.dispose();
      }
    }
    this.npcs.clear();
  }

  getAllPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    for (const [, npc] of this.npcs) {
      positions.push(npc.position);
    }
    return positions;
  }
}
