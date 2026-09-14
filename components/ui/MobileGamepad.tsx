'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import VirtualJoystick, { JoystickMoveEvent, JoystickDirection } from './VirtualJoystick';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Gamepad2, Compass } from 'lucide-react';

export type MobileControlType = 'joystick' | 'dpad';

interface MobileGamepadProps {
  mode?: 'all' | 'horizontal' | 'vertical' | '4way' | '8way';
  onDirectionChange?: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  onMove?: (event: JoystickMoveEvent) => void;
  onRelease?: () => void;
  label?: string;
  className?: string;
}

export default function MobileGamepad({
  mode = '4way',
  onDirectionChange,
  onMove,
  onRelease,
  label = 'STEER',
  className = '',
}: MobileGamepadProps) {
  const [controlType, setControlType] = useState<MobileControlType>('joystick');
  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync preference with localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stressbuster_mobile_control_type') || localStorage.getItem('nexus_mobile_control_type');
      if (saved === 'dpad' || saved === 'joystick') {
        setControlType(saved);
      }
    } catch {}
  }, []);

  const handleSwitchType = (type: MobileControlType) => {
    setControlType(type);
    try {
      localStorage.setItem('stressbuster_mobile_control_type', type);
    } catch {}
    if (onRelease) onRelease();
  };

  const stopRepeat = useCallback(() => {
    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
      activeIntervalRef.current = null;
    }
    if (onRelease) onRelease();
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
  }, [onMove, onRelease]);

  const handleDpadPress = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    stopRepeat();

    // Trigger immediate event
    if (onDirectionChange) {
      onDirectionChange(dir);
    }

    let normX = 0;
    let normY = 0;
    let angleDeg = 0;
    if (dir === 'LEFT') { normX = -1; angleDeg = 180; }
    else if (dir === 'RIGHT') { normX = 1; angleDeg = 0; }
    else if (dir === 'UP') { normY = -1; angleDeg = 270; }
    else if (dir === 'DOWN') { normY = 1; angleDeg = 90; }

    if (onMove) {
      onMove({
        x: normX,
        y: normY,
        angle: (angleDeg * Math.PI) / 180,
        angleDeg,
        distance: 1,
        direction: dir,
        cardinal8: dir,
      });
    }

    // For continuous holding in horizontal/continuous modes
    if (mode === 'horizontal' || mode === 'all') {
      activeIntervalRef.current = setInterval(() => {
        if (onMove) {
          onMove({
            x: normX,
            y: normY,
            angle: (angleDeg * Math.PI) / 180,
            angleDeg,
            distance: 1,
            direction: dir,
            cardinal8: dir,
          });
        }
      }, 50);
    }
  }, [mode, onDirectionChange, onMove, stopRepeat]);

  useEffect(() => {
    return () => {
      if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    };
  }, []);

  return (
    <div className={`flex flex-col items-center w-full select-none ${className}`}>
      {/* Control Switcher Bar */}
      <div className="flex items-center gap-1.5 bg-white border-2 border-black p-1 rounded-xl mb-3 shadow-neo-sm">
        <button
          type="button"
          onClick={() => handleSwitchType('joystick')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
            controlType === 'joystick'
              ? 'bg-portal-cyan text-black shadow-neo-sm translate-x-0.5 translate-y-0.5'
              : 'text-slate-600 hover:text-black border-transparent'
          }`}
        >
          <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Joystick</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchType('dpad')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
            controlType === 'dpad'
              ? 'bg-portal-yellow text-black shadow-neo-sm translate-x-0.5 translate-y-0.5'
              : 'text-slate-600 hover:text-black border-transparent'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>D-Pad</span>
        </button>
      </div>

      {/* Control Display: Virtual Joystick vs D-Pad */}
      {controlType === 'joystick' ? (
        <VirtualJoystick
          mode={mode}
          onDirectionChange={onDirectionChange}
          onMove={onMove}
          onRelease={onRelease}
          label={label}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-2">
          {mode === 'horizontal' ? (
            /* Horizontal 2-Way D-Pad */
            <div className="flex items-center justify-center gap-6 w-full max-w-[280px]">
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleDpadPress('LEFT'); }}
                onPointerUp={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerLeave={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerCancel={(e) => { e.preventDefault(); stopRepeat(); }}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border-3 border-black text-black flex flex-col items-center justify-center font-black shadow-neo active:translate-x-1 active:translate-y-1 active:shadow-none active:bg-portal-cyan active:text-black transition-all touch-none"
              >
                <ChevronLeft className="w-8 h-8 stroke-[3]" />
                <span className="text-[10px] uppercase font-black tracking-wider">LEFT</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleDpadPress('RIGHT'); }}
                onPointerUp={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerLeave={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerCancel={(e) => { e.preventDefault(); stopRepeat(); }}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border-3 border-black text-black flex flex-col items-center justify-center font-black shadow-neo active:translate-x-1 active:translate-y-1 active:shadow-none active:bg-portal-cyan active:text-black transition-all touch-none"
              >
                <ChevronRight className="w-8 h-8 stroke-[3]" />
                <span className="text-[10px] uppercase font-black tracking-wider">RIGHT</span>
              </button>
            </div>
          ) : (
            /* 4-Way Cross D-Pad */
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* UP */}
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleDpadPress('UP'); }}
                onPointerUp={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerLeave={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerCancel={(e) => { e.preventDefault(); stopRepeat(); }}
                className="absolute top-0 w-13 h-13 rounded-xl bg-white border-3 border-black text-black flex items-center justify-center font-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none active:bg-portal-yellow active:text-black transition-all touch-none"
              >
                <ChevronUp className="w-7 h-7 stroke-[3]" />
              </button>

              {/* LEFT */}
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleDpadPress('LEFT'); }}
                onPointerUp={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerLeave={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerCancel={(e) => { e.preventDefault(); stopRepeat(); }}
                className="absolute left-0 w-13 h-13 rounded-xl bg-white border-3 border-black text-black flex items-center justify-center font-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none active:bg-portal-cyan active:text-black transition-all touch-none"
              >
                <ChevronLeft className="w-7 h-7 stroke-[3]" />
              </button>

              {/* Center Core */}
              <div className="w-11 h-11 rounded-full bg-slate-100 border-2 border-black flex items-center justify-center shadow-neo-sm">
                <div className="w-3 h-3 rounded-full bg-portal-pink animate-pulse" />
              </div>

              {/* RIGHT */}
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleDpadPress('RIGHT'); }}
                onPointerUp={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerLeave={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerCancel={(e) => { e.preventDefault(); stopRepeat(); }}
                className="absolute right-0 w-13 h-13 rounded-xl bg-white border-3 border-black text-black flex items-center justify-center font-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none active:bg-portal-cyan active:text-black transition-all touch-none"
              >
                <ChevronRight className="w-7 h-7 stroke-[3]" />
              </button>

              {/* DOWN */}
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleDpadPress('DOWN'); }}
                onPointerUp={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerLeave={(e) => { e.preventDefault(); stopRepeat(); }}
                onPointerCancel={(e) => { e.preventDefault(); stopRepeat(); }}
                className="absolute bottom-0 w-13 h-13 rounded-xl bg-white border-3 border-black text-black flex items-center justify-center font-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none active:bg-portal-yellow active:text-black transition-all touch-none"
              >
                <ChevronDown className="w-7 h-7 stroke-[3]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
