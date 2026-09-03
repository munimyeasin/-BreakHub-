'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

export type JoystickDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';
export type JoystickCardinal8 = 'UP' | 'UP_RIGHT' | 'RIGHT' | 'DOWN_RIGHT' | 'DOWN' | 'DOWN_LEFT' | 'LEFT' | 'UP_LEFT' | 'NONE';

export interface JoystickMoveEvent {
  x: number; // Normalized -1.0 to 1.0 (X-axis)
  y: number; // Normalized -1.0 to 1.0 (Y-axis)
  angle: number; // In radians (-PI to PI)
  angleDeg: number; // In degrees (0 to 360)
  distance: number; // Normalized distance ratio (0.0 to 1.0)
  direction: JoystickDirection;
  cardinal8: JoystickCardinal8;
}

interface VirtualJoystickProps {
  onMove?: (event: JoystickMoveEvent) => void;
  onDirectionChange?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  onRelease?: () => void;
  size?: number; // Outer diameter in px (default: 130)
  knobSize?: number; // Knob diameter in px (default: 52)
  deadzone?: number; // Deadzone radius in px (default: 12)
  mode?: 'all' | 'horizontal' | 'vertical' | '4way' | '8way';
  label?: string;
  className?: string;
  glowColor?: string; // Hex or CSS color
}

export default function VirtualJoystick({
  onMove,
  onDirectionChange,
  onRelease,
  size = 130,
  knobSize = 52,
  deadzone = 12,
  mode = 'all',
  label = 'MOVE',
  className = '',
  glowColor = '#00f0ff'
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [activeDirection, setActiveDirection] = useState<JoystickDirection>('NONE');

  const activeTouchIdRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<JoystickDirection>('NONE');
  const maxRadius = (size - knobSize) / 2;

  // Process movement coordinates relative to base center
  const processMovement = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;

    if (mode === 'horizontal') deltaY = 0;
    if (mode === 'vertical') deltaX = 0;

    const rawDistance = Math.hypot(deltaX, deltaY);
    const clampedDistance = Math.min(rawDistance, maxRadius);
    const angle = Math.atan2(deltaY, deltaX);

    // Calculate clamped knob position
    let knobX = 0;
    let knobY = 0;
    if (rawDistance > 0) {
      knobX = Math.cos(angle) * clampedDistance;
      knobY = Math.sin(angle) * clampedDistance;
    }

    setKnobPos({ x: knobX, y: knobY });

    // Normalized vector & deadzone evaluation
    if (rawDistance < deadzone) {
      if (lastDirectionRef.current !== 'NONE') {
        lastDirectionRef.current = 'NONE';
        setActiveDirection('NONE');
      }
      if (onMove) {
        onMove({
          x: 0,
          y: 0,
          angle: 0,
          angleDeg: 0,
          distance: 0,
          direction: 'NONE',
          cardinal8: 'NONE',
        });
      }
      return;
    }

    const normX = knobX / maxRadius;
    const normY = knobY / maxRadius;
    const normDist = clampedDistance / maxRadius;
    let angleDeg = (angle * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    // 4-Way Discrete Direction
    let dir: JoystickDirection = 'NONE';
    if (angleDeg >= 45 && angleDeg < 135) dir = 'DOWN';
    else if (angleDeg >= 135 && angleDeg < 225) dir = 'LEFT';
    else if (angleDeg >= 225 && angleDeg < 315) dir = 'UP';
    else dir = 'RIGHT';

    // 8-Way Cardinal Direction
    let card8: JoystickCardinal8 = 'NONE';
    if (angleDeg >= 337.5 || angleDeg < 22.5) card8 = 'RIGHT';
    else if (angleDeg >= 22.5 && angleDeg < 67.5) card8 = 'DOWN_RIGHT';
    else if (angleDeg >= 67.5 && angleDeg < 112.5) card8 = 'DOWN';
    else if (angleDeg >= 112.5 && angleDeg < 157.5) card8 = 'DOWN_LEFT';
    else if (angleDeg >= 157.5 && angleDeg < 202.5) card8 = 'LEFT';
    else if (angleDeg >= 202.5 && angleDeg < 247.5) card8 = 'UP_LEFT';
    else if (angleDeg >= 247.5 && angleDeg < 292.5) card8 = 'UP';
    else card8 = 'UP_RIGHT';

    setActiveDirection(dir);

    if (dir !== lastDirectionRef.current) {
      lastDirectionRef.current = dir;
      if (onDirectionChange && (dir === 'UP' || dir === 'DOWN' || dir === 'LEFT' || dir === 'RIGHT')) {
        onDirectionChange(dir);
      }
    }

    if (onMove) {
      onMove({
        x: normX,
        y: normY,
        angle,
        angleDeg,
        distance: normDist,
        direction: dir,
        cardinal8: card8,
      });
    }
  }, [deadzone, maxRadius, mode, onDirectionChange, onMove]);

  // Reset Joystick with spring return
  const resetJoystick = useCallback(() => {
    setKnobPos({ x: 0, y: 0 });
    setIsActive(false);
    activeTouchIdRef.current = null;
    lastDirectionRef.current = 'NONE';
    setActiveDirection('NONE');

    if (onMove) {
      onMove({
        x: 0,
        y: 0,
        angle: 0,
        angleDeg: 0,
        distance: 0,
        direction: 'NONE',
        cardinal8: 'NONE',
      });
    }
    if (onRelease) {
      onRelease();
    }
  }, [onMove, onRelease]);

  // Touch Event Handlers (Multi-Touch Capable)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    activeTouchIdRef.current = touch.identifier;
    setIsActive(true);
    processMovement(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchIdRef.current) {
        processMovement(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchIdRef.current) {
        resetJoystick();
        break;
      }
    }
  };

  // Pointer / Mouse Event Handlers (for desktop testing or stylus)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // Handled by touch events
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsActive(true);
    processMovement(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !isActive) return;
    processMovement(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    resetJoystick();
  };

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-center ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Outer PUBG-style Bounded Dial Base */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        className={`relative rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center transition-shadow duration-200 ${
          isActive
            ? 'bg-slate-900/80 border-2 border-portal-cyan shadow-[0_0_25px_rgba(0,240,255,0.45)]'
            : 'bg-slate-950/60 border border-slate-700/60 shadow-[0_0_12px_rgba(0,0,0,0.6)] backdrop-blur-sm'
        }`}
      >
        {/* Subtle Cyberpunk Concentric Range Ring */}
        <div
          className="absolute rounded-full border border-white/10 pointer-events-none"
          style={{ width: `${size * 0.65}px`, height: `${size * 0.65}px` }}
        />

        {/* Directional Reticle Indicator Crosshairs */}
        {/* UP Tick */}
        <div
          className={`absolute top-1.5 w-1.5 h-3 rounded-full transition-all duration-150 ${
            activeDirection === 'UP'
              ? 'bg-portal-cyan shadow-[0_0_8px_#00f0ff] scale-125'
              : 'bg-slate-600/60'
          }`}
        />
        {/* DOWN Tick */}
        <div
          className={`absolute bottom-1.5 w-1.5 h-3 rounded-full transition-all duration-150 ${
            activeDirection === 'DOWN'
              ? 'bg-portal-cyan shadow-[0_0_8px_#00f0ff] scale-125'
              : 'bg-slate-600/60'
          }`}
        />
        {/* LEFT Tick */}
        <div
          className={`absolute left-1.5 h-1.5 w-3 rounded-full transition-all duration-150 ${
            activeDirection === 'LEFT'
              ? 'bg-portal-cyan shadow-[0_0_8px_#00f0ff] scale-125'
              : 'bg-slate-600/60'
          }`}
        />
        {/* RIGHT Tick */}
        <div
          className={`absolute right-1.5 h-1.5 w-3 rounded-full transition-all duration-150 ${
            activeDirection === 'RIGHT'
              ? 'bg-portal-cyan shadow-[0_0_8px_#00f0ff] scale-125'
              : 'bg-slate-600/60'
          }`}
        />

        {/* Center Target Crosshair */}
        <div className="absolute w-2 h-2 rounded-full bg-slate-700 pointer-events-none" />

        {/* Floating Thumb Knob / Puck */}
        <div
          className={`absolute rounded-full pointer-events-none flex items-center justify-center transition-transform ${
            isActive ? 'duration-0 scale-105' : 'duration-200 ease-out scale-100'
          }`}
          style={{
            width: `${knobSize}px`,
            height: `${knobSize}px`,
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          }}
        >
          {/* Knob Outer Layer */}
          <div
            className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-all ${
              isActive
                ? 'bg-gradient-to-tr from-cyan-950 via-slate-900 to-cyan-800 border-portal-cyan shadow-[0_0_18px_#00f0ff]'
                : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 border-slate-500 shadow-md'
            }`}
          >
            {/* Concentric Grip Ring */}
            <div
              className={`w-6 h-6 rounded-full border border-dashed flex items-center justify-center ${
                isActive ? 'border-portal-cyan/60' : 'border-slate-500/40'
              }`}
            >
              {/* Center Dot Indicator */}
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isActive ? 'bg-portal-cyan shadow-[0_0_6px_#00f0ff]' : 'bg-slate-400'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Optional HUD Label */}
      {label && (
        <span className="mt-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase pointer-events-none">
          {label}
        </span>
      )}
    </div>
  );
}
