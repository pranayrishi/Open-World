import * as THREE from "three";

export const skyVert = `
#include <logdepthbuf_pars_vertex>
varying vec3 v_worldPosition;
varying vec3 v_viewDirection;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  v_worldPosition = worldPosition.xyz;
  v_viewDirection = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`;

export const skyFrag = `
#include <logdepthbuf_pars_fragment>
uniform float u_time;
uniform vec3 u_sunDirection;
uniform float u_sunElevation;
uniform vec3 u_horizonColor;
uniform vec3 u_zenithColor;
uniform vec3 u_sunColor;
uniform vec3 u_nightColor;

varying vec3 v_worldPosition;
varying vec3 v_viewDirection;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec3 viewDir = normalize(v_viewDirection);
  float sunDot = max(dot(viewDir, u_sunDirection), 0.0);
  
  float dayFactor = smoothstep(-0.1, 0.2, u_sunElevation);
  
  vec3 skyColor = mix(u_nightColor, u_horizonColor, dayFactor);
  vec3 zenithColor = mix(vec3(0.02, 0.02, 0.08), u_zenithColor, dayFactor);
  
  float heightGradient = pow(max(viewDir.y, 0.0), 0.5);
  vec3 baseSky = mix(skyColor, zenithColor, heightGradient);
  
  float sunSize = 0.9995;
  float sunDisc = smoothstep(sunSize, sunSize + 0.0005, sunDot);
  vec3 sunGlow = u_sunColor * pow(sunDot, 64.0) * 2.0;
  vec3 sunDiscColor = u_sunColor * sunDisc * dayFactor;
  
  float mieScatter = pow(sunDot, 8.0) * 0.5 * dayFactor;
  vec3 mieColor = u_sunColor * mieScatter;
  
  float horizonBlend = 1.0 - pow(abs(viewDir.y), 0.5);
  vec3 horizonGlow = mix(u_horizonColor, u_sunColor, sunDot) * horizonBlend * 0.3 * dayFactor;
  
  float cloudDensity = fbm(vec3(viewDir.xz * 3.0, u_time * 0.02));
  cloudDensity = smoothstep(0.0, 0.5, cloudDensity);
  float cloudCoverage = smoothstep(-0.2, 0.4, cloudDensity);
  
  vec3 cloudColor = mix(vec3(0.9, 0.9, 0.95), u_sunColor, pow(sunDot, 4.0) * dayFactor);
  vec3 cloudLayer = cloudColor * cloudCoverage * 0.3 * dayFactor;
  
  vec3 nightSky = u_nightColor;
  float starNoise = snoise(viewDir * 100.0);
  float starThreshold = 0.97;
  float stars = step(starThreshold, starNoise) * (1.0 - dayFactor);
  float starTwinkle = sin(u_time * 2.0 + starNoise * 100.0) * 0.3 + 0.7;
  nightSky += vec3(stars * starTwinkle * 0.8);
  
  vec3 finalSky = mix(nightSky, baseSky + horizonGlow, dayFactor);
  finalSky += sunDiscColor + sunGlow + mieColor + cloudLayer;
  
  float sunInfluence = pow(sunDot, 16.0) * dayFactor;
  vec3 rayleighColor = mix(u_sunColor, vec3(0.6, 0.7, 1.0), 1.0 - sunInfluence);
  finalSky = mix(finalSky, rayleighColor, 0.1 * dayFactor);
  
  gl_FragColor = vec4(finalSky, 1.0);
  #include <logdepthbuf_fragment>
}
`;

export class SkySystem {
  private scene: THREE.Scene;
  private skyDome: THREE.Mesh;
  private skyMaterial!: THREE.ShaderMaterial;
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private hemisphereLight!: THREE.HemisphereLight;

  private timeOfDay = 0;
  private readonly CYCLE_DURATION = 600;
  private sunDirection: THREE.Vector3 = new THREE.Vector3();
  private sunElevation = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.skyDome = this.createSkyDome();
    this.setupLighting();
  }

  private createSkyDome(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1000, 32, 32);
    geometry.scale(-1, 1, 1);

    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      uniforms: {
        u_time: { value: 0 },
        u_sunDirection: { value: new THREE.Vector3(0, 1, 0) },
        u_sunElevation: { value: 0.5 },
        u_horizonColor: { value: new THREE.Color(0.8, 0.85, 0.9) },
        u_zenithColor: { value: new THREE.Color(0.4, 0.6, 0.9) },
        u_sunColor: { value: new THREE.Color(1, 0.95, 0.8) },
        u_nightColor: { value: new THREE.Color(0.02, 0.02, 0.05) },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, this.skyMaterial);
    mesh.renderOrder = -1000;
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    return mesh;
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x404050, 0.3);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.4);
    this.scene.add(this.hemisphereLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.bias = -0.0001;
    this.scene.add(this.sunLight);
  }

  update(deltaTime: number): void {
    this.timeOfDay = (this.timeOfDay + deltaTime) % this.CYCLE_DURATION;
    const t = this.timeOfDay / this.CYCLE_DURATION;

    const angle = t * Math.PI * 2;
    this.sunElevation = Math.sin(angle);
    this.sunDirection
      .set(Math.cos(angle) * 0.5, this.sunElevation, Math.sin(angle) * 0.5)
      .normalize();

    this.updateLighting(t);
    this.updateSkyUniforms();
  }

  private updateLighting(t: number): void {
    let sunIntensity: number;
    let sunColor: THREE.Color;
    let ambientIntensity: number;
    let hemisphereIntensity: number;

    if (t < 0.25) {
      const sunriseT = t / 0.25;
      sunIntensity = sunriseT * 1.2;
      sunColor = new THREE.Color().lerpColors(
        new THREE.Color(0xff6b35),
        new THREE.Color(0xfffaf0),
        sunriseT,
      );
      ambientIntensity = 0.2 + sunriseT * 0.2;
      hemisphereIntensity = 0.3 + sunriseT * 0.2;
    } else if (t < 0.5) {
      sunIntensity = 1.2;
      sunColor = new THREE.Color(0xfffaf0);
      ambientIntensity = 0.4;
      hemisphereIntensity = 0.5;
    } else if (t < 0.75) {
      const sunsetT = (t - 0.5) / 0.25;
      sunIntensity = 1.2 - sunsetT * 1.0;
      sunColor = new THREE.Color().lerpColors(
        new THREE.Color(0xfffaf0),
        new THREE.Color(0xff6b35),
        sunsetT,
      );
      ambientIntensity = 0.4 - sunsetT * 0.3;
      hemisphereIntensity = 0.5 - sunsetT * 0.3;
    } else {
      const nightT = (t - 0.75) / 0.25;
      sunIntensity = 0.2 - nightT * 0.15;
      sunColor = new THREE.Color(0x1a1a2e);
      ambientIntensity = 0.1;
      hemisphereIntensity = 0.2;
    }

    sunIntensity = Math.max(0.05, sunIntensity);

    this.sunLight.intensity = sunIntensity;
    this.sunLight.color.copy(sunColor);
    this.sunLight.position.copy(this.sunDirection).multiplyScalar(200);
    this.sunLight.target.position.set(0, 0, 0);

    this.ambientLight.intensity = ambientIntensity;
    this.hemisphereLight.intensity = hemisphereIntensity;
  }

  private updateSkyUniforms(): void {
    this.skyMaterial.uniforms.u_time.value = this.timeOfDay;
    this.skyMaterial.uniforms.u_sunDirection.value.copy(this.sunDirection);
    this.skyMaterial.uniforms.u_sunElevation.value = this.sunElevation;

    const dayFactor = Math.max(0, this.sunElevation);

    if (this.sunElevation > 0) {
      this.skyMaterial.uniforms.u_zenithColor.value.setRGB(
        0.3 + dayFactor * 0.2,
        0.5 + dayFactor * 0.2,
        0.8 + dayFactor * 0.2,
      );
      this.skyMaterial.uniforms.u_horizonColor.value.setRGB(
        0.7 + dayFactor * 0.1,
        0.75 + dayFactor * 0.1,
        0.8 + dayFactor * 0.1,
      );
    } else {
      const nightFactor = -this.sunElevation;
      this.skyMaterial.uniforms.u_zenithColor.value.setRGB(
        0.02 + nightFactor * 0.03,
        0.02 + nightFactor * 0.03,
        0.05 + nightFactor * 0.05,
      );
      this.skyMaterial.uniforms.u_horizonColor.value.setRGB(
        0.05 + nightFactor * 0.1,
        0.05 + nightFactor * 0.1,
        0.1 + nightFactor * 0.1,
      );
    }

    if (this.sunElevation > 0) {
      this.skyMaterial.uniforms.u_sunColor.value.setRGB(
        1.0,
        0.9 + this.sunElevation * 0.1,
        0.8 + this.sunElevation * 0.2,
      );
    } else {
      this.skyMaterial.uniforms.u_sunColor.value.setRGB(0.1, 0.1, 0.15);
    }
  }

  getSunDirection(): THREE.Vector3 {
    return this.sunDirection.clone();
  }

  getTimeOfDay(): number {
    return this.timeOfDay / this.CYCLE_DURATION;
  }

  dispose(): void {
    this.scene.remove(this.skyDome);
    this.scene.remove(this.sunLight);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.hemisphereLight);
    this.skyDome.geometry.dispose();
    this.skyMaterial.dispose();
  }
}
