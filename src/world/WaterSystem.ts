import * as THREE from "three";
import { WATER_LEVEL } from "./Noise.js";

export class WaterSystem {
  private scene: THREE.Scene;
  private waterMesh!: THREE.Mesh;
  private material!: THREE.ShaderMaterial;
  private initialized = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    const waterSize = 2000;

    const geometry = new THREE.PlaneGeometry(waterSize, waterSize, 128, 128);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaterColor: { value: new THREE.Color("#1a6b6b") },
        uDeepColor: { value: new THREE.Color("#0a2e3d") },
        uFoamColor: { value: new THREE.Color("#c8dde6") },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader: this.waterVertexShader,
      fragmentShader: this.waterFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.waterMesh = new THREE.Mesh(geometry, this.material);
    this.waterMesh.position.y = WATER_LEVEL + 0.1;
    this.waterMesh.renderOrder = 10;
    this.waterMesh.name = "water";

    this.scene.add(this.waterMesh);
  }

  update(dt: number, cameraPos?: THREE.Vector3): void {
    if (!this.material) return;
    this.material.uniforms.uTime.value += dt;
    if (cameraPos) {
      this.material.uniforms.uCameraPos.value.copy(cameraPos);

      this.waterMesh.position.x = Math.floor(cameraPos.x / 100) * 100;
      this.waterMesh.position.z = Math.floor(cameraPos.z / 100) * 100;
    }
  }

  setSunDirection(dir: THREE.Vector3): void {
    if (this.material) {
      this.material.uniforms.uSunDirection.value.copy(dir);
    }
  }

  isInWater(position: THREE.Vector3): boolean {
    return position.y < WATER_LEVEL + 0.5;
  }

  private waterVertexShader = `
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec3 pos = position;

      float wave1 = sin(pos.x * 0.15 + uTime * 0.8) * 0.12;
      float wave2 = sin(pos.z * 0.2 + uTime * 1.1) * 0.08;
      float wave3 = sin((pos.x + pos.z) * 0.1 + uTime * 0.6) * 0.15;
      float wave4 = sin(pos.x * 0.4 + pos.z * 0.3 + uTime * 1.5) * 0.03;

      pos.y += wave1 + wave2 + wave3 + wave4;

      float dx = 0.15 * cos(pos.x * 0.15 + uTime * 0.8) * 0.12
               + 0.1 * cos((pos.x + pos.z) * 0.1 + uTime * 0.6) * 0.15
               + 0.4 * cos(pos.x * 0.4 + pos.z * 0.3 + uTime * 1.5) * 0.03;
      float dz = 0.2 * cos(pos.z * 0.2 + uTime * 1.1) * 0.08
               + 0.1 * cos((pos.x + pos.z) * 0.1 + uTime * 0.6) * 0.15
               + 0.3 * cos(pos.x * 0.4 + pos.z * 0.3 + uTime * 1.5) * 0.03;

      vNormal = normalize(vec3(-dx, 1.0, -dz));

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  private waterFragmentShader = `
    uniform float uTime;
    uniform vec3 uWaterColor;
    uniform vec3 uDeepColor;
    uniform vec3 uFoamColor;
    uniform vec3 uSunDirection;
    uniform vec3 uCameraPos;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(uCameraPos - vWorldPos);

      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
      fresnel = 0.3 + 0.7 * fresnel;

      vec3 reflectDir = reflect(-viewDir, normal);
      float skyGradient = max(reflectDir.y, 0.0);
      vec3 skyColor = mix(
        vec3(0.5, 0.65, 0.75),
        vec3(0.4, 0.6, 0.9),
        skyGradient
      );

      vec3 waterCol = mix(uWaterColor, uDeepColor, 0.3 + fresnel * 0.3);
      vec3 color = mix(waterCol, skyColor, fresnel * 0.6);

      float sunSpec = pow(max(dot(reflectDir, uSunDirection), 0.0), 96.0);
      color += vec3(1.0, 0.95, 0.85) * sunSpec * 1.5;

      float sunSpec2 = pow(max(dot(reflectDir, uSunDirection), 0.0), 16.0);
      color += vec3(0.8, 0.85, 0.9) * sunSpec2 * 0.15;

      float caustic = sin(vWorldPos.x * 2.0 + uTime) *
                      sin(vWorldPos.z * 2.5 + uTime * 0.7) * 0.5 + 0.5;
      color += vec3(0.1, 0.15, 0.1) * caustic * 0.08;

      float alpha = 0.7 + fresnel * 0.25;

      float dist = length(uCameraPos - vWorldPos);
      float fog = 1.0 - exp(-dist * 0.002);
      color = mix(color, vec3(0.5, 0.6, 0.7), fog * 0.3);

      gl_FragColor = vec4(color, alpha);
    }
  `;
}
