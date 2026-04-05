import * as THREE from "three";
import { ChunkManager } from "../world/ChunkManager.js";
import { InputManager } from "../engine/InputManager.js";
import RAPIER from "@dimforge/rapier3d-compat";
import { CHUNK_SIZE } from "../world/ChunkManager.js";

export class PlayerController {
  private camera: THREE.PerspectiveCamera;
  private chunkManager: ChunkManager;
  private input: InputManager;
  private rapiWorld: RAPIER.World;

  private playerBody: any = null;
  private playerMesh!: THREE.Mesh;

  private position: THREE.Vector3 = new THREE.Vector3(0, 50, 0);
  private yaw = 0;
  private pitch = 0.3;
  private cameraDistance = 6;
  private targetRotation = 0;

  private isGrounded = false;
  private readonly PLAYER_HEIGHT = 1.8;
  private readonly PLAYER_RADIUS = 0.3;
  private readonly WALK_SPEED = 5;
  private readonly RUN_SPEED = 10;
  private readonly JUMP_FORCE = 8;
  private readonly GRAVITY = -25;
  private readonly CAMERA_SMOOTHING = 0.15;
  private readonly ROTATION_SMOOTHING = 0.15;
  private readonly PITCH_MIN = -0.17;
  private readonly PITCH_MAX = 1.4;

  private lastSafePosition = new THREE.Vector3();
  private fallTimer = 0;
  private readonly FALL_TIMEOUT = 2.0;
  private initialized = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    chunkManager: ChunkManager,
    input: InputManager,
    rapiWorld: RAPIER.World,
  ) {
    this.camera = camera;
    this.chunkManager = chunkManager;
    this.input = input;
    this.rapiWorld = rapiWorld;
  }

  initialize(playerBody: any, playerMesh: THREE.Mesh): void {
    this.playerBody = playerBody;
    this.playerMesh = playerMesh;
    this.initialized = true;
  }

  update(deltaTime: number): void {
    if (!this.initialized) return;

    this.updateCamera(deltaTime);
    this.updateMovement(deltaTime);
    this.syncMesh();

    this.playerMesh.quaternion.normalize();
  }

  fixedUpdate(deltaTime: number): void {
    if (!this.initialized || !this.playerBody) return;

    const pos = this.playerBody.translation();
    const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);

    const terrainHeight = this.chunkManager.getTerrainHeightAt(
      currentPos.x,
      currentPos.z,
    );

    if (terrainHeight !== null) {
      if (currentPos.y < terrainHeight - 5) {
        console.warn("Player fell through terrain, teleporting to surface");
        this.playerBody.setTranslation(
          { x: currentPos.x, y: terrainHeight + 2, z: currentPos.z },
          true,
        );
        this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.fallTimer = 0;
        return;
      }

      if (currentPos.y >= terrainHeight - 1) {
        this.lastSafePosition.set(
          currentPos.x,
          terrainHeight + 1,
          currentPos.z,
        );
        this.fallTimer = 0;
      }
    } else {
      this.fallTimer += deltaTime;
      if (this.fallTimer > this.FALL_TIMEOUT) {
        console.warn(
          "No terrain at player position, returning to safe position",
        );
        this.playerBody.setTranslation(
          {
            x: this.lastSafePosition.x,
            y: this.lastSafePosition.y,
            z: this.lastSafePosition.z,
          },
          true,
        );
        this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.fallTimer = 0;
      }
    }
  }

  private updateCamera(deltaTime: number): void {
    const delta = this.input.getMouseDeltaScaled();

    const rawYaw = delta.x;
    const rawPitch = delta.y;

    this.yaw += rawYaw;
    this.pitch += rawPitch;
    this.pitch = Math.max(this.PITCH_MIN, Math.min(this.PITCH_MAX, this.pitch));

    const distance = this.cameraDistance;
    const cameraOffset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch) * distance,
      Math.sin(this.pitch) * distance + 2,
      Math.cos(this.yaw) * Math.cos(this.pitch) * distance,
    );

    const targetCamPos = this.playerMesh.position.clone().add(cameraOffset);

    this.camera.position.lerp(targetCamPos, Math.min(1.0, 8.0 * deltaTime));

    const lookTarget = this.playerMesh.position.clone();
    lookTarget.y += 1.5;
    this.camera.lookAt(lookTarget);
  }

  private updateMovement(deltaTime: number): void {
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw),
    ).normalize();

    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw),
    ).normalize();

    const moveDir = new THREE.Vector3();

    if (this.input.isKeyDown("KeyW")) moveDir.add(forward);
    if (this.input.isKeyDown("KeyS")) moveDir.sub(forward);
    if (this.input.isKeyDown("KeyA")) moveDir.sub(right);
    if (this.input.isKeyDown("KeyD")) moveDir.add(right);

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) {
      moveDir.normalize();
    }

    const speed =
      this.input.isKeyDown("ShiftLeft") || this.input.isKeyDown("ShiftRight")
        ? this.RUN_SPEED
        : this.WALK_SPEED;

    if (this.playerBody) {
      const linvel = this.playerBody.linvel();

      const damping = 10;
      const targetVelX = moveDir.x * speed;
      const targetVelZ = moveDir.z * speed;
      const newVelX = linvel.x + (targetVelX - linvel.x) * damping * deltaTime;
      const newVelZ = linvel.z + (targetVelZ - linvel.z) * damping * deltaTime;

      let newVelY = linvel.y + this.GRAVITY * deltaTime;

      if (this.input.isKeyDown("Space") && this.isGrounded) {
        newVelY = this.JUMP_FORCE;
        this.isGrounded = false;
      }

      this.playerBody.setLinvel({ x: newVelX, y: newVelY, z: newVelZ }, true);

      const pos = this.playerBody.translation();
      const terrainY = this.chunkManager.getHeightAt(pos.x, pos.z);
      const feetY = terrainY + this.PLAYER_HEIGHT / 2;

      if (pos.y <= feetY + 0.15) {
        this.isGrounded = true;
        this.playerBody.setTranslation(
          { x: pos.x, y: feetY + 0.15, z: pos.z },
          true,
        );
        const currentVel = this.playerBody.linvel();
        this.playerBody.setLinvel(
          { x: currentVel.x, y: 0, z: currentVel.z },
          true,
        );
      } else if (pos.y > feetY + 0.5) {
        this.isGrounded = false;
      }

      this.position.set(pos.x, pos.y, pos.z);

      if (isMoving) {
        const targetAngle = Math.atan2(-moveDir.x, -moveDir.z);
        let diff = targetAngle - this.targetRotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.targetRotation += diff * this.ROTATION_SMOOTHING;
      }
    }
  }

  private syncMesh(): void {
    if (this.playerMesh && this.playerBody) {
      const pos = this.playerBody.translation();
      this.playerMesh.position.set(pos.x, pos.y, pos.z);
      this.playerMesh.rotation.y = this.targetRotation;
    }
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getIsGrounded(): boolean {
    return this.isGrounded;
  }

  resetCamera(): void {
    this.yaw = 0;
    this.pitch = 0.3;
  }

  setInitialPosition(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.lastSafePosition.copy(pos);
    this.targetRotation = 0;
    this.yaw = 0;
    this.fallTimer = 0;
  }
}
