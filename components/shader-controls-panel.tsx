"use client";

import { useState } from "react";
import { SHADERS, getShaderById } from "./shader-gallery";

// ============================================================================
// Types
// ============================================================================

export interface ShaderControlsPanelProps {
  selectedShaderId: string;
  onShaderSelect: (shaderId: string) => void;
  uniforms: Record<string, number>;
  onUniformChange: (name: string, value: number) => void;
  onResetDefaults: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const SHADER_BUTTONS: { id: string; label: string }[] = [
  { id: "plasma", label: "Plas" },
  { id: "sphere", label: "Sphere" },
  { id: "noise", label: "Noise" },
  { id: "kaleidoscope", label: "Kaleid" },
  { id: "aurora", label: "Rora" },
];

// ============================================================================
// Icons
// ============================================================================

/**
 * Settings/Gear icon for toggle button
 */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Reset/Refresh icon
 */
function ResetIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

// ============================================================================
// Slider Component
// ============================================================================

/**
 * Slider component for numeric parameters
 */
function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  // Determine decimal places based on step
  const getDecimalPlaces = (step: number): number => {
    if (step < 0.01) return 4;
    if (step < 0.1) return 2;
    if (step < 1) return 1;
    return 0;
  };

  const decimalPlaces = getDecimalPlaces(step);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-foreground/80">{label}</span>
        <span className="text-muted font-mono">
          {value.toFixed(decimalPlaces)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent-teal
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-3
          [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-accent-teal
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * ShaderControlsPanel Component
 *
 * A glassmorphism-styled controls panel for selecting shaders and adjusting
 * their parameters. Positioned in the bottom-right corner with collapse/expand
 * functionality.
 */
export function ShaderControlsPanel({
  selectedShaderId,
  onShaderSelect,
  uniforms,
  onUniformChange,
  onResetDefaults,
}: ShaderControlsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const currentShader = getShaderById(selectedShaderId);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-2 -right-2 z-10 p-2 rounded-full
          bg-black/80 backdrop-blur-md border border-border
          text-foreground hover:text-accent-teal
          transition-all duration-300 hover:scale-105
          focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-black"
        aria-label={isExpanded ? "Collapse controls" : "Expand controls"}
      >
        <SettingsIcon
          className={`w-4 h-4 transition-transform duration-300 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* Panel */}
      <div
        className={`
          bg-black/60 backdrop-blur-xl border border-border rounded-xl
          shadow-2xl transition-all duration-300 ease-out overflow-hidden
          ${isExpanded ? "w-64 opacity-100" : "w-0 h-0 opacity-0 border-0"}
        `}
      >
        <div className={`p-4 ${isExpanded ? "" : "hidden"}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Controls</h3>
            <button
              onClick={onResetDefaults}
              className="p-1.5 rounded-md bg-surface/50 hover:bg-surface
                text-muted hover:text-accent-teal transition-colors
                focus:outline-none focus:ring-2 focus:ring-accent-teal"
              aria-label="Reset to defaults"
              title="Reset to defaults"
            >
              <ResetIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Shader Selector */}
          <div className="mb-4">
            <span className="text-xs text-foreground/80 block mb-2">
              Shader
            </span>
            <div className="grid grid-cols-5 gap-1">
              {SHADER_BUTTONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => onShaderSelect(id)}
                  className={`
                    px-1 py-1.5 text-xs rounded-md transition-all
                    focus:outline-none focus:ring-2 focus:ring-accent-teal
                    ${
                      selectedShaderId === id
                        ? "bg-accent-teal text-white font-medium"
                        : "bg-surface/50 text-muted hover:bg-surface hover:text-foreground"
                    }
                  `}
                  title={label}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Parameter Sliders */}
          {currentShader && currentShader.uniforms.length > 0 && (
            <div className="space-y-4">
              {currentShader.uniforms.map((uniform) => (
                <Slider
                  key={uniform.name}
                  label={uniform.label}
                  value={uniforms[uniform.name] ?? uniform.defaultValue}
                  onChange={(value) => onUniformChange(uniform.name, value)}
                  min={uniform.min}
                  max={uniform.max}
                  step={uniform.step}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShaderControlsPanel;
