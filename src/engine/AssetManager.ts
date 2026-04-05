import * as THREE from "three";

export class AssetManager {
  private geometries: Map<string, THREE.BufferGeometry> = new Map();
  private materials: Map<string, THREE.Material> = new Map();

  getGeometry(key: string): THREE.BufferGeometry | undefined {
    return this.geometries.get(key);
  }

  setGeometry(key: string, geometry: THREE.BufferGeometry): void {
    this.geometries.set(key, geometry);
  }

  getMaterial(key: string): THREE.Material | undefined {
    return this.materials.get(key);
  }

  setMaterial(key: string, material: THREE.Material): void {
    this.materials.set(key, material);
  }

  dispose(): void {
    for (const geo of this.geometries.values()) {
      geo.dispose();
    }
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.geometries.clear();
    this.materials.clear();
  }
}
