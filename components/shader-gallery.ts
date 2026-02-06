// Shader Gallery - Collection of GLSL fragment shaders with uniform metadata

export interface ShaderUniform {
  name: string;       // GLSL uniform name (e.g., "u_speed")
  label: string;      // Display label (e.g., "Speed")
  type: 'float' | 'int';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface ShaderDefinition {
  id: string;
  name: string;
  description: string;
  fragmentSource: string;
  uniforms: ShaderUniform[];
}

// Site colors for reference:
// Teal:  rgb(22, 184, 166)  -> vec3(0.086, 0.722, 0.651)
// Pink:  rgb(217, 70, 239)  -> vec3(0.850, 0.275, 0.937)
// Blue:  rgb(34, 211, 238)  -> vec3(0.133, 0.827, 0.933)

const plasmaShader: ShaderDefinition = {
  id: 'plasma',
  name: 'Plasma Waves',
  description: 'Classic plasma effect using layered sine waves with vibrant site colors',
  uniforms: [
    { name: 'u_speed', label: 'Speed', type: 'float', min: 0.5, max: 2, step: 0.1, defaultValue: 1 },
    { name: 'u_scale', label: 'Scale', type: 'float', min: 1, max: 10, step: 0.5, defaultValue: 4 },
    { name: 'u_colorShift', label: 'Color Shift', type: 'float', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
  ],
  fragmentSource: `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform float u_colorShift;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * u_speed;

    // Create plasma pattern with layered sine waves
    float v1 = sin(uv.x * u_scale + t);
    float v2 = sin(uv.y * u_scale + t);
    float v3 = sin((uv.x + uv.y) * u_scale + t);
    float v4 = sin(sqrt(uv.x * uv.x + uv.y * uv.y) * u_scale * 2.0 + t);

    float plasma = (v1 + v2 + v3 + v4) * 0.25;

    // Site colors
    vec3 teal = vec3(0.086, 0.722, 0.651);
    vec3 pink = vec3(0.850, 0.275, 0.937);
    vec3 blue = vec3(0.133, 0.827, 0.933);

    // Mix colors based on plasma value and color shift
    float shift = plasma + u_colorShift;
    vec3 color = mix(teal, pink, smoothstep(-0.5, 0.5, sin(shift * 3.14159)));
    color = mix(color, blue, smoothstep(-0.5, 0.5, cos(shift * 3.14159 + t * 0.5)));

    // Add some brightness variation
    color *= 0.8 + 0.2 * sin(plasma * 3.14159 * 2.0);

    fragColor = vec4(color, 1.0);
}
`,
};

const sphereShader: ShaderDefinition = {
  id: 'sphere',
  name: 'Raymarched Sphere',
  description: 'SDF sphere with phong lighting and soft shadows using raymarching',
  uniforms: [
    { name: 'u_rotationSpeed', label: 'Rotation Speed', type: 'float', min: 0, max: 2, step: 0.1, defaultValue: 0.5 },
    { name: 'u_glossiness', label: 'Glossiness', type: 'float', min: 0.1, max: 1, step: 0.05, defaultValue: 0.5 },
    { name: 'u_sphereScale', label: 'Sphere Scale', type: 'float', min: 0.5, max: 1.5, step: 0.1, defaultValue: 1 },
  ],
  fragmentSource: `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_rotationSpeed;
uniform float u_glossiness;
uniform float u_sphereScale;

out vec4 fragColor;

#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.001

mat2 rot2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float getDist(vec3 p) {
    // Rotate the point around Y axis
    float angle = u_time * u_rotationSpeed;
    p.xz *= rot2D(angle);
    p.yz *= rot2D(angle * 0.7);

    float sphere = sdSphere(p, 0.8 * u_sphereScale);
    float plane = p.y + 1.5;

    return min(sphere, plane);
}

float rayMarch(vec3 ro, vec3 rd) {
    float d0 = 0.0;
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * d0;
        float ds = getDist(p);
        d0 += ds;
        if(d0 > MAX_DIST || ds < SURF_DIST) break;
    }
    return d0;
}

vec3 getNormal(vec3 p) {
    float d = getDist(p);
    vec2 e = vec2(0.001, 0.0);
    vec3 n = d - vec3(
        getDist(p - e.xyy),
        getDist(p - e.yxy),
        getDist(p - e.yyx)
    );
    return normalize(n);
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for(int i = 0; i < 32; i++) {
        float h = getDist(ro + rd * t);
        res = min(res, k * h / t);
        t += clamp(h, 0.02, 0.1);
        if(h < 0.001 || t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    // Camera setup
    vec3 ro = vec3(0.0, 0.5, 3.0);
    vec3 rd = normalize(vec3(uv, -1.0));

    // Site colors
    vec3 teal = vec3(0.086, 0.722, 0.651);
    vec3 pink = vec3(0.850, 0.275, 0.937);
    vec3 blue = vec3(0.133, 0.827, 0.933);

    float d = rayMarch(ro, rd);
    vec3 color = vec3(0.02, 0.02, 0.05); // Dark background

    if(d < MAX_DIST) {
        vec3 p = ro + rd * d;
        vec3 n = getNormal(p);

        // Light position (rotates)
        vec3 lightPos = vec3(2.0 * sin(u_time * 0.5), 2.0, 2.0 * cos(u_time * 0.5));
        vec3 lightDir = normalize(lightPos - p);
        vec3 viewDir = normalize(ro - p);
        vec3 halfDir = normalize(lightDir + viewDir);

        // Diffuse
        float diff = max(dot(n, lightDir), 0.0);

        // Specular (Blinn-Phong)
        float spec = pow(max(dot(n, halfDir), 0.0), 32.0 * u_glossiness);

        // Fresnel
        float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

        // Soft shadow
        float shadow = softShadow(p + n * 0.02, lightDir, 0.02, 5.0, 8.0);

        // Combine colors based on surface angle
        vec3 baseColor = mix(teal, pink, fresnel);
        baseColor = mix(baseColor, blue, 0.3 + 0.3 * sin(u_time));

        color = baseColor * (0.2 + diff * shadow * 0.8);
        color += spec * shadow * u_glossiness * vec3(1.0);
        color += fresnel * blue * 0.3;
    }

    // Gamma correction
    color = pow(color, vec3(0.4545));

    fragColor = vec4(color, 1.0);
}
`,
};

const noiseShader: ShaderDefinition = {
  id: 'noise',
  name: 'Fractal Noise',
  description: 'Layered simplex noise creating organic, flowing patterns',
  uniforms: [
    { name: 'u_octaves', label: 'Octaves', type: 'int', min: 1, max: 6, step: 1, defaultValue: 4 },
    { name: 'u_persistence', label: 'Persistence', type: 'float', min: 0.3, max: 0.7, step: 0.05, defaultValue: 0.5 },
    { name: 'u_zoom', label: 'Zoom', type: 'float', min: 1, max: 5, step: 0.25, defaultValue: 2 },
  ],
  fragmentSource: `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform int u_octaves;
uniform float u_persistence;
uniform float u_zoom;

out vec4 fragColor;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p, int octaves, float persistence) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;

    for(int i = 0; i < 6; i++) {
        if(i >= octaves) break;
        value += amplitude * snoise(p * frequency);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.0;
    }

    return value / maxValue;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv * u_zoom;

    // Animate the noise
    float t = u_time * 0.3;

    // Layer multiple noise samples with time offset
    float n1 = fbm(p + vec2(t * 0.5, t * 0.3), u_octaves, u_persistence);
    float n2 = fbm(p + vec2(-t * 0.4, t * 0.2) + vec2(5.2, 1.3), u_octaves, u_persistence);
    float n3 = fbm(p + vec2(t * 0.3, -t * 0.5) + vec2(3.7, 8.1), u_octaves, u_persistence);

    // Site colors
    vec3 teal = vec3(0.086, 0.722, 0.651);
    vec3 pink = vec3(0.850, 0.275, 0.937);
    vec3 blue = vec3(0.133, 0.827, 0.933);
    vec3 dark = vec3(0.02, 0.02, 0.05);

    // Create color based on noise values
    float blend1 = smoothstep(-0.3, 0.3, n1);
    float blend2 = smoothstep(-0.3, 0.3, n2);
    float blend3 = smoothstep(-0.3, 0.3, n3);

    vec3 color = mix(dark, teal, blend1 * 0.8);
    color = mix(color, pink, blend2 * 0.6);
    color = mix(color, blue, blend3 * 0.5);

    // Add some variation
    float detail = snoise(p * 4.0 + t);
    color += detail * 0.05;

    // Vignette
    float vignette = 1.0 - smoothstep(0.3, 0.9, length(uv - 0.5));
    color *= 0.7 + 0.3 * vignette;

    fragColor = vec4(color, 1.0);
}
`,
};

const kaleidoscopeShader: ShaderDefinition = {
  id: 'kaleidoscope',
  name: 'Kaleidoscope',
  description: 'Radial symmetry with rotating procedural patterns creating mandala-like visuals',
  uniforms: [
    { name: 'u_segments', label: 'Segments', type: 'int', min: 4, max: 16, step: 1, defaultValue: 8 },
    { name: 'u_rotationSpeed', label: 'Rotation Speed', type: 'float', min: 0, max: 2, step: 0.1, defaultValue: 0.5 },
    { name: 'u_zoom', label: 'Zoom', type: 'float', min: 0.5, max: 3, step: 0.1, defaultValue: 1.5 },
  ],
  fragmentSource: `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform int u_segments;
uniform float u_rotationSpeed;
uniform float u_zoom;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

// Simple hash function for pseudo-random
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 kaleidoscope(vec2 uv, int segments) {
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // Segment angle
    float segmentAngle = TAU / float(segments);

    // Fold the angle into one segment
    angle = mod(angle, segmentAngle);

    // Mirror alternate segments
    angle = abs(angle - segmentAngle * 0.5);

    return vec2(cos(angle), sin(angle)) * radius;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    float t = u_time * u_rotationSpeed;

    // Apply rotation
    float c = cos(t);
    float s = sin(t);
    uv = mat2(c, -s, s, c) * uv;

    // Apply kaleidoscope symmetry
    vec2 kUv = kaleidoscope(uv, u_segments);

    // Scale
    kUv *= u_zoom;

    // Create pattern
    float r = length(kUv);
    float a = atan(kUv.y, kUv.x);

    // Layered patterns
    float pattern1 = sin(r * 10.0 - t * 2.0) * 0.5 + 0.5;
    float pattern2 = sin(a * 5.0 + r * 5.0 + t) * 0.5 + 0.5;
    float pattern3 = noise(kUv * 3.0 + t * 0.5);

    // Combine patterns
    float pattern = pattern1 * pattern2;
    pattern = mix(pattern, pattern3, 0.3);

    // Site colors
    vec3 teal = vec3(0.086, 0.722, 0.651);
    vec3 pink = vec3(0.850, 0.275, 0.937);
    vec3 blue = vec3(0.133, 0.827, 0.933);
    vec3 dark = vec3(0.02, 0.02, 0.05);

    // Color mapping
    vec3 color = dark;
    color = mix(color, teal, smoothstep(0.2, 0.4, pattern));
    color = mix(color, pink, smoothstep(0.5, 0.7, pattern));
    color = mix(color, blue, smoothstep(0.7, 0.9, pattern));

    // Add glow at center
    float glow = exp(-r * 3.0) * 0.5;
    color += glow * mix(pink, blue, sin(t) * 0.5 + 0.5);

    // Radial fade
    color *= smoothstep(1.5, 0.2, r);

    fragColor = vec4(color, 1.0);
}
`,
};

const auroraShader: ShaderDefinition = {
  id: 'aurora',
  name: 'Aurora Borealis',
  description: 'Flowing curtains of light resembling the northern lights',
  uniforms: [
    { name: 'u_intensity', label: 'Intensity', type: 'float', min: 0.5, max: 2, step: 0.1, defaultValue: 1 },
    { name: 'u_speed', label: 'Speed', type: 'float', min: 0.5, max: 2, step: 0.1, defaultValue: 1 },
    { name: 'u_waveHeight', label: 'Wave Height', type: 'float', min: 0.3, max: 1, step: 0.05, defaultValue: 0.6 },
  ],
  fragmentSource: `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_intensity;
uniform float u_speed;
uniform float u_waveHeight;

out vec4 fragColor;

// Simplex noise function
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for(int i = 0; i < 5; i++) {
        value += amplitude * snoise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    float t = u_time * u_speed;

    // Site colors for aurora
    vec3 teal = vec3(0.086, 0.722, 0.651);
    vec3 pink = vec3(0.850, 0.275, 0.937);
    vec3 blue = vec3(0.133, 0.827, 0.933);
    vec3 dark = vec3(0.01, 0.01, 0.03);

    // Create multiple aurora curtains
    vec3 color = dark;

    for(int i = 0; i < 5; i++) {
        float fi = float(i);
        float offset = fi * 0.15;

        // Horizontal wave motion
        float wave = fbm(vec2(uv.x * 2.0 + t * 0.3 + fi, t * 0.1 + fi * 0.5));
        wave *= u_waveHeight;

        // Vertical position with wave
        float y = uv.y - 0.3 - offset + wave * 0.3;

        // Aurora curtain shape
        float curtain = exp(-y * y * 8.0);

        // Add flowing variation
        float flow = fbm(vec2(uv.x * 3.0 + t * 0.5, y * 2.0 + t * 0.2 + fi));
        curtain *= 0.5 + 0.5 * flow;

        // Shimmer effect
        float shimmer = sin(uv.x * 20.0 + t * 3.0 + fi * 2.0) * 0.5 + 0.5;
        shimmer *= sin(y * 30.0 + t * 2.0) * 0.5 + 0.5;
        curtain *= 0.7 + 0.3 * shimmer;

        // Color gradient within each curtain
        vec3 curtainColor;
        if(i < 2) {
            curtainColor = mix(teal, blue, smoothstep(-0.2, 0.2, y));
        } else if(i < 4) {
            curtainColor = mix(blue, pink, smoothstep(-0.1, 0.3, y));
        } else {
            curtainColor = mix(pink, teal, smoothstep(-0.1, 0.3, y));
        }

        // Add to color with intensity
        color += curtainColor * curtain * u_intensity * 0.4;
    }

    // Add stars in the dark areas
    float stars = pow(snoise(uv * 100.0), 8.0);
    stars *= smoothstep(0.3, 0.0, length(color));
    color += stars * 0.5;

    // Add subtle gradient at bottom (ground glow)
    float groundGlow = smoothstep(0.3, 0.0, uv.y);
    color += groundGlow * teal * 0.05;

    // Vignette
    float vignette = 1.0 - smoothstep(0.5, 1.5, length((uv - 0.5) * vec2(1.0, 0.5)));
    color *= vignette;

    fragColor = vec4(color, 1.0);
}
`,
};

// Export all shaders
export const SHADERS: ShaderDefinition[] = [
  plasmaShader,
  sphereShader,
  noiseShader,
  kaleidoscopeShader,
  auroraShader,
];

// Helper function to get a shader by ID
export function getShaderById(id: string): ShaderDefinition | undefined {
  return SHADERS.find(shader => shader.id === id);
}

// Helper function to get default uniform values for a shader
export function getDefaultUniforms(shader: ShaderDefinition): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const uniform of shader.uniforms) {
    defaults[uniform.name] = uniform.defaultValue;
  }
  return defaults;
}
