import * as THREE from "three";

export interface CharacterConfig {
  height: number;
  bodyWidth: number;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
}

export interface CharacterParts {
  root: THREE.Group;
  head: THREE.Mesh;
  torso: THREE.Mesh;
  leftUpperArm: THREE.Group;
  leftLowerArm: THREE.Mesh;
  rightUpperArm: THREE.Group;
  rightLowerArm: THREE.Mesh;
  leftUpperLeg: THREE.Group;
  leftLowerLeg: THREE.Mesh;
  rightUpperLeg: THREE.Group;
  rightLowerLeg: THREE.Mesh;
  leftFoot: THREE.Mesh;
  rightFoot: THREE.Mesh;
}

const DEFAULT_CONFIG: CharacterConfig = {
  height: 1.0,
  bodyWidth: 1.0,
  skinColor: "#DEB887",
  shirtColor: "#3B7DD8",
  pantsColor: "#4A4A4A",
  shoeColor: "#2C2C2C",
};

export function buildCharacter(
  config: Partial<CharacterConfig> = {},
): CharacterParts {
  const c = { ...DEFAULT_CONFIG, ...config };
  const h = c.height;
  const w = c.bodyWidth;

  const skinMat = new THREE.MeshStandardMaterial({
    color: c.skinColor,
    roughness: 0.8,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: c.shirtColor,
    roughness: 0.75,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: c.pantsColor,
    roughness: 0.8,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: c.shoeColor,
    roughness: 0.9,
  });

  const root = new THREE.Group();
  root.name = "character";

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.13 * h, 10, 8),
    skinMat,
  );
  head.position.set(0, 1.62 * h, 0);
  head.castShadow = true;
  root.add(head);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.35 * w, 0.45 * h, 0.2),
    shirtMat,
  );
  torso.position.set(0, 1.25 * h, 0);
  torso.castShadow = true;
  root.add(torso);

  const leftUpperArm = new THREE.Group();
  leftUpperArm.position.set(-0.22 * w, 1.45 * h, 0);
  root.add(leftUpperArm);

  const leftUpperArmMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.045, 0.22 * h, 4, 6),
    shirtMat,
  );
  leftUpperArmMesh.position.set(0, -0.13 * h, 0);
  leftUpperArmMesh.castShadow = true;
  leftUpperArm.add(leftUpperArmMesh);

  const leftLowerArm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.038, 0.2 * h, 4, 6),
    skinMat,
  );
  leftLowerArm.position.set(0, -0.35 * h, 0);
  leftLowerArm.castShadow = true;
  leftUpperArm.add(leftLowerArm);

  const rightUpperArm = new THREE.Group();
  rightUpperArm.position.set(0.22 * w, 1.45 * h, 0);
  root.add(rightUpperArm);

  const rightUpperArmMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.045, 0.22 * h, 4, 6),
    shirtMat,
  );
  rightUpperArmMesh.position.set(0, -0.13 * h, 0);
  rightUpperArmMesh.castShadow = true;
  rightUpperArm.add(rightUpperArmMesh);

  const rightLowerArm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.038, 0.2 * h, 4, 6),
    skinMat,
  );
  rightLowerArm.position.set(0, -0.35 * h, 0);
  rightLowerArm.castShadow = true;
  rightUpperArm.add(rightLowerArm);

  const leftUpperLeg = new THREE.Group();
  leftUpperLeg.position.set(-0.09 * w, 1.0 * h, 0);
  root.add(leftUpperLeg);

  const leftUpperLegMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.06, 0.32 * h, 4, 6),
    pantsMat,
  );
  leftUpperLegMesh.position.set(0, -0.2 * h, 0);
  leftUpperLegMesh.castShadow = true;
  leftUpperLeg.add(leftUpperLegMesh);

  const leftLowerLeg = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.05, 0.3 * h, 4, 6),
    pantsMat,
  );
  leftLowerLeg.position.set(0, -0.52 * h, 0);
  leftLowerLeg.castShadow = true;
  leftUpperLeg.add(leftLowerLeg);

  const leftFoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 0.16),
    shoeMat,
  );
  leftFoot.position.set(0, -0.7 * h, 0.03);
  leftUpperLeg.add(leftFoot);

  const rightUpperLeg = new THREE.Group();
  rightUpperLeg.position.set(0.09 * w, 1.0 * h, 0);
  root.add(rightUpperLeg);

  const rightUpperLegMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.06, 0.32 * h, 4, 6),
    pantsMat,
  );
  rightUpperLegMesh.position.set(0, -0.2 * h, 0);
  rightUpperLegMesh.castShadow = true;
  rightUpperLeg.add(rightUpperLegMesh);

  const rightLowerLeg = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.05, 0.3 * h, 4, 6),
    pantsMat,
  );
  rightLowerLeg.position.set(0, -0.52 * h, 0);
  rightLowerLeg.castShadow = true;
  rightUpperLeg.add(rightLowerLeg);

  const rightFoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 0.16),
    shoeMat,
  );
  rightFoot.position.set(0, -0.7 * h, 0.03);
  rightUpperLeg.add(rightFoot);

  return {
    root,
    head,
    torso,
    leftUpperArm,
    leftLowerArm,
    rightUpperArm,
    rightLowerArm,
    leftUpperLeg,
    leftLowerLeg,
    rightUpperLeg,
    rightLowerLeg,
    leftFoot,
    rightFoot,
  };
}
