"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  createWebGLContext,
  compileShader,
  createProgram,
  createFullscreenQuad,
  setUniform,
  VERTEX_SHADER_SOURCE,
} from "@/lib/webgl-utils";
import { getShaderById } from "./shader-gallery";

/**
 * Props for the ShaderCanvas component
 */
export interface ShaderCanvasProps {
  /** ID of the shader to render from the gallery */
  shaderId: string;
  /** Custom uniform values to pass to the shader */
  uniforms: Record<string, number>;
  /** Callback when shader compilation fails */
  onError?: (error: string) => void;
  /** Show FPS debug overlay */
  showDebug?: boolean;
}

/**
 * FPS monitor for performance tracking
 */
interface FPSMonitor {
  samples: number[];
  lastTime: number;
  currentFPS: number;
}

const FPS_SAMPLE_SIZE = 30;

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Create FPS monitor
 */
function createFPSMonitor(): FPSMonitor {
  return {
    samples: [],
    lastTime: performance.now(),
    currentFPS: 60,
  };
}

/**
 * Update FPS monitor with new frame
 */
function updateFPSMonitor(monitor: FPSMonitor): number {
  const now = performance.now();
  const delta = now - monitor.lastTime;
  monitor.lastTime = now;

  if (delta > 0) {
    const fps = 1000 / delta;
    monitor.samples.push(fps);

    // Keep only recent samples
    if (monitor.samples.length > FPS_SAMPLE_SIZE) {
      monitor.samples.shift();
    }

    // Calculate average FPS
    const avgFPS =
      monitor.samples.reduce((a, b) => a + b, 0) / monitor.samples.length;
    monitor.currentFPS = avgFPS;
  }

  return monitor.currentFPS;
}

/**
 * ShaderCanvas Component
 *
 * Renders WebGL2 fragment shaders from the shader gallery.
 * Handles shader compilation, uniform updates, mouse tracking,
 * and ResizeObserver-based canvas sizing.
 */
export function ShaderCanvas({
  shaderId,
  uniforms,
  onError,
  showDebug = false,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());
  const fpsMonitorRef = useRef<FPSMonitor>(createFPSMonitor());
  const hasErrorRef = useRef<boolean>(false);

  // Mouse tracking refs
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const currentMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Store current props in refs to avoid stale closures
  const uniformsRef = useRef(uniforms);
  const showDebugRef = useRef(showDebug);

  // Update refs when props change
  useEffect(() => {
    uniformsRef.current = uniforms;
  }, [uniforms]);

  useEffect(() => {
    showDebugRef.current = showDebug;
  }, [showDebug]);

  /**
   * Initialize or reinitialize the shader program
   */
  const initShader = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;

    if (!canvas || !gl) return false;

    // Clean up existing program
    if (programRef.current) {
      gl.deleteProgram(programRef.current);
      programRef.current = null;
    }

    // Get shader definition
    const shaderDef = getShaderById(shaderId);
    if (!shaderDef) {
      const error = `Shader not found: ${shaderId}`;
      console.error(error);
      onError?.(error);
      hasErrorRef.current = true;
      return false;
    }

    // Compile vertex shader
    const vertexShader = compileShader(
      gl,
      gl.VERTEX_SHADER,
      VERTEX_SHADER_SOURCE
    );
    if (!vertexShader) {
      const error = "Failed to compile vertex shader";
      console.error(error);
      onError?.(error);
      hasErrorRef.current = true;
      return false;
    }

    // Compile fragment shader
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      shaderDef.fragmentSource
    );
    if (!fragmentShader) {
      gl.deleteShader(vertexShader);
      const error = `Failed to compile fragment shader: ${shaderDef.name}`;
      console.error(error);
      onError?.(error);
      hasErrorRef.current = true;
      return false;
    }

    // Link program
    const program = createProgram(gl, vertexShader, fragmentShader);

    // Clean up shaders (they're attached to the program now)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!program) {
      const error = `Failed to link shader program: ${shaderDef.name}`;
      console.error(error);
      onError?.(error);
      hasErrorRef.current = true;
      return false;
    }

    programRef.current = program;
    hasErrorRef.current = false;
    return true;
  }, [shaderId, onError]);

  /**
   * Handle canvas resize to fill container
   */
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const { width, height } = parent.getBoundingClientRect();

    // Set canvas dimensions to match container
    canvas.width = width;
    canvas.height = height;

    // Update viewport if GL context exists
    const gl = glRef.current;
    if (gl) {
      gl.viewport(0, 0, width, height);
    }
  }, []);

  /**
   * Handle mouse movement
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    // Flip Y for GL coordinates (0 at bottom, 1 at top)
    const y = 1 - (e.clientY - rect.top) / rect.height;

    targetMouseRef.current = { x, y };
  }, []);

  /**
   * Handle touch events
   */
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    // Flip Y for GL coordinates
    const y = 1 - (touch.clientY - rect.top) / rect.height;

    targetMouseRef.current = { x, y };
  }, []);

  /**
   * Draw FPS debug overlay
   */
  const drawDebugOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, fps: number) => {
      ctx.save();

      // Draw background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(10, 10, 100, 30);

      // Draw text
      ctx.fillStyle = fps < 30 ? "#ef4444" : "#14b8a6";
      ctx.font = "14px monospace";
      ctx.fillText(`FPS: ${fps.toFixed(1)}`, 20, 30);

      ctx.restore();
    },
    []
  );

  // Initialize WebGL context and start render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get WebGL2 context
    const gl = createWebGLContext(canvas);
    if (!gl) {
      const error = "WebGL2 is not supported in this browser";
      console.error(error);
      onError?.(error);
      hasErrorRef.current = true;
      return;
    }

    glRef.current = gl;

    // Initial resize
    handleResize();

    // Create fullscreen quad VAO
    const vao = createFullscreenQuad(gl);
    if (!vao) {
      const error = "Failed to create fullscreen quad";
      console.error(error);
      onError?.(error);
      hasErrorRef.current = true;
      return;
    }

    vaoRef.current = vao;

    // Initialize shader
    if (!initShader()) {
      return;
    }

    // Reset timing
    startTimeRef.current = performance.now();
    fpsMonitorRef.current = createFPSMonitor();

    // Get 2D context for debug overlay
    // We need a separate canvas for the debug overlay since we're using WebGL
    let debugCanvas: HTMLCanvasElement | null = null;
    let debugCtx: CanvasRenderingContext2D | null = null;

    if (showDebugRef.current) {
      debugCanvas = document.createElement("canvas");
      debugCanvas.style.position = "absolute";
      debugCanvas.style.top = "0";
      debugCanvas.style.left = "0";
      debugCanvas.style.pointerEvents = "none";
      canvas.parentElement?.appendChild(debugCanvas);
      debugCtx = debugCanvas.getContext("2d");
    }

    /**
     * Main render loop
     */
    const render = () => {
      if (!gl || !programRef.current || !vaoRef.current || hasErrorRef.current) {
        // Draw fallback dark background if there's an error
        if (hasErrorRef.current) {
          gl?.clearColor(0.02, 0.02, 0.05, 1.0);
          gl?.clear(gl.COLOR_BUFFER_BIT);
        }
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Update FPS monitor
      const currentFPS = updateFPSMonitor(fpsMonitorRef.current);

      // Smooth mouse interpolation
      currentMouseRef.current.x = lerp(
        currentMouseRef.current.x,
        targetMouseRef.current.x,
        0.1
      );
      currentMouseRef.current.y = lerp(
        currentMouseRef.current.y,
        targetMouseRef.current.y,
        0.1
      );

      // Calculate time in seconds
      const time = (performance.now() - startTimeRef.current) / 1000;

      // Clear canvas
      gl.clearColor(0.02, 0.02, 0.05, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Use program
      gl.useProgram(programRef.current);

      // Bind VAO
      gl.bindVertexArray(vaoRef.current);

      // Set standard uniforms
      setUniform(gl, programRef.current, "u_time", "float", time);
      setUniform(gl, programRef.current, "u_resolution", "vec2", [
        canvas.width,
        canvas.height,
      ]);
      setUniform(gl, programRef.current, "u_mouse", "vec2", [
        currentMouseRef.current.x,
        currentMouseRef.current.y,
      ]);

      // Set custom uniforms from props
      const currentUniforms = uniformsRef.current;
      for (const [name, value] of Object.entries(currentUniforms)) {
        // Determine uniform type based on name convention
        // Integers typically have names like u_octaves, u_segments
        const isInt = name.includes("octave") || name.includes("segment");
        setUniform(
          gl,
          programRef.current!,
          name,
          isInt ? "int" : "float",
          value
        );
      }

      // Draw fullscreen quad (6 vertices)
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Unbind VAO
      gl.bindVertexArray(null);

      // Draw debug overlay if enabled
      if (showDebugRef.current && debugCanvas && debugCtx) {
        debugCanvas.width = canvas.width;
        debugCanvas.height = canvas.height;
        debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
        drawDebugOverlay(debugCtx, currentFPS);
      }

      // Continue render loop
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    render();

    // Set up event listeners
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
      if (debugCanvas) {
        debugCanvas.width = canvas.width;
        debugCanvas.height = canvas.height;
      }
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();

      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);

      // Clean up debug canvas
      if (debugCanvas && debugCanvas.parentElement) {
        debugCanvas.parentElement.removeChild(debugCanvas);
      }

      // Clean up WebGL resources
      if (gl) {
        if (vaoRef.current) {
          gl.deleteVertexArray(vaoRef.current);
          vaoRef.current = null;
        }
        if (programRef.current) {
          gl.deleteProgram(programRef.current);
          programRef.current = null;
        }
      }

      glRef.current = null;
    };
  }, [
    handleResize,
    initShader,
    handleMouseMove,
    handleTouchMove,
    drawDebugOverlay,
    onError,
  ]);

  // Reinitialize shader when shaderId changes
  useEffect(() => {
    if (glRef.current && vaoRef.current) {
      initShader();
      // Reset timing for new shader
      startTimeRef.current = performance.now();
    }
  }, [shaderId, initShader]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export default ShaderCanvas;
