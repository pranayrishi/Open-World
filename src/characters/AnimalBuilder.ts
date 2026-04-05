import * as THREE from "three";

export type AnimalType = "deer" | "rabbit" | "fox" | "bird";

export interface AnimalParts {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Group;
  legs: THREE.Group[];
  tail?: THREE.Mesh;
}

export function buildAnimal(type: AnimalType): AnimalParts {
  switch (type) {
    case "deer":
      return buildDeer();
    case "rabbit":
      return buildRabbit();
    case "fox":
      return buildFox();
    case "bird":
      return buildBird();
  }
}

function buildDeer(): AnimalParts {
  const root = new THREE.Group();
  root.name = "deer";

  const bodyMat = new THREE.MeshStandardMaterial({
    color: "#B8860B",
    roughness: 0.85,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: "#D2B48C",
    roughness: 0.85,
  });

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.55, 4, 8),
    bodyMat,
  );
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.7, 0);
  body.castShadow = true;
  root.add(body);

  const belly = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.45, 4, 6),
    bellyMat,
  );
  belly.rotation.z = Math.PI / 2;
  belly.position.set(0, 0.62, 0);
  root.add(belly);

  const headGroup = new THREE.Group();
  headGroup.position.set(0.5, 0.85, 0);
  root.add(headGroup);

  const headMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.1, 0.18, 4, 6),
    bodyMat,
  );
  headMesh.rotation.z = Math.PI / 2 + 0.3;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, 0.25, 6),
    bodyMat,
  );
  neck.position.set(0.35, 0.82, 0);
  neck.rotation.z = -0.5;
  root.add(neck);

  const earGeo = new THREE.ConeGeometry(0.035, 0.1, 4);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, bodyMat);
    ear.position.set(-0.02, 0.14, side * 0.06);
    headGroup.add(ear);
  }

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 6, 4),
    new THREE.MeshStandardMaterial({ color: "#2C1810" }),
  );
  nose.position.set(0.12, 0.03, 0);
  headGroup.add(nose);

  const antlerMat = new THREE.MeshStandardMaterial({
    color: "#8B7355",
    roughness: 0.9,
  });
  for (const side of [-1, 1]) {
    const antler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.014, 0.18, 4),
      antlerMat,
    );
    antler.position.set(-0.02, 0.18, side * 0.05);
    antler.rotation.z = side * 0.3;
    headGroup.add(antler);
  }

  const legs: THREE.Group[] = [];
  const legPositions = [
    { x: 0.22, y: 0.52, z: -0.1 },
    { x: 0.22, y: 0.52, z: 0.1 },
    { x: -0.22, y: 0.52, z: -0.1 },
    { x: -0.22, y: 0.52, z: 0.1 },
  ];

  for (const lp of legPositions) {
    const legGroup = new THREE.Group();
    legGroup.position.set(lp.x, lp.y, lp.z);

    const upperLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.03, 0.3, 6),
      bodyMat,
    );
    upperLeg.position.set(0, -0.15, 0);
    upperLeg.castShadow = true;
    legGroup.add(upperLeg);

    const lowerLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.02, 0.25, 5),
      bodyMat,
    );
    lowerLeg.position.set(0, -0.42, 0);
    legGroup.add(lowerLeg);

    const hoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.025, 0.03, 5),
      new THREE.MeshStandardMaterial({ color: "#1a1a1a" }),
    );
    hoof.position.set(0, -0.56, 0);
    legGroup.add(hoof);

    root.add(legGroup);
    legs.push(legGroup);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 4), bellyMat);
  tail.position.set(-0.42, 0.78, 0);
  tail.rotation.z = 0.5;
  root.add(tail);

  return { root, body, head: headGroup, legs, tail };
}

function buildRabbit(): AnimalParts {
  const root = new THREE.Group();
  root.name = "rabbit";

  const furMat = new THREE.MeshStandardMaterial({
    color: "#C4A882",
    roughness: 0.9,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: "#F5F0E8",
    roughness: 0.9,
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), furMat);
  body.scale.set(1.1, 0.85, 0.9);
  body.position.set(0, 0.18, 0);
  body.castShadow = true;
  root.add(body);

  const headGroup = new THREE.Group();
  headGroup.position.set(0.13, 0.26, 0);
  root.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), furMat);
  headGroup.add(headMesh);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.018, 0.12, 4, 4),
      furMat,
    );
    ear.position.set(-0.01, 0.12, side * 0.035);
    ear.rotation.z = side * 0.1;
    headGroup.add(ear);

    const innerEar = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.01, 0.08, 3, 3),
      new THREE.MeshStandardMaterial({ color: "#FFB6C1" }),
    );
    innerEar.position.set(-0.005, 0.12, side * 0.035);
    innerEar.rotation.z = side * 0.1;
    headGroup.add(innerEar);
  }

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 4, 4),
    new THREE.MeshStandardMaterial({ color: "#FFB6C1" }),
  );
  nose.position.set(0.07, 0, 0);
  headGroup.add(nose);

  const legs: THREE.Group[] = [];
  const legPositions = [
    { x: 0.06, y: 0.1, z: -0.06 },
    { x: 0.06, y: 0.1, z: 0.06 },
    { x: -0.06, y: 0.1, z: -0.07 },
    { x: -0.06, y: 0.1, z: 0.07 },
  ];

  for (let i = 0; i < 4; i++) {
    const lp = legPositions[i];
    const legGroup = new THREE.Group();
    legGroup.position.set(lp.x, lp.y, lp.z);

    const isBack = i >= 2;
    const legMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        isBack ? 0.028 : 0.02,
        isBack ? 0.08 : 0.06,
        4,
        4,
      ),
      furMat,
    );
    legMesh.position.y = isBack ? -0.05 : -0.04;
    legGroup.add(legMesh);

    const paw = new THREE.Mesh(
      new THREE.SphereGeometry(isBack ? 0.02 : 0.015, 4, 3),
      furMat,
    );
    paw.position.y = isBack ? -0.1 : -0.08;
    legGroup.add(paw);

    root.add(legGroup);
    legs.push(legGroup);
  }

  const tailMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 6, 4),
    bellyMat,
  );
  tailMesh.position.set(-0.14, 0.2, 0);
  root.add(tailMesh);

  return { root, body, head: headGroup, legs, tail: tailMesh };
}

function buildFox(): AnimalParts {
  const root = new THREE.Group();
  root.name = "fox";

  const furMat = new THREE.MeshStandardMaterial({
    color: "#D2691E",
    roughness: 0.85,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: "#FFF8F0",
    roughness: 0.85,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    roughness: 0.9,
  });

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.35, 4, 8),
    furMat,
  );
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.38, 0);
  body.castShadow = true;
  root.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), whiteMat);
  chest.position.set(0.15, 0.34, 0);
  root.add(chest);

  const headGroup = new THREE.Group();
  headGroup.position.set(0.3, 0.45, 0);
  root.add(headGroup);

  const headMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.18, 6),
    furMat,
  );
  headMesh.rotation.z = -Math.PI / 2;
  headGroup.add(headMesh);

  const muzzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.09, 5),
    whiteMat,
  );
  muzzle.rotation.z = -Math.PI / 2;
  muzzle.position.set(0.05, -0.02, 0);
  headGroup.add(muzzle);

  const noseTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 4, 4),
    darkMat,
  );
  noseTip.position.set(0.1, -0.01, 0);
  headGroup.add(noseTip);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), furMat);
    ear.position.set(-0.03, 0.09, side * 0.05);
    headGroup.add(ear);

    const earTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.02, 0.03, 4),
      darkMat,
    );
    earTip.position.set(-0.03, 0.13, side * 0.05);
    headGroup.add(earTip);
  }

  const legs: THREE.Group[] = [];
  const legPositions = [
    { x: 0.15, y: 0.26, z: -0.07 },
    { x: 0.15, y: 0.26, z: 0.07 },
    { x: -0.15, y: 0.26, z: -0.07 },
    { x: -0.15, y: 0.26, z: 0.07 },
  ];

  for (const lp of legPositions) {
    const legGroup = new THREE.Group();
    legGroup.position.set(lp.x, lp.y, lp.z);

    const legMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.016, 0.22, 5),
      furMat,
    );
    legMesh.position.y = -0.11;
    legGroup.add(legMesh);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 3), darkMat);
    paw.position.y = -0.23;
    legGroup.add(paw);

    root.add(legGroup);
    legs.push(legGroup);
  }

  const tail = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.22, 4, 6),
    furMat,
  );
  tail.position.set(-0.35, 0.38, 0);
  tail.rotation.z = 0.5;
  root.add(tail);

  const tailTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 4),
    whiteMat,
  );
  tailTip.position.set(-0.5, 0.46, 0);
  root.add(tailTip);

  return { root, body, head: headGroup, legs, tail };
}

function buildBird(): AnimalParts {
  const root = new THREE.Group();
  root.name = "bird";

  const bodyMat = new THREE.MeshStandardMaterial({
    color: "#4A7C59",
    roughness: 0.8,
  });
  const breastMat = new THREE.MeshStandardMaterial({
    color: "#CD5C5C",
    roughness: 0.8,
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), bodyMat);
  body.scale.set(1.1, 0.85, 0.8);
  body.position.set(0, 0.12, 0);
  body.castShadow = true;
  root.add(body);

  const breast = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 6, 4),
    breastMat,
  );
  breast.position.set(0.02, 0.11, 0);
  root.add(breast);

  const headGroup = new THREE.Group();
  headGroup.position.set(0.05, 0.18, 0);
  root.add(headGroup);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 6, 5),
    bodyMat,
  );
  headGroup.add(headMesh);

  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.008, 0.03, 4),
    new THREE.MeshStandardMaterial({ color: "#DAA520" }),
  );
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.035, -0.005, 0);
  headGroup.add(beak);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.005, 4, 4),
      new THREE.MeshStandardMaterial({ color: "#111111" }),
    );
    eye.position.set(0.02, 0.005, side * 0.02);
    headGroup.add(eye);
  }

  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(-0.005, 0.07, side * 0.02);

    const legMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.08, 3),
      new THREE.MeshStandardMaterial({ color: "#8B7355" }),
    );
    legMesh.position.y = -0.04;
    legGroup.add(legMesh);

    root.add(legGroup);
    legs.push(legGroup);
  }

  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.004, 0.035),
    bodyMat,
  );
  tail.position.set(-0.06, 0.12, 0);
  tail.rotation.z = 0.25;
  root.add(tail);

  return { root, body, head: headGroup, legs, tail };
}
