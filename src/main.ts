import { Engine } from "./engine/Engine.js";
import { GameStateManager } from "./engine/GameStateManager.js";
import { ChunkManager } from "./world/ChunkManager.js";
import { WaterSystem } from "./world/WaterSystem.js";
import { VegetationSystem } from "./world/VegetationSystem.js";
import { TreeSystem } from "./world/TreeSystem.js";
import { SkySystem } from "./world/SkySystem.js";
import { PlayerController } from "./characters/PlayerController.js";
import { CreatureSystem } from "./characters/CreatureSystem.js";
import { PhysicsSync } from "./physics/PhysicsSync.js";
import { ColliderFactory } from "./physics/ColliderFactory.js";
import { AudioSystem } from "./world/AudioSystem.js";
import { UIOverlay } from "./world/UIOverlay.js";
import { StartScreen } from "./world/StartScreen.js";
import { Minimap } from "./world/Minimap.js";
import { WelcomeScroll } from "./world/WelcomeScroll.js";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

class Game {
  private engine!: Engine;
  private gameState!: GameStateManager;
  private chunkManager!: ChunkManager;
  private waterSystem!: WaterSystem;
  private vegetationSystem!: VegetationSystem;
  private treeSystem!: TreeSystem;
  private skySystem!: SkySystem;
  private playerController!: PlayerController;
  private creatureSystem!: CreatureSystem;
  private physicsSync!: PhysicsSync;
  private audioSystem!: AudioSystem;
  private uiOverlay!: UIOverlay;
  private minimap!: Minimap;
  private welcomeScroll!: WelcomeScroll;

  private playerBody: any = null;
  private playerMesh!: THREE.Mesh;
  private playerPosition = new THREE.Vector3(0, 50, 0);
  private playerRotation = 0;
  private initialized = false;
  private gameTime = 0;
  private footstepTimer = 0;
  private readonly FOOTSTEP_INTERVAL = 0.4;
  private wasMoving = false;
  private gameStarted = false;
  private lastTreeGenPos = new THREE.Vector3();
  private readonly TREE_REGEN_DISTANCE = 200;

  async start(): Promise<void> {
    console.log("[Game] Starting...");
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const htmlLoading = document.getElementById("loading");
    if (htmlLoading) htmlLoading.style.display = "none";

    const startScreen = new StartScreen();
    console.log("[Game] Waiting for click...");
    await startScreen.waitForClick();
    console.log("[Game] Click received, initializing...");

    this.engine = new Engine(canvas);
    console.log("[Game] Engine created");

    await this.engine.initialize();
    console.log("[Game] Engine initialized");

    this.gameState = new GameStateManager();
    this.gameState.showLoadingScreen();
    console.log("[Game] Loading screen shown");

    this.chunkManager = new ChunkManager(
      this.engine.scene,
      this.engine.rapiWorld!,
    );
    this.waterSystem = new WaterSystem(this.engine.scene);
    this.waterSystem.initialize();
    this.vegetationSystem = new VegetationSystem(
      this.engine.scene,
      (x, z) => this.chunkManager.getHeightAt(x, z),
      (x, z) => this.chunkManager.getSlopeAt(x, z),
      (x, z) => this.chunkManager.getBiomeAt(x, z),
    );
    this.treeSystem = new TreeSystem(this.engine.scene, (x, z) =>
      this.chunkManager.getHeightAt(x, z),
    );
    this.skySystem = new SkySystem(this.engine.scene);
    this.physicsSync = new PhysicsSync();
    this.audioSystem = new AudioSystem();
    this.audioSystem.initialize();
    this.uiOverlay = new UIOverlay();
    this.minimap = new Minimap((x, z) => this.chunkManager.getHeightAt(x, z));
    this.welcomeScroll = new WelcomeScroll();
    this.creatureSystem = new CreatureSystem(this.engine.scene, (x, z) =>
      this.chunkManager.getHeightAt(x, z),
    );
    console.log("[Game] Systems created");

    this.setupPlayer();
    this.vegetationSystem.initialize();
    console.log("[Game] Player and vegetation set up");

    this.playerController = new PlayerController(
      this.engine.camera,
      this.chunkManager,
      this.engine.input,
      this.engine.rapiWorld!,
    );
    this.playerController.initialize(this.playerBody, this.playerMesh);

    this.gameState.setLoadingProgress(0.2);

    console.log("[Game] Loading initial chunks...");
    await this.chunkManager.loadInitialChunks(0, 0);
    console.log("[Game] Chunks loaded");

    this.gameState.setLoadingProgress(0.6);

    const spawnHeight = this.chunkManager.getHeightAt(64, 64);
    const spawnPos = new THREE.Vector3(64, spawnHeight + 3, 64);
    console.log("[Game] Spawn position:", spawnPos);

    if (this.playerBody) {
      this.playerBody.setTranslation(
        { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
        true,
      );
      this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.playerBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    this.playerController.setInitialPosition(spawnPos);
    this.playerPosition.copy(spawnPos);
    this.lastTreeGenPos.copy(spawnPos);

    this.gameState.setLoadingProgress(0.8);

    console.log("[Game] Generating trees...");
    this.treeSystem.generate(spawnPos.x, spawnPos.z, 500);
    console.log("[Game] Trees generated");

    console.log("[Game] Spawning creatures...");
    this.creatureSystem.spawnInitial(spawnPos);
    console.log("[Game] Creatures spawned");

    this.gameState.setLoadingProgress(1.0);

    this.initialized = true;
    console.log("[Game] Initialization complete!");

    setTimeout(() => {
      this.gameState.hideLoadingScreen();
      this.gameState.setState("playing");
      console.log("[Game] State set to playing");

      this.engine.start();

      this.engine.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0015);
      this.engine.scene.background = new THREE.Color(0x87ceeb);

      this.engine.renderer.compile(this.engine.scene, this.engine.camera);
      console.log("[Game] Renderer warmed up");

      this.showWelcomeAndStart();
    }, 500);
  }

  private async showWelcomeAndStart(): Promise<void> {
    await this.welcomeScroll.show();
    console.log("[Game] Welcome scroll dismissed");

    this.gameStarted = true;

    const hint = document.getElementById("controls-hint");
    if (hint) {
      hint.classList.add("visible");
      setTimeout(() => hint.classList.remove("visible"), 8000);
    }
  }

  private setupPlayer(): void {
    if (!this.engine.rapiWorld) return;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(
        this.playerPosition.x,
        this.playerPosition.y,
        this.playerPosition.z,
      )
      .lockRotations();
    this.playerBody = this.engine.rapiWorld.createRigidBody(bodyDesc);

    const colliderDesc = ColliderFactory.createPlayerCollider(
      1.8 / 2 - 0.3,
      0.3,
    );
    this.engine.rapiWorld.createCollider(colliderDesc, this.playerBody);

    const playerGeo = new THREE.CapsuleGeometry(0.3, 1.8 - 0.6, 8, 16);
    const playerMat = new THREE.MeshStandardMaterial({
      color: 0x4a9eff,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this.playerMesh.castShadow = true;
    this.playerMesh.name = "player";
    this.engine.scene.add(this.playerMesh);

    this.physicsSync.register(this.playerMesh, this.playerBody);
  }

  update(): void {
    if (!this.initialized) return;

    const deltaTime = 1 / 60;
    const clampedDelta = Math.min(deltaTime, 0.1);

    this.gameTime += clampedDelta;

    this.skySystem.update(clampedDelta);

    this.chunkManager.update(this.playerPosition);

    if (this.gameState.isPlaying()) {
      if (this.engine.rapiWorld) {
        this.engine.rapiWorld.step();
      }

      if (this.gameStarted) {
        this.playerController.fixedUpdate(clampedDelta);
        this.playerController.update(clampedDelta);
        this.playerPosition.copy(this.playerController.getPosition());
      }

      this.physicsSync.update();

      if (this.gameStarted) {
        const isMoving = this.isPlayerMoving();
        if (isMoving) {
          this.footstepTimer += clampedDelta;
          if (this.footstepTimer >= this.FOOTSTEP_INTERVAL) {
            this.audioSystem.playFootstep("grass");
            this.footstepTimer = 0;
          }
          this.wasMoving = true;
        } else {
          this.wasMoving = false;
          this.footstepTimer = 0;
        }

        if (
          this.playerPosition.distanceTo(this.lastTreeGenPos) >
          this.TREE_REGEN_DISTANCE
        ) {
          console.log("[Game] Regenerating trees at new position...");
          this.treeSystem.generate(
            this.playerPosition.x,
            this.playerPosition.z,
            500,
          );
          this.lastTreeGenPos.copy(this.playerPosition);
        }
      }

      this.vegetationSystem.update(this.playerPosition, this.gameTime);
      this.waterSystem.update(clampedDelta, this.engine.camera.position);
      this.creatureSystem.update(clampedDelta, this.playerPosition);

      const inWater = this.waterSystem.isInWater(this.playerPosition);
      this.audioSystem.update(
        {
          x: this.playerPosition.x,
          y: this.playerPosition.y,
          z: this.playerPosition.z,
        },
        inWater,
      );

      const sunDir = this.skySystem.getSunDirection();
      const sunLight = this.engine.scene.userData
        .sunLight as THREE.DirectionalLight;
      if (sunLight) {
        sunLight.position.copy(sunDir).multiplyScalar(100);
      }
      this.waterSystem.setSunDirection(sunDir);

      this.updateUI();
    }
  }

  private isPlayerMoving(): boolean {
    return (
      this.engine.input.isKeyDown("KeyW") ||
      this.engine.input.isKeyDown("KeyS") ||
      this.engine.input.isKeyDown("KeyA") ||
      this.engine.input.isKeyDown("KeyD")
    );
  }

  private updateUI(): void {
    const stats = this.engine.getStats();
    this.uiOverlay.update(this.playerRotation, stats);

    if (this.minimap) {
      this.minimap.update(
        1 / 60,
        this.playerPosition,
        this.playerRotation,
        this.creatureSystem.getAllNPCPositions(),
      );
    }
  }
}

window.addEventListener("error", (e) => {
  console.error("[Global Error]", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[Unhandled Promise Rejection]", e.reason);
});

const game = new Game();
game.start().catch((err) => {
  console.error("[Game Start Error]", err);
});

function gameLoop() {
  game.update();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
