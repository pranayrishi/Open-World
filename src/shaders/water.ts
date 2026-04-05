export const waterVert = `
precision highp float;

uniform float u_time;

varying vec3 v_worldPosition;
varying vec3 v_normal;
varying vec2 v_uv;
varying float v_fresnel;
varying vec3 v_viewDirection;

void main() {
  vec3 pos = position;
  
  float w1 = sin(dot(vec2(0.8, 0.6), pos.xz) * 0.5 + u_time * 1.2) * 0.15;
  float w2 = sin(dot(vec2(-0.3, 0.9), pos.xz) * 0.8 + u_time * 0.8) * 0.08;
  float w3 = sin(pos.x * 3.0 + pos.y * 2.0 + u_time * 2.5) * 0.02;
  pos.y += w1 + w2 + w3;
  
  vec3 normal = normalize(vec3(
    -cos(dot(vec2(0.8, 0.6), pos.xz) * 0.5 + u_time * 1.2) * 0.075,
    1.0,
    -cos(dot(vec2(-0.3, 0.9), pos.xz) * 0.8 + u_time * 0.8) * 0.064
  ));
  
  v_normal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  v_worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  v_uv = uv;
  
  vec3 viewDir = normalize(cameraPosition - v_worldPosition);
  v_viewDirection = viewDir;
  
  float fresnel = pow(1.0 - max(dot(viewDir, v_normal), 0.0), 3.0);
  v_fresnel = fresnel;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const waterFrag = `
precision highp float;

uniform float u_time;
uniform vec3 u_sunDirection;
uniform vec3 u_waterColor;
uniform vec3 u_deepColor;
uniform vec3 u_skyColor;
uniform float u_waterDepth;

varying vec3 v_worldPosition;
varying vec3 v_normal;
varying vec2 v_uv;
varying float v_fresnel;
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

float caustics(vec2 uv, float time) {
  float c1 = snoise(vec3(uv * 4.0, time * 0.5));
  float c2 = snoise(vec3(uv * 8.0, time * 0.3 + 100.0));
  return (c1 + c2) * 0.5;
}

void main() {
  vec3 normal = normalize(v_normal);
  vec3 viewDir = normalize(v_viewDirection);
  vec3 sunDir = normalize(u_sunDirection);
  
  vec2 flowUV = v_uv * 4.0 + vec2(u_time * 0.02, u_time * 0.01);
  float flowPattern = snoise(vec3(flowUV * 2.0, u_time * 0.3)) * 0.5 + 0.5;
  
  float depth = u_waterDepth;
  vec3 waterCol = mix(u_waterColor, u_deepColor, smoothstep(0.0, depth, depth));
  
  vec3 reflectDir = reflect(-viewDir, normal);
  float skyGradient = smoothstep(-0.2, 0.5, reflectDir.y);
  vec3 reflectionColor = mix(vec3(0.4, 0.5, 0.6), u_skyColor, skyGradient);
  
  float sunReflection = pow(max(dot(reflectDir, sunDir), 0.0), 128.0);
  vec3 sunSpec = vec3(1.0, 0.95, 0.8) * sunReflection * 2.0;
  
  float subsurface = pow(max(dot(viewDir, -sunDir + normal * 0.5), 0.0), 2.0);
  vec3 subsurfaceColor = vec3(0.1, 0.4, 0.3) * subsurface * 0.3;
  
  float caustic = caustics(v_worldPosition.xz * 0.1, u_time);
  vec3 causticColor = vec3(0.3, 0.4, 0.3) * caustic * 0.2;
  
  vec3 finalColor = mix(waterCol + causticColor, reflectionColor, v_fresnel);
  finalColor += sunSpec + subsurfaceColor;
  
  float alpha = mix(0.6, 0.9, v_fresnel);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;
