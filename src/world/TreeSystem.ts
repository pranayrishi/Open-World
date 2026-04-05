import * as THREE from "three";
import { WATER_LEVEL, seededNoise2D, getBiomeNoise } from "./Noise.js";

export class TreeSystem {
  private scene: THREE.Scene;
  private heightFn: (x: number, z: number) => number;

  private trunkInstances: THREE.InstancedMesh[] = [];
  private canopyInstances: THREE.InstancedMesh[] = [];

  private readonly _dummy = new THREE.Object3D();
  private readonly _color = new THREE.Color();

  constructor(scene: THREE.Scene, heightFn: (x: number, z: number) => number) {
    this.scene = scene;
    this.heightFn = heightFn;
  }

  generate(centerX: number, centerZ: number, radius: number = 500): void {
    this.dispose();

    const deciduousTrees: Array<{
      x: number;
      y: number;
      z: number;
      scale: number;
    }> = [];
    const pineTrees: Array<{
      x: number;
      y: number;
      z: number;
      scale: number;
    }> = [];

    const spacing = 8;
    const halfRadius = radius / 2;

    for (let gx = -halfRadius; gx < halfRadius; gx += spacing) {
      for (let gz = -halfRadius; gz < halfRadius; gz += spacing) {
        const worldX =
          centerX +
          gx +
          seededNoise2D(gx * 0.1, gz * 0.1, 1234) * spacing * 0.8;
        const worldZ =
          centerZ +
          gz +
          seededNoise2D(gx * 0.1, gz * 0.1, 5678) * spacing * 0.8;
        const height = this.heightFn(worldX, worldZ);

        if (height < WATER_LEVEL + 2) continue;

        const hRight = this.heightFn(worldX + 1, worldZ);
        const hForward = this.heightFn(worldX, worldZ + 1);
        const slope = Math.abs(hRight - height) + Math.abs(hForward - height);
        if (slope > 1.0) continue;

        const biomeNoise = getBiomeNoise(worldX, worldZ);

        if (biomeNoise > -0.25 && biomeNoise <= 0.3) {
          const density = seededNoise2D(worldX * 0.02, worldZ * 0.02, 1111);
          if (density < 0.1) continue;

          const scale =
            0.7 + seededNoise2D(worldX * 0.5, worldZ * 0.5, 2222) * 0.6;
          deciduousTrees.push({
            x: worldX,
            y: height,
            z: worldZ,
            scale,
          });
        } else if (
          biomeNoise > 0.3 &&
          height < 55 &&
          height > WATER_LEVEL + 3
        ) {
          const density = seededNoise2D(worldX * 0.015, worldZ * 0.015, 3333);
          if (density < 0.2) continue;

          const scale =
            0.6 + seededNoise2D(worldX * 0.5, worldZ * 0.5, 4444) * 0.5;
          pineTrees.push({ x: worldX, y: height, z: worldZ, scale });
        }
      }
    }

    if (deciduousTrees.length > 0) {
      this.buildDeciduousTrees(deciduousTrees);
    }

    if (pineTrees.length > 0) {
      this.buildPineTrees(pineTrees);
    }

    console.log(
      `Trees generated: ${deciduousTrees.length} deciduous, ${pineTrees.length} pine`,
    );
  }

  private buildDeciduousTrees(
    positions: Array<{ x: number; y: number; z: number; scale: number }>,
  ): void {
    const count = positions.length;

    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.15, 2.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: "#5C4033",
      roughness: 0.95,
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunks.castShadow = true;
    trunks.receiveShadow = false;

    const canopyGeo = new THREE.DodecahedronGeometry(1.5, 1);
    const canopyPos = canopyGeo.attributes.position;
    for (let i = 0; i < canopyPos.count; i++) {
      const x = canopyPos.getX(i);
      const y = canopyPos.getY(i);
      const z = canopyPos.getZ(i);
      const noise = Math.sin(x * 3) * Math.cos(z * 3) * 0.15;
      canopyPos.setXYZ(i, x + noise, y + noise * 0.5, z + noise);
    }
    canopyGeo.computeVertexNormals();

    const canopyMat = new THREE.MeshStandardMaterial({
      color: "#2D5A27",
      roughness: 0.85,
    });

    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, count);
    canopies.castShadow = true;
    canopies.receiveShadow = false;

    for (let i = 0; i < count; i++) {
      const p = positions[i];

      this._dummy.position.set(p.x, p.y + 1.25 * p.scale, p.z);
      this._dummy.rotation.set(
        0,
        seededNoise2D(p.x, p.z, 7777) * Math.PI * 2,
        0,
      );
      this._dummy.scale.set(p.scale, p.scale, p.scale);
      this._dummy.updateMatrix();
      trunks.setMatrixAt(i, this._dummy.matrix);

      this._dummy.position.set(p.x, p.y + 3.2 * p.scale, p.z);
      this._dummy.scale.set(
        p.scale * (0.8 + seededNoise2D(p.x * 0.3, p.z * 0.3, 8888) * 0.4),
        p.scale * (0.7 + seededNoise2D(p.x * 0.3, p.z * 0.3, 9999) * 0.3),
        p.scale * (0.8 + seededNoise2D(p.x * 0.3, p.z * 0.3, 1010) * 0.4),
      );
      this._dummy.updateMatrix();
      canopies.setMatrixAt(i, this._dummy.matrix);

      const greenVar = 0.15 + seededNoise2D(p.x, p.z, 1212) * 0.1;
      this._color.setRGB(
        0.15 + greenVar * 0.3,
        0.3 + greenVar,
        0.1 + greenVar * 0.2,
      );
      canopies.setColorAt(i, this._color);
    }

    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;

    this.scene.add(trunks);
    this.scene.add(canopies);
    this.trunkInstances.push(trunks);
    this.canopyInstances.push(canopies);
  }

  private buildPineTrees(
    positions: Array<{ x: number; y: number; z: number; scale: number }>,
  ): void {
    const count = positions.length;

    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 3.0, 5);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: "#4A3728",
      roughness: 0.95,
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunks.castShadow = true;

    const coneGeo = new THREE.ConeGeometry(1.2, 2.0, 7);
    const coneMat = new THREE.MeshStandardMaterial({
      color: "#1B4D2E",
      roughness: 0.9,
    });

    const coneLayers: THREE.InstancedMesh[] = [];
    for (let layer = 0; layer < 3; layer++) {
      const cones = new THREE.InstancedMesh(coneGeo, coneMat, count);
      cones.castShadow = true;
      coneLayers.push(cones);
    }

    for (let i = 0; i < count; i++) {
      const p = positions[i];

      this._dummy.position.set(p.x, p.y + 1.5 * p.scale, p.z);
      this._dummy.rotation.set(
        0,
        seededNoise2D(p.x, p.z, 5555) * Math.PI * 2,
        0,
      );
      this._dummy.scale.set(p.scale, p.scale, p.scale);
      this._dummy.updateMatrix();
      trunks.setMatrixAt(i, this._dummy.matrix);

      for (let layer = 0; layer < 3; layer++) {
        const layerY = p.y + (2.0 + layer * 1.3) * p.scale;
        const layerScale = p.scale * (1.0 - layer * 0.25);

        this._dummy.position.set(p.x, layerY, p.z);
        this._dummy.scale.set(layerScale, layerScale * 0.8, layerScale);
        this._dummy.updateMatrix();
        coneLayers[layer].setMatrixAt(i, this._dummy.matrix);

        const darkness = 1.0 - layer * 0.1;
        this._color.setRGB(0.1 * darkness, 0.3 * darkness, 0.18 * darkness);
        coneLayers[layer].setColorAt(i, this._color);
      }
    }

    trunks.instanceMatrix.needsUpdate = true;
    this.scene.add(trunks);
    this.trunkInstances.push(trunks);

    for (const cones of coneLayers) {
      cones.instanceMatrix.needsUpdate = true;
      if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
      this.scene.add(cones);
      this.canopyInstances.push(cones);
    }
  }

  dispose(): void {
    for (const mesh of [...this.trunkInstances, ...this.canopyInstances]) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.trunkInstances = [];
    this.canopyInstances = [];
  }
}
