import * as THREE from "three";

export interface VegetationInstance {
  position: THREE.Vector3;
  scale: number;
  rotation: number;
  type: "tree" | "rock" | "bush";
  variant: number;
}

export class VegetationSystem {
  private scene: THREE.Scene;
  private heightFn: (x: number, z: number) => number;
  private slopeFn: (x: number, z: number) => number;
  private biomeFn: (
    x: number,
    z: number,
  ) => { biome: string; blendFactor: number };
  private trees: THREE.InstancedMesh[] = [];
  private rocks: THREE.InstancedMesh[] = [];
  private grass: THREE.Mesh | null = null;
  private grassGeometry!: THREE.BufferGeometry;
  private grassMaterial!: THREE.ShaderMaterial;
  private instances: Map<string, VegetationInstance[]> = new Map();
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private readonly TREE_RENDER_DISTANCE = 150;
  private readonly GRASS_RENDER_DISTANCE = 40;
  private maxGrassBlades = 15000;
  private initialized = false;
  private lastChunkKey = "";
  private lastGrassChunkKey = "";

  private readonly _dummyMatrix = new THREE.Matrix4();
  private readonly _dummyPosition = new THREE.Vector3();
  private readonly _dummyQuaternion = new THREE.Quaternion();
  private readonly _dummyScale = new THREE.Vector3();
  private readonly _matrix = new THREE.Matrix4();
  private readonly _position = new THREE.Vector3();
  private readonly _quaternion = new THREE.Quaternion();
  private readonly _scale = new THREE.Vector3();
  private readonly _euler = new THREE.Euler();

  constructor(
    scene: THREE.Scene,
    heightFn: (x: number, z: number) => number,
    slopeFn?: (x: number, z: number) => number,
    biomeFn?: (x: number, z: number) => { biome: string; blendFactor: number },
  ) {
    this.scene = scene;
    this.heightFn = heightFn;
    this.slopeFn = slopeFn || ((x, z) => 0);
    this.biomeFn = biomeFn || ((x, z) => ({ biome: "forest", blendFactor: 0 }));
    this.createGrassGeometry();
    this.createGrassMaterial();
  }

  private createGrassGeometry(): void {
    const bladeWidth = 0.04;
    const bladeHeight = 0.4;

    const vertices = new Float32Array([
      -bladeWidth / 2,
      0,
      0,
      bladeWidth / 2,
      0,
      0,
      -bladeWidth / 4,
      bladeHeight * 0.6,
      0,
      bladeWidth / 4,
      bladeHeight * 0.6,
      0,
      0,
      bladeHeight,
      0,
    ]);

    const indices = [0, 1, 2, 2, 1, 3, 2, 3, 4];

    this.grassGeometry = new THREE.BufferGeometry();
    this.grassGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3),
    );
    this.grassGeometry.setIndex(indices);
  }

  private createGrassMaterial(): void {
    this.grassMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float u_time;
        uniform vec3 u_playerPosition;
        attribute vec3 aOffset;
        attribute float aScale;
        attribute float aRotation;
        varying vec2 v_uv;
        varying float v_height;
        
        void main() {
          v_uv = uv;
          v_height = position.y;
          
          float dist = distance(aOffset.xz, u_playerPosition.xz);
          if (dist > 40.0) {
            gl_Position = vec4(10000.0, 10000.0, 10000.0, 1.0);
            return;
          }
          
          float hash = fract(sin(dot(aOffset.xz, vec2(12.9898, 78.233))) * 43758.5453);
          float keepThreshold = 1.0 - smoothstep(20.0, 40.0, dist);
          if (hash > keepThreshold) {
            gl_Position = vec4(10000.0, 10000.0, 10000.0, 1.0);
            return;
          }
          
          vec3 pos = position;
          float c = cos(aRotation);
          float s = sin(aRotation);
          pos.xz = vec2(pos.x * c - pos.z * s, pos.x * s + pos.z * c);
          pos.y *= aScale;
          
          float windStrength = 0.15 * (1.0 - smoothstep(20.0, 40.0, dist));
          float windX = sin(u_time * 2.0 + aOffset.x * 0.5 + aOffset.z * 0.3) * windStrength;
          float windZ = cos(u_time * 1.5 + aOffset.z * 0.5) * windStrength * 0.5;
          float heightFactor = smoothstep(0.0, 0.5, pos.y / aScale);
          pos.x += windX * heightFactor * heightFactor;
          pos.z += windZ * heightFactor * heightFactor;
          
          vec3 worldPos = pos + aOffset;
          vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 u_baseColor;
        uniform vec3 u_tipColor;
        varying vec2 v_uv;
        varying float v_height;
        
        void main() {
          float gradient = smoothstep(0.0, 0.4, v_height);
          vec3 color = mix(u_baseColor, u_tipColor, gradient);
          float ao = smoothstep(0.0, 0.15, v_height);
          color *= 0.7 + ao * 0.3;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        u_time: { value: 0 },
        u_playerPosition: { value: new THREE.Vector3() },
        u_baseColor: { value: new THREE.Color(0.25, 0.45, 0.15) },
        u_tipColor: { value: new THREE.Color(0.4, 0.65, 0.2) },
      },
      side: THREE.DoubleSide,
    });
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.createTrees();
    this.createRocks();
    this.createGrass();
  }

  private createTrees(): void {
    const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.2, 1, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3520,
      roughness: 0.9,
    });

    const canopyGeometry = new THREE.IcosahedronGeometry(1, 1);
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.8,
    });

    const trunkInstances = new THREE.InstancedMesh(
      trunkGeometry,
      trunkMaterial,
      800,
    );
    const canopyInstances = new THREE.InstancedMesh(
      canopyGeometry,
      canopyMaterial,
      800,
    );

    trunkInstances.castShadow = true;
    canopyInstances.castShadow = true;

    const dummy = new THREE.Object3D();
    dummy.position.set(0, -9999, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < 800; i++) {
      trunkInstances.setMatrixAt(i, dummy.matrix);
      canopyInstances.setMatrixAt(i, dummy.matrix);
    }
    trunkInstances.instanceMatrix.needsUpdate = true;
    canopyInstances.instanceMatrix.needsUpdate = true;
    trunkInstances.count = 0;
    canopyInstances.count = 0;

    this.trees.push(trunkInstances, canopyInstances);
    this.scene.add(trunkInstances, canopyInstances);
  }

  private createRocks(): void {
    const rockGeometry = new THREE.IcosahedronGeometry(0.5, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.95,
      metalness: 0.0,
    });

    const rockInstances = new THREE.InstancedMesh(
      rockGeometry,
      rockMaterial,
      2000,
    );
    rockInstances.castShadow = true;
    rockInstances.receiveShadow = true;

    const dummy = new THREE.Object3D();
    dummy.position.set(0, -9999, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < 2000; i++) {
      rockInstances.setMatrixAt(i, dummy.matrix);
    }
    rockInstances.instanceMatrix.needsUpdate = true;
    rockInstances.count = 0;

    this.rocks.push(rockInstances);
    this.scene.add(rockInstances);
  }

  private createGrass(): void {
    const grassInstanced = new THREE.InstancedBufferGeometry();
    grassInstanced.index = this.grassGeometry.index;
    grassInstanced.attributes.position = this.grassGeometry.attributes.position;

    const offsets = new Float32Array(this.maxGrassBlades * 3);
    const scales = new Float32Array(this.maxGrassBlades);
    const rotations = new Float32Array(this.maxGrassBlades);

    for (let i = 0; i < this.maxGrassBlades; i++) {
      offsets[i * 3] = (Math.random() - 0.5) * 100;
      offsets[i * 3 + 1] = 0;
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 100;
      scales[i] = 0.4 + Math.random() * 0.6;
      rotations[i] = Math.random() * Math.PI * 2;
    }

    grassInstanced.setAttribute(
      "aOffset",
      new THREE.InstancedBufferAttribute(offsets, 3),
    );
    grassInstanced.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scales, 1),
    );
    grassInstanced.setAttribute(
      "aRotation",
      new THREE.InstancedBufferAttribute(rotations, 1),
    );

    this.grass = new THREE.Mesh(grassInstanced, this.grassMaterial);
    this.grass.frustumCulled = false;
    this.scene.add(this.grass);
  }

  update(playerPosition: THREE.Vector3, time: number): void {
    this.playerPosition.copy(playerPosition);
    this.grassMaterial.uniforms.u_time.value = time;
    this.grassMaterial.uniforms.u_playerPosition.value.copy(playerPosition);

    const chunkX = Math.floor(playerPosition.x / 128);
    const chunkZ = Math.floor(playerPosition.z / 128);
    const chunkKey = `${chunkX},${chunkZ}`;

    if (chunkKey !== this.lastChunkKey) {
      this.lastChunkKey = chunkKey;
      this.updateVegetationPlacement();
    }

    if (chunkKey !== this.lastGrassChunkKey) {
      this.lastGrassChunkKey = chunkKey;
      this.updateGrassPlacement();
    }
  }

  private updateGrassPlacement(): void {
    if (!this.grass) return;

    const grassGeo = this.grass.geometry as THREE.InstancedBufferGeometry;
    const offsetAttr = grassGeo.getAttribute(
      "aOffset",
    ) as THREE.InstancedBufferAttribute;
    const scaleAttr = grassGeo.getAttribute(
      "aScale",
    ) as THREE.InstancedBufferAttribute;
    const rotationAttr = grassGeo.getAttribute(
      "aRotation",
    ) as THREE.InstancedBufferAttribute;

    const grassPerChunk = Math.floor(this.maxGrassBlades / 9);
    const chunkX = Math.floor(this.playerPosition.x / 128);
    const chunkZ = Math.floor(this.playerPosition.z / 128);

    let grassIndex = 0;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cX = chunkX + dx;
        const cZ = chunkZ + dz;
        const worldOffsetX = cX * 128;
        const worldOffsetZ = cZ * 128;

        for (let i = 0; i < grassPerChunk; i++) {
          if (grassIndex >= this.maxGrassBlades) break;

          const localX = Math.random() * 128;
          const localZ = Math.random() * 128;
          const worldX = worldOffsetX + localX;
          const worldZ = worldOffsetZ + localZ;

          const terrainY = this.heightFn(worldX, worldZ);
          const slope = this.slopeFn(worldX, worldZ);

          if (slope > 0.6 || terrainY < 1.0) {
            offsetAttr.setXYZ(grassIndex, worldX, -1000, worldZ);
          } else {
            offsetAttr.setXYZ(grassIndex, worldX, terrainY, worldZ);
          }
          scaleAttr.setX(grassIndex, 0.4 + Math.random() * 0.6);
          rotationAttr.setX(grassIndex, Math.random() * Math.PI * 2);
          grassIndex++;
        }
      }
    }

    for (let i = grassIndex; i < this.maxGrassBlades; i++) {
      offsetAttr.setXYZ(i, 0, -1000, 0);
    }

    offsetAttr.needsUpdate = true;
    scaleAttr.needsUpdate = true;
    rotationAttr.needsUpdate = true;
  }

  private updateVegetationPlacement(): void {
    const instances: VegetationInstance[] = [];

    for (let i = 0; i < 800; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * this.TREE_RENDER_DISTANCE;
      const worldX = this.playerPosition.x + Math.cos(angle) * dist;
      const worldZ = this.playerPosition.z + Math.sin(angle) * dist;

      const height = this.heightFn(worldX, worldZ);
      const { biome } = this.biomeFn(worldX, worldZ);
      const slope = this.slopeFn(worldX, worldZ);

      if (slope > 0.4 || height < -5 || height > 150) continue;

      const hash = this.hash(worldX * 1000 + worldZ);

      if (this.shouldPlaceTree(hash, biome)) {
        instances.push({
          position: new THREE.Vector3(worldX, height, worldZ),
          scale: 3 + hash * 4,
          rotation: hash * Math.PI * 2,
          type: "tree",
          variant: Math.floor(hash * 3),
        });
      }

      if (hash > 0.65) {
        instances.push({
          position: new THREE.Vector3(worldX, height, worldZ),
          scale: 0.4 + hash * 1.0,
          rotation: hash * Math.PI * 2,
          type: "rock",
          variant: 0,
        });
      }
    }

    this.instances.set(this.lastChunkKey, instances);
    this.updateInstancedMeshes();
  }

  private shouldPlaceTree(hash: number, biome: string): boolean {
    switch (biome) {
      case "forest":
        return hash > 0.5;
      case "desert":
        return hash > 0.95;
      case "snow":
        return hash > 0.9 && this.playerPosition.y < 120;
    }
    return false;
  }

  private updateInstancedMeshes(): void {
    let treeIndex = 0;
    let rockIndex = 0;

    for (const instances of this.instances.values()) {
      for (const inst of instances) {
        if (inst.type === "tree" && treeIndex < 800) {
          this._position.copy(inst.position);
          this._position.y += inst.scale * 0.5;
          this._quaternion.setFromEuler(this._euler);
          this._euler.set(0, inst.rotation, 0);
          this._scale.setScalar(inst.scale);
          this._matrix.compose(this._position, this._quaternion, this._scale);
          this.trees[0].setMatrixAt(treeIndex, this._matrix);

          this._position.y += inst.scale;
          this._scale.setScalar(inst.scale * 1.1);
          this._matrix.compose(this._position, this._quaternion, this._scale);
          this.trees[1].setMatrixAt(treeIndex, this._matrix);

          treeIndex++;
        } else if (inst.type === "rock" && rockIndex < 2000) {
          this._position.copy(inst.position);
          this._euler.set(
            inst.rotation,
            inst.rotation * 2,
            inst.rotation * 0.5,
          );
          this._quaternion.setFromEuler(this._euler);
          this._scale.setScalar(inst.scale);
          this._matrix.compose(this._position, this._quaternion, this._scale);
          this.rocks[0].setMatrixAt(rockIndex, this._matrix);
          rockIndex++;
        }
      }
    }

    this._dummyScale.setScalar(0);
    for (let i = treeIndex; i < 800; i++) {
      this._dummyMatrix.makeScale(0, 0, 0);
      this.trees[0].setMatrixAt(i, this._dummyMatrix);
      this.trees[1].setMatrixAt(i, this._dummyMatrix);
    }

    for (let i = rockIndex; i < 2000; i++) {
      this._dummyMatrix.makeScale(0, 0, 0);
      this.rocks[0].setMatrixAt(i, this._dummyMatrix);
    }

    this.trees[0].instanceMatrix.needsUpdate = true;
    this.trees[1].instanceMatrix.needsUpdate = true;
    this.rocks[0].instanceMatrix.needsUpdate = true;
  }

  private hash(n: number): number {
    n = (n << 13) ^ n;
    return (
      ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff
    );
  }

  dispose(): void {
    for (const tree of this.trees) {
      this.scene.remove(tree);
      tree.geometry.dispose();
      (tree.material as THREE.Material).dispose();
    }

    for (const rock of this.rocks) {
      this.scene.remove(rock);
      rock.geometry.dispose();
      (rock.material as THREE.Material).dispose();
    }

    if (this.grass) {
      this.scene.remove(this.grass);
      this.grass.geometry.dispose();
    }

    this.grassGeometry.dispose();
    this.grassMaterial.dispose();
    this.instances.clear();
  }
}
