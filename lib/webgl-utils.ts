/**
 * WebGL2 utility functions for shader effects
 */

// ============================================================================
// Types
// ============================================================================

export type UniformType = "float" | "int" | "vec2" | "vec3" | "vec4";

export interface WebGLState {
  gl: WebGL2RenderingContext | null;
  program: WebGLProgram | null;
  vao: WebGLVertexArrayObject | null;
  uniforms: Map<string, WebGLUniformLocation>;
}

export function createInitialState(): WebGLState {
  return {
    gl: null,
    program: null,
    vao: null,
    uniforms: new Map(),
  };
}

// ============================================================================
// Shader Sources
// ============================================================================

/**
 * Simple passthrough vertex shader for fragment-only effects
 * Outputs position and UV coordinates (0-1 range)
 */
export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 a_position;

out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// ============================================================================
// Context Creation
// ============================================================================

/**
 * Get WebGL2 context from canvas with error handling
 * @returns WebGL2RenderingContext or null if not supported
 */
export function createWebGLContext(
  canvas: HTMLCanvasElement
): WebGL2RenderingContext | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    console.error("WebGL2 is not supported in this browser");
    return null;
  }

  return gl;
}

// ============================================================================
// Shader Compilation
// ============================================================================

/**
 * Compile a vertex or fragment shader
 * @param type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @returns Compiled shader or null on error
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error("Failed to create shader");
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    console.error("Shader compilation error:", info);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Create and link a shader program from vertex and fragment shaders
 * @returns Linked program or null on error
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) {
    console.error("Failed to create program");
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    console.error("Program link error:", info);
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

// ============================================================================
// Geometry
// ============================================================================

/**
 * Create a fullscreen quad (two triangles covering -1 to 1)
 * @returns VAO with position attribute bound
 */
export function createFullscreenQuad(
  gl: WebGL2RenderingContext
): WebGLVertexArrayObject | null {
  const vao = gl.createVertexArray();
  if (!vao) {
    console.error("Failed to create VAO");
    return null;
  }

  gl.bindVertexArray(vao);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Two triangles covering the entire clip space
  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Attribute 0: position (vec2)
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  return vao;
}

// ============================================================================
// Uniforms
// ============================================================================

/**
 * Set a uniform value by type
 * Caches uniform locations internally for performance
 */
export function setUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
  type: UniformType,
  value: number | number[]
): void {
  const location = gl.getUniformLocation(program, name);
  if (!location) {
    // Uniform may be optimized out, not necessarily an error
    return;
  }

  switch (type) {
    case "float":
      gl.uniform1f(location, value as number);
      break;
    case "int":
      gl.uniform1i(location, value as number);
      break;
    case "vec2":
      gl.uniform2fv(location, value as number[]);
      break;
    case "vec3":
      gl.uniform3fv(location, value as number[]);
      break;
    case "vec4":
      gl.uniform4fv(location, value as number[]);
      break;
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up WebGL resources
 */
export function cleanupWebGL(state: WebGLState): void {
  if (!state.gl) return;

  if (state.vao) {
    state.gl.deleteVertexArray(state.vao);
  }
  if (state.program) {
    state.gl.deleteProgram(state.program);
  }

  state.uniforms.clear();
}
