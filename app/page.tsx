"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShaderCanvas,
  ShaderControlsPanel,
  SHADERS,
  getShaderById,
  getDefaultUniforms,
} from "@/components";

/**
 * Shaders Page Header
 *
 * Stacked "SHADERS" header with multiple colored layers
 * Matches the sandbox page styling pattern
 */
function ShadersHeader() {
  return (
    <section className="mt-8 mb-8 relative overflow-hidden">
      <div className="flex flex-col">
        {/* Stacked text layers - scale up on larger screens */}
        <span className="text-3xl md:text-5xl lg:text-6xl stack-text text-accent-teal opacity-30 select-none">
          SHADERS
        </span>
        <span className="text-3xl md:text-5xl lg:text-6xl stack-text text-accent-pink opacity-50 select-none -mt-3 md:-mt-5 lg:-mt-6">
          SHADERS
        </span>
        <h1 className="text-4xl md:text-6xl lg:text-7xl stack-text text-foreground -mt-3 md:-mt-5 lg:-mt-6 relative z-10">
          SHADERS
        </h1>
        <span className="text-3xl md:text-5xl lg:text-6xl stack-text text-accent-blue opacity-50 select-none -mt-3 md:-mt-5 lg:-mt-6">
          SHADERS
        </span>
        <span className="text-3xl md:text-5xl lg:text-6xl stack-text text-surface opacity-30 select-none -mt-3 md:-mt-5 lg:-mt-6">
          SHADERS
        </span>
      </div>
      <p className="mt-6 text-sm md:text-base text-muted font-medium tracking-tight max-w-[300px] md:max-w-md">
        WebGL fragment shaders exploring raymarching, SDFs, and procedural
        textures.
      </p>
    </section>
  );
}

/**
 * Shaders Experiment Page
 *
 * Interactive WebGL shader gallery featuring raymarching,
 * signed distance functions, and procedural textures
 */
export default function ShadersPage() {
  // Shader selection state
  const [shaderId, setShaderId] = useState("plasma");

  // Uniform values - initialize with defaults for the initial shader
  const [uniforms, setUniforms] = useState<Record<string, number>>(() => {
    const initialShader = getShaderById("plasma");
    return initialShader ? getDefaultUniforms(initialShader) : {};
  });

  // Debug mode state
  const [showDebug, setShowDebug] = useState(false);

  // Error state for shader compilation failures
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle shader selection - updates shaderId and resets uniforms to new shader's defaults
   */
  const handleShaderSelect = useCallback((id: string) => {
    const shader = getShaderById(id);
    if (shader) {
      setShaderId(id);
      setUniforms(getDefaultUniforms(shader));
      setError(null); // Clear any previous errors
    }
  }, []);

  /**
   * Handle individual uniform value change
   */
  const handleUniformChange = useCallback((name: string, value: number) => {
    setUniforms((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  /**
   * Reset uniforms to current shader's defaults
   */
  const handleResetDefaults = useCallback(() => {
    const shader = getShaderById(shaderId);
    if (shader) {
      setUniforms(getDefaultUniforms(shader));
    }
  }, [shaderId]);

  /**
   * Cycle through shaders in the gallery
   * @param direction -1 for previous, +1 for next
   */
  const cycleShader = useCallback(
    (direction: -1 | 1) => {
      const currentIndex = SHADERS.findIndex((s) => s.id === shaderId);
      const nextIndex =
        (currentIndex + direction + SHADERS.length) % SHADERS.length;
      const nextShader = SHADERS[nextIndex];
      handleShaderSelect(nextShader.id);
    },
    [shaderId, handleShaderSelect]
  );

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault();
          cycleShader(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          cycleShader(1);
          break;
        case "KeyR":
          handleResetDefaults();
          break;
        case "KeyD":
          setShowDebug((prev) => !prev);
          break;
        case "Digit1":
          if (SHADERS[0]) handleShaderSelect(SHADERS[0].id);
          break;
        case "Digit2":
          if (SHADERS[1]) handleShaderSelect(SHADERS[1].id);
          break;
        case "Digit3":
          if (SHADERS[2]) handleShaderSelect(SHADERS[2].id);
          break;
        case "Digit4":
          if (SHADERS[3]) handleShaderSelect(SHADERS[3].id);
          break;
        case "Digit5":
          if (SHADERS[4]) handleShaderSelect(SHADERS[4].id);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cycleShader, handleResetDefaults, handleShaderSelect]);

  return (
    <div className="max-w-md md:max-w-3xl lg:max-w-6xl mx-auto px-6 pb-24">
      {/* Stacked header */}
      <ShadersHeader />

      {/* Canvas container */}
      <section className="relative">
        <div
          id="canvas-container"
          className="w-full aspect-[4/3] md:aspect-[16/9] bg-black rounded-lg border border-border overflow-hidden relative"
        >
          {/* WebGL Shader Canvas */}
          <ShaderCanvas
            shaderId={shaderId}
            uniforms={uniforms}
            onError={setError}
            showDebug={showDebug}
          />

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="max-w-md p-4 bg-red-950/50 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400 font-medium mb-1">
                  Shader Error
                </p>
                <p className="text-xs text-red-300/80 font-mono">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls panel - positioned over canvas */}
        <ShaderControlsPanel
          selectedShaderId={shaderId}
          onShaderSelect={handleShaderSelect}
          uniforms={uniforms}
          onUniformChange={handleUniformChange}
          onResetDefaults={handleResetDefaults}
        />

        {/* Keyboard shortcuts hint */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
          <span>
            <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-foreground font-mono">
              Left/Right
            </kbd>{" "}
            Cycle shaders
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-foreground font-mono">
              R
            </kbd>{" "}
            Reset
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-foreground font-mono">
              D
            </kbd>{" "}
            Debug
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-foreground font-mono">
              1-5
            </kbd>{" "}
            Select shader
          </span>
        </div>
      </section>

      {/* Description section */}
      <section className="mt-12 pt-8 border-t border-border">
        <p className="text-xs text-muted font-medium uppercase tracking-widest mb-2">
          About This Experiment
        </p>
        <p className="text-sm text-muted font-medium max-w-prose">
          Fragment shaders run on the GPU, computing color values for every
          pixel in parallel. This gallery showcases various techniques including
          raymarching through signed distance functions, procedural noise
          patterns, and real-time mathematical visualizations.
        </p>
      </section>
    </div>
  );
}
