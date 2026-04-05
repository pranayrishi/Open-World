import * as THREE from "three";
import { Clock } from "./Clock.js";
import { InputManager } from "./InputManager.js";
import { World, System } from "./ECS.js";
import RAPIER from "@dimforge/rapier3d-compat";

export class Engine {
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  public scene: THREE.Scene;
  public clock: Clock;
  public input: InputManager;
  public world: World;
  public rapiWorld: RAPIER.World | null = null;

  private canvas: HTMLCanvasElement;
  private systems: System[] = [];
  private accumulator = 0;
  private readonly FIXED_STEP = 1 / 60;
  private readonly MAX_SUBSTEPS = 3;
  private lastTime = 0;
  private running = false;

  private stats = {
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new Clock();
    this.input = new InputManager(canvas);
    this.world = new World();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(1);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      800,
    );
    this.camera.position.set(0, 10, 20);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0015);
    this.scene.background = new THREE.Color(0x87ceeb);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) {
        obj.frustumCulled = false;
      }
    });

    this.addAmbientLight();
    this.addDirectionalLight();
    this.setupResizeHandler();

    this.stats.lastFpsUpdate = performance.now();
  }

  private addAmbientLight(): void {
    const ambient = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.3);
    this.scene.add(hemi);
  }

  private addDirectionalLight(): void {
    const sun = new THREE.DirectionalLight(0xfffaf0, 1.0);
    sun.position.set(100, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);
    this.scene.userData.sunLight = sun;
  }

  private setupResizeHandler(): void {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    onResize();
  }

  async initialize(): Promise<void> {
    await RAPIER.init();
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.rapiWorld = new RAPIER.World(gravity);
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private loop = (): void => {
    if (!this.running) return;

    requestAnimationFrame(this.loop);

    const now = performance.now() / 1000;
    let deltaTime = now - this.lastTime;
    this.lastTime = now;

    deltaTime = Math.min(deltaTime, 0.1);
    if (this.stats.frameCount === 0) {
      deltaTime = 0.016;
    }

    this.accumulator += deltaTime;

    let substeps = 0;
    while (
      this.accumulator >= this.FIXED_STEP &&
      substeps < this.MAX_SUBSTEPS
    ) {
      this.fixedUpdate(this.FIXED_STEP);
      this.accumulator -= this.FIXED_STEP;
      substeps++;
    }

    if (substeps >= this.MAX_SUBSTEPS) {
      this.accumulator = this.accumulator % this.FIXED_STEP;
    }

    this.variableUpdate(deltaTime);

    try {
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error("Render error caught:", error);
      this.validateAndFixScene();
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (e2) {
        console.error("Render still failing after cleanup:", e2);
      }
    }

    this.updateStats(deltaTime);
    this.input.clearFrameState();
  };

  private validateAndFixScene(): void {
    const toRemove: THREE.Object3D[] = [];

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) {
        const geo = obj.geometry;

        if (
          !geo ||
          !geo.attributes.position ||
          !geo.attributes.skinIndex ||
          !geo.attributes.skinWeight
        ) {
          console.warn("Removing broken SkinnedMesh:", obj.name || obj.uuid);
          toRemove.push(obj);
          return;
        }

        obj.frustumCulled = false;
        return;
      }

      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        const geo = obj.geometry;

        if (!geo) {
          console.error("Hiding mesh with no geometry:", obj.name || obj.uuid);
          toRemove.push(obj);
          return;
        }

        if (!geo.attributes.position) {
          console.error(
            "Hiding mesh with no position attribute:",
            obj.name || obj.uuid,
          );
          toRemove.push(obj);
          return;
        }

        const posAttr = geo.attributes.position;
        if (!posAttr.array || posAttr.array.length === 0) {
          console.error(
            "Hiding mesh with empty position array:",
            obj.name || obj.uuid,
          );
          toRemove.push(obj);
          return;
        }

        const posArr = posAttr.array;
        for (let i = 0; i < Math.min(posArr.length, 30); i++) {
          if (isNaN(posArr[i] as number)) {
            console.error(
              "Hiding mesh with NaN in positions:",
              obj.name || obj.uuid,
            );
            toRemove.push(obj);
            return;
          }
        }

        if (obj instanceof THREE.InstancedMesh) {
          if (!obj.instanceMatrix || !obj.instanceMatrix.array) {
            console.error(
              "Hiding InstancedMesh with no instanceMatrix:",
              obj.name || obj.uuid,
            );
            toRemove.push(obj);
            return;
          }

          const instArr = obj.instanceMatrix.array;
          for (let i = 0; i < Math.min(instArr.length, 64); i++) {
            if (isNaN(instArr[i])) {
              console.error(
                "Hiding InstancedMesh with NaN in instanceMatrix:",
                obj.name || obj.uuid,
              );
              toRemove.push(obj);
              return;
            }
          }
        }
      }
    });

    for (const obj of toRemove) {
      obj.visible = false;
    }
  }

  private fixedUpdate(dt: number): void {
    for (const system of this.systems) {
      system.update(dt);
    }
  }

  private variableUpdate(dt: number): void {}

  private updateStats(dt: number): void {
    this.stats.frameCount++;
    const now = performance.now();
    if (now - this.stats.lastFpsUpdate >= 1000) {
      this.stats.fps = this.stats.frameCount;
      this.stats.frameCount = 0;
      this.stats.lastFpsUpdate = now;
    }

    this.stats.drawCalls = this.renderer.info.render.calls;
    this.stats.triangles = this.renderer.info.render.triangles;
  }

  getStats(): typeof this.stats {
    return this.stats;
  }
}
