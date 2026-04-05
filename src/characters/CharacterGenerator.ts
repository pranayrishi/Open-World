import * as THREE from "three";

export class CharacterGenerator {
  private bones: Map<string, THREE.Bone> = new Map();
  private skeleton!: THREE.Skeleton;
  private geometry!: THREE.BufferGeometry;
  private skinMaterial!: THREE.MeshStandardMaterial;
  private clothesMaterial!: THREE.MeshStandardMaterial;

  constructor() {
    this.createMaterials();
  }

  private createMaterials(): void {
    this.skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xdeb887,
      roughness: 0.8,
      metalness: 0.0,
    });

    this.clothesMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b7dd8,
      roughness: 0.9,
      metalness: 0.0,
    });
  }

  generateCharacter(appearance?: {
    height?: number;
    width?: number;
    skinTone?: string;
    shirtColor?: string;
    pantsColor?: string;
  }): THREE.SkinnedMesh {
    const variant = {
      height: appearance?.height ?? 1.0,
      width: appearance?.width ?? 1.0,
      skinTone: appearance?.skinTone ?? "#DEB887",
      shirtColor: appearance?.shirtColor ?? "#3B7DD8",
      pantsColor: appearance?.pantsColor ?? "#4A4A4A",
    };

    this.createSkeleton();
    this.createGeometry(variant);

    const materials = [this.skinMaterial.clone(), this.clothesMaterial.clone()];

    (materials[0] as THREE.MeshStandardMaterial).color.set(variant.skinTone);
    (materials[1] as THREE.MeshStandardMaterial).color.set(variant.shirtColor);

    const mesh = new THREE.SkinnedMesh(this.geometry, materials);
    mesh.frustumCulled = false;

    const rootBone = this.bones.get("root")!;
    mesh.add(rootBone);
    mesh.bind(this.skeleton);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = "skinnedCharacter";

    return mesh;
  }

  private createSkeleton(): void {
    this.bones.clear();

    const root = new THREE.Bone();
    root.name = "root";
    root.position.set(0, 0.95, 0);
    this.bones.set("root", root);

    const spine = new THREE.Bone();
    spine.name = "spine";
    spine.position.set(0, 0.15, 0);
    root.add(spine);
    this.bones.set("spine", spine);

    const chest = new THREE.Bone();
    chest.name = "chest";
    chest.position.set(0, 0.2, 0);
    spine.add(chest);
    this.bones.set("chest", chest);

    const neck = new THREE.Bone();
    neck.name = "neck";
    neck.position.set(0, 0.18, 0);
    chest.add(neck);
    this.bones.set("neck", neck);

    const head = new THREE.Bone();
    head.name = "head";
    head.position.set(0, 0.12, 0);
    neck.add(head);
    this.bones.set("head", head);

    const lShoulder = new THREE.Bone();
    lShoulder.name = "leftShoulder";
    lShoulder.position.set(-0.18, 0.15, 0);
    chest.add(lShoulder);
    this.bones.set("leftShoulder", lShoulder);

    const lUpperArm = new THREE.Bone();
    lUpperArm.name = "leftUpperArm";
    lUpperArm.position.set(-0.08, 0, 0);
    lShoulder.add(lUpperArm);
    this.bones.set("leftUpperArm", lUpperArm);

    const lLowerArm = new THREE.Bone();
    lLowerArm.name = "leftLowerArm";
    lLowerArm.position.set(0, -0.25, 0);
    lUpperArm.add(lLowerArm);
    this.bones.set("leftLowerArm", lLowerArm);

    const lHand = new THREE.Bone();
    lHand.name = "leftHand";
    lHand.position.set(0, -0.22, 0);
    lLowerArm.add(lHand);
    this.bones.set("leftHand", lHand);

    const rShoulder = new THREE.Bone();
    rShoulder.name = "rightShoulder";
    rShoulder.position.set(0.18, 0.15, 0);
    chest.add(rShoulder);
    this.bones.set("rightShoulder", rShoulder);

    const rUpperArm = new THREE.Bone();
    rUpperArm.name = "rightUpperArm";
    rUpperArm.position.set(0.08, 0, 0);
    rShoulder.add(rUpperArm);
    this.bones.set("rightUpperArm", rUpperArm);

    const rLowerArm = new THREE.Bone();
    rLowerArm.name = "rightLowerArm";
    rLowerArm.position.set(0, -0.25, 0);
    rUpperArm.add(rLowerArm);
    this.bones.set("rightLowerArm", rLowerArm);

    const rHand = new THREE.Bone();
    rHand.name = "rightHand";
    rHand.position.set(0, -0.22, 0);
    rLowerArm.add(rHand);
    this.bones.set("rightHand", rHand);

    const lUpperLeg = new THREE.Bone();
    lUpperLeg.name = "leftUpperLeg";
    lUpperLeg.position.set(-0.1, 0, 0);
    root.add(lUpperLeg);
    this.bones.set("leftUpperLeg", lUpperLeg);

    const lLowerLeg = new THREE.Bone();
    lLowerLeg.name = "leftLowerLeg";
    lLowerLeg.position.set(0, -0.4, 0);
    lUpperLeg.add(lLowerLeg);
    this.bones.set("leftLowerLeg", lLowerLeg);

    const lFoot = new THREE.Bone();
    lFoot.name = "leftFoot";
    lFoot.position.set(0, -0.4, 0);
    lLowerLeg.add(lFoot);
    this.bones.set("leftFoot", lFoot);

    const rUpperLeg = new THREE.Bone();
    rUpperLeg.name = "rightUpperLeg";
    rUpperLeg.position.set(0.1, 0, 0);
    root.add(rUpperLeg);
    this.bones.set("rightUpperLeg", rUpperLeg);

    const rLowerLeg = new THREE.Bone();
    rLowerLeg.name = "rightLowerLeg";
    rLowerLeg.position.set(0, -0.4, 0);
    rUpperLeg.add(rLowerLeg);
    this.bones.set("rightLowerLeg", rLowerLeg);

    const rFoot = new THREE.Bone();
    rFoot.name = "rightFoot";
    rFoot.position.set(0, -0.4, 0);
    rLowerLeg.add(rFoot);
    this.bones.set("rightFoot", rFoot);

    const boneArray = Array.from(this.bones.values());
    this.skeleton = new THREE.Skeleton(boneArray);
  }

  private createGeometry(variant: {
    height: number;
    width: number;
    skinTone: string;
    shirtColor: string;
    pantsColor: string;
  }): void {
    const scale = variant.height;
    const build = variant.width;

    const positions: number[] = [];
    const normals: number[] = [];
    const skinIndices: number[] = [];
    const skinWeights: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    let vertexOffset = 0;

    const addBodyPart = (
      baseY: number,
      radiusX: number,
      radiusY: number,
      radiusZ: number,
      height: number,
      boneIndex: number,
      color: THREE.Color,
    ) => {
      const segments = 8;
      for (let y = 0; y <= segments; y++) {
        const v = y / segments;
        const angle = v * Math.PI * 2;

        for (let x = 0; x <= segments; x++) {
          const u = x / segments;
          const theta = u * Math.PI * 2;

          const px = Math.cos(theta) * radiusX * (1 - Math.abs(v - 0.5) * 0.2);
          const py = v * height;
          const pz = Math.sin(theta) * radiusZ * (1 - Math.abs(v - 0.5) * 0.2);

          positions.push(px, py, pz);

          const nx = Math.cos(theta);
          const ny = 0;
          const nz = Math.sin(theta);
          normals.push(nx, ny, nz);

          skinIndices.push(boneIndex, 0, 0, 0);
          skinWeights.push(1, 0, 0, 0);

          colors.push(color.r, color.g, color.b);
        }
      }

      for (let y = 0; y < segments; y++) {
        for (let x = 0; x < segments; x++) {
          const a = vertexOffset + y * (segments + 1) + x;
          const b = a + 1;
          const c = a + (segments + 1);
          const d = c + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }

      vertexOffset += (segments + 1) * (segments + 1);
    };

    const skinColor = new THREE.Color(variant.skinTone);
    const shirtColor = new THREE.Color(variant.shirtColor);
    const pantsColor = new THREE.Color(variant.pantsColor);

    addBodyPart(0.0, 0.15 * build, 0.15, 0.12 * build, 0.4, 0, pantsColor);
    addBodyPart(0.4, 0.2 * build, 0.2, 0.15 * build, 0.25, 1, shirtColor);
    addBodyPart(0.65, 0.12, 0.12, 0.12, 0.18, 3, skinColor);
    addBodyPart(0.4, 0.07 * build, 0.07, 0.07 * build, 0.28, 5, shirtColor);
    addBodyPart(0.68, 0.06 * build, 0.06, 0.06 * build, 0.25, 7, skinColor);
    addBodyPart(0.0, 0.1 * build, 0.1, 0.08 * build, 0.4, 10, pantsColor);
    addBodyPart(0.38, 0.08 * build, 0.08, 0.06 * build, 0.38, 12, pantsColor);
    addBodyPart(-0.05, 0.06, 0.04, 0.1, 0.04, 14, pantsColor);
    addBodyPart(-0.05, 0.06, 0.04, 0.1, 0.04, 16, pantsColor);

    const vertexCount = positions.length / 3;

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    this.geometry.setAttribute(
      "skinIndex",
      new THREE.Uint16BufferAttribute(new Uint16Array(skinIndices), 4),
    );
    this.geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(skinWeights, 4),
    );
    this.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    this.geometry.setIndex(indices);

    if (vertexCount === 0) {
      console.error("CharacterGenerator: No vertices generated!");
      const dummyGeo = new THREE.BoxGeometry(0.5, 1.5, 0.3);
      const dummySkinIndices = new Uint16Array(24);
      const dummySkinWeights = new Float32Array(24);
      for (let i = 0; i < 24; i += 4) {
        dummySkinIndices[i] = 0;
        dummySkinWeights[i] = 1;
      }
      dummyGeo.setAttribute(
        "skinIndex",
        new THREE.Uint16BufferAttribute(dummySkinIndices, 4),
      );
      dummyGeo.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(dummySkinWeights, 4),
      );
      this.geometry = dummyGeo;
    }
  }

  getSkeleton(): THREE.Skeleton {
    return this.skeleton;
  }

  getBones(): Map<string, THREE.Bone> {
    return this.bones;
  }
}
