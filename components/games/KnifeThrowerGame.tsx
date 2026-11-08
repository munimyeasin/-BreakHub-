'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Target, Trophy, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

interface KnifeThrowerGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;

interface StuckKnife {
  angle: number;
}

interface FlyingKnife {
  x: number;
  y: number;
  vy: number;
  vx: number;
  rotation: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
}

export default function KnifeThrowerGame({ gameId: _gameId, onGameOver }: KnifeThrowerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [, setKnivesLeft] = useState(7);
  const [soundEnabled, setSoundEnabled] = useState(true);

  void _gameId;

  const soundEnabledRef = useRef(true);
  const onGameOverRef = useRef(onGameOver);
  const scoreRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  const wheelAngleRef = useRef(0);
  const wheelSpeedRef = useRef(0.022);
  const wheelWobbleRef = useRef(0);
  const targetPiecesRef = useRef<{ x: number; y: number; vx: number; vy: number; rot: number; vRot: number; color: string }[] | null>(null);
  const fallingKnivesRef = useRef<{ x: number; y: number; vx: number; vy: number; rot: number; vRot: number }[] | null>(null);
  const stuckKnivesRef = useRef<StuckKnife[]>([]);
  const flyingKnifeRef = useRef<FlyingKnife | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const levelKnivesTotalRef = useRef(7);
  const knivesRemainingRef = useRef(7);
  const isTransitioningRef = useRef(false);
  const bossHealthRef = useRef(0);
  const bossMaxHealthRef = useRef(0);

  const playSfx = useCallback((type: 'throw' | 'hit' | 'clash' | 'levelClear' | 'gameOver' | 'bossHit') => {
    if (!soundEnabledRef.current || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'throw') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'bossHit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.15);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'clash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(35, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'levelClear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'gameOver') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {}
  }, []);

  const addKatanaParticles = (x: number, y: number, color: string, count = 28) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.floor(Math.random() * 3),
        color,
        alpha: 1,
        life: 0,
        maxLife: 18 + Math.random() * 20,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#FFE600') => {
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -2.2,
      life: 0,
    });
  };

  const initLevel = (lvl: number) => {
    setLevel(lvl);
    targetPiecesRef.current = null;
    fallingKnivesRef.current = null;
    let knivesCount = 7 + Math.floor((lvl - 1) * 1.5);
    if (lvl % 5 === 0) {
      knivesCount = 12 + Math.floor(lvl / 2);
      bossMaxHealthRef.current = 6 + Math.floor(lvl / 5) * 4;
      bossHealthRef.current = bossMaxHealthRef.current;
    } else {
      bossHealthRef.current = 0;
    }

    levelKnivesTotalRef.current = knivesCount;
    knivesRemainingRef.current = knivesCount;
    setKnivesLeft(knivesCount);
    stuckKnivesRef.current = [];

    if (lvl > 2 && lvl % 5 !== 0) {
      const preStuck = Math.min(4, Math.floor(lvl / 2));
      for (let i = 0; i < preStuck; i++) {
        const randomAngle = (i * ((Math.PI * 2) / preStuck)) + (Math.random() * 0.4);
        stuckKnivesRef.current.push({ angle: randomAngle });
      }
    }

    const baseSpeed = 0.02 + (lvl * 0.0035);
    const randomDirection = Math.random() < 0.5 ? 1 : -1;
    wheelSpeedRef.current = (lvl % 2 === 0 ? -baseSpeed : baseSpeed) * randomDirection;
  };

  const startGame = () => {
    scoreRef.current = 0;
    setDisplayScore(0);
    flyingKnifeRef.current = null;
    particlesRef.current = [];
    floatingTextsRef.current = [];
    isTransitioningRef.current = false;
    setIsDead(false);
    initLevel(1);
    setIsPlaying(true);
  };

  const throwKnife = useCallback(() => {
    if (!isPlaying || isDead || isTransitioningRef.current) return;
    if (flyingKnifeRef.current !== null) return;
    if (knivesRemainingRef.current <= 0) return;

    flyingKnifeRef.current = {
      x: CANVAS_WIDTH / 2,
      y: 530,
      vy: -27,
      vx: 0,
      rotation: 0,
    };
    knivesRemainingRef.current -= 1;
    setKnivesLeft(knivesRemainingRef.current);
    playSfx('throw');
  }, [isPlaying, isDead, playSfx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        throwKnife();
      } else if (e.key === 'r' || e.key === 'R') {
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [throwKnife]);

  // ==========================================
  // 3D KATANA BLADE RENDERING FUNCTION (Exact Match to Cyber Slicer Style)
  // ==========================================
  const draw3DKatanaBlade = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    scale = 0.55,
    alpha = 1.0
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    // Hard Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(6, 6, 8, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Blade Spine (Thick Dark Steel Polygon)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-6, -110);
    ctx.lineTo(0, -120);
    ctx.lineTo(0, 45);
    ctx.lineTo(-6, 40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Main Steel Bevel Face (Glossy Steel Gradient)
    const steelGrad = ctx.createLinearGradient(0, -120, 10, 45);
    steelGrad.addColorStop(0, '#FFFFFF');
    steelGrad.addColorStop(0.35, '#E2E8F0');
    steelGrad.addColorStop(0.7, '#94A3B8');
    steelGrad.addColorStop(1, '#475569');
    ctx.fillStyle = steelGrad;
    ctx.beginPath();
    ctx.moveTo(0, -120);
    ctx.lineTo(12, -100);
    ctx.lineTo(7, 45);
    ctx.lineTo(0, 45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Neon Laser Cutting Edge (Magenta -> Cyan Laser Core)
    const edgeGrad = ctx.createLinearGradient(12, -100, 10, 45);
    edgeGrad.addColorStop(0, '#FF3DF5');
    edgeGrad.addColorStop(0.5, '#FF007F');
    edgeGrad.addColorStop(1, '#00F0FF');
    ctx.fillStyle = edgeGrad;
    ctx.beginPath();
    ctx.moveTo(12, -100);
    ctx.lineTo(16, -90);
    ctx.lineTo(10, 45);
    ctx.lineTo(7, 45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Specular Reflection Glare Streak
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.moveTo(2, -110);
    ctx.lineTo(7, -90);
    ctx.lineTo(3, 35);
    ctx.lineTo(-1, 35);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha;

    // 3D Sword Guard (Tsuba)
    ctx.save();
    ctx.translate(3, 48);
    const tsubaGrad = ctx.createLinearGradient(-22, 0, 22, 0);
    tsubaGrad.addColorStop(0, '#FFF570');
    tsubaGrad.addColorStop(1, '#D49B00');

    ctx.fillStyle = '#805D00';
    ctx.beginPath();
    ctx.ellipse(0, 3.5, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = tsubaGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // 3D Handle (Tsuka) with Gold Diamond Wrap Lacing
    ctx.save();
    ctx.translate(3, 56);
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.rect(-6, 0, 12, 48);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    const diamondGrad = ctx.createLinearGradient(-4, 0, 4, 0);
    diamondGrad.addColorStop(0, '#FFF570');
    diamondGrad.addColorStop(1, '#D49B00');
    ctx.fillStyle = diamondGrad;

    for (let d = 6; d <= 36; d += 12) {
      ctx.beginPath();
      ctx.moveTo(0, d);
      ctx.lineTo(4, d + 5);
      ctx.lineTo(0, d + 10);
      ctx.lineTo(-4, d + 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Pommel (Kashira)
    ctx.fillStyle = diamondGrad;
    ctx.beginPath();
    ctx.rect(-7, 46, 14, 6);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  };

  // 3D Extruded Target Band — Cyber Slicer cube-style extrusion for the wheel rings
  const drawExtrudedBand = (
    ctx: CanvasRenderingContext2D,
    outerR: number,
    innerR: number,
    faceColor: string,
    sideColor: string
  ) => {
    // Hard Drop Shadow
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(4, 4, outerR, 0, Math.PI * 2);
    ctx.fill();

    // 3D Extruded Side Facet (Dark Shaded Outer Ring)
    const sideGrad = ctx.createLinearGradient(-outerR, -outerR, outerR, outerR);
    sideGrad.addColorStop(0, sideColor);
    sideGrad.addColorStop(1, '#000000');
    ctx.fillStyle = sideGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Glossy Front Face
    const faceGrad = ctx.createLinearGradient(-outerR, -outerR, outerR, outerR);
    faceGrad.addColorStop(0, faceColor);
    faceGrad.addColorStop(1, sideColor);
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Specular Reflection Highlight removed to eliminate white triangular/pyramid streak artifacts
    ctx.globalAlpha = 1;

    // Neo Circuit Center Node
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
  };

  // Main 60fps Game Loop
  useEffect(() => {
    if (!isPlaying || isDead) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const wheelCenter = { x: CANVAS_WIDTH / 2, y: 185 };
    const wheelRadius = 102;

    const render = () => {
      // 1. Wheel Rotation & Wobble
      wheelAngleRef.current += wheelSpeedRef.current;
      if (wheelAngleRef.current > Math.PI * 2) {
        wheelAngleRef.current -= Math.PI * 2;
      }
      wheelWobbleRef.current = Math.sin(Date.now() * 0.007) * 2;

      // 2. Flying Katana Physics
      if (flyingKnifeRef.current) {
        const knife = flyingKnifeRef.current;
        knife.y += knife.vy;
        knife.x += knife.vx;
        knife.rotation += 0.3;

        const dx = knife.x - wheelCenter.x;
        const dy = knife.y - wheelCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const isBoss = level % 5 === 0;
        const targetHitRadius = isBoss ? wheelRadius + 22 : wheelRadius + 14;

        if (dist <= targetHitRadius) {
          // When the knife hits the wheel from the bottom, the collision point angle is around Math.PI / 2 (straight down from center).
          // To ensure it sticks at the exact bottom of the target (local angle Math.PI / 2 relative to the wheel rotation),
          // we compute local angle such that localAngle = hitGlobalAngle - wheelAngleRef.current.
          const hitGlobalAngle = Math.atan2(dy, dx);
          let localAngle = hitGlobalAngle - wheelAngleRef.current;
          while (localAngle < 0) localAngle += Math.PI * 2;
          while (localAngle >= Math.PI * 2) localAngle -= Math.PI * 2;

          let collided = false;
          for (const stuck of stuckKnivesRef.current) {
            let angleDiff = Math.abs(stuck.angle - localAngle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
            if (angleDiff < 0.24) {
              collided = true;
              break;
            }
          }

          if (collided) {
            playSfx('clash');
            addKatanaParticles(knife.x, knife.y, '#FF0055', 40);
            setIsDead(true);
            setIsPlaying(false);
            playSfx('gameOver');
            onGameOverRef.current(scoreRef.current);
          } else {
            if (isBoss) {
              bossHealthRef.current -= 1;
              playSfx('bossHit');
              addKatanaParticles(knife.x, knife.y, '#BD00FF', 30);
              addFloatingText(wheelCenter.x, wheelCenter.y - wheelRadius - 35, 'CRITICAL SLASH!', '#BD00FF');
            } else {
              playSfx('hit');
              addKatanaParticles(knife.x, knife.y, '#00F0FF', 22);
              addFloatingText(wheelCenter.x, wheelCenter.y - wheelRadius - 28, '+30', '#FFE600');
            }

            stuckKnivesRef.current.push({ angle: localAngle });
            scoreRef.current += isBoss ? 60 : 30;
            setDisplayScore(scoreRef.current);
            flyingKnifeRef.current = null;

            const levelCleared = isBoss
              ? bossHealthRef.current <= 0
              : stuckKnivesRef.current.length >= levelKnivesTotalRef.current;

            if (levelCleared && !isTransitioningRef.current) {
              isTransitioningRef.current = true;
              playSfx('levelClear');
              const bonus = level * 300;
              scoreRef.current += bonus;
              setDisplayScore(scoreRef.current);
              addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, `STAGE ${level} CLEARED! +${bonus}`, '#FFE600');
              confetti({ particleCount: 90, spread: 100, origin: { y: 0.5 } });

              // Shatter target into pieces immediately on stage clear
              targetPiecesRef.current = [];
              fallingKnivesRef.current = [];
              stuckKnivesRef.current.forEach((stuck) => {
                const globalAngle = stuck.angle + wheelAngleRef.current;
                const kx = wheelCenter.x + Math.cos(globalAngle) * wheelRadius;
                const ky = wheelCenter.y + Math.sin(globalAngle) * wheelRadius;
                fallingKnivesRef.current!.push({
                  x: kx,
                  y: ky,
                  vx: Math.cos(globalAngle) * (4 + Math.random() * 4),
                  vy: Math.sin(globalAngle) * (4 + Math.random() * 4) - 2,
                  rot: globalAngle - Math.PI / 2,
                  vRot: (Math.random() - 0.5) * 0.35
                });
              });
              stuckKnivesRef.current = [];

              const numPieces = 10;
              const isBossLevel = level % 5 === 0;
              for (let i = 0; i < numPieces; i++) {
                const angle = (i / numPieces) * Math.PI * 2;
                targetPiecesRef.current.push({
                  x: wheelCenter.x + Math.cos(angle) * 35,
                  y: wheelCenter.y + Math.sin(angle) * 35,
                  vx: Math.cos(angle) * (5 + Math.random() * 6),
                  vy: Math.sin(angle) * (5 + Math.random() * 6) - 3,
                  rot: angle,
                  vRot: (Math.random() - 0.5) * 0.25,
                  color: isBossLevel ? '#FF0055' : '#00F0FF'
                });
              }

              setTimeout(() => {
                const nextLevel = level + 1;
                initLevel(nextLevel);
                isTransitioningRef.current = false;
              }, 1400);
            }
          }
        } else if (knife.y < -50) {
          flyingKnifeRef.current = null;
        }
      }

      // 3. Render Dojo Background
      ctx.fillStyle = '#18000F';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const dojoGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT * 0.45,
        20,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT * 0.45,
        CANVAS_WIDTH * 0.8
      );
      dojoGrad.addColorStop(0, 'rgba(255, 0, 127, 0.16)');
      dojoGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.08)');
      dojoGrad.addColorStop(1, 'rgba(24, 0, 15, 0)');
      ctx.fillStyle = dojoGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = '#3D1030';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 4. Render Rotating 3D Extruded Cyber Target Wheel (Cyber Slicer style)
      // If targetPiecesRef is active, render shattering pieces instead of the intact wheel
      if (targetPiecesRef.current) {
        targetPiecesRef.current.forEach((piece) => {
          piece.x += piece.vx;
          piece.y += piece.vy;
          piece.vy += 0.45; // gravity
          piece.rot += piece.vRot;

          ctx.save();
          ctx.translate(piece.x, piece.y);
          ctx.rotate(piece.rot);
          ctx.fillStyle = piece.color;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      } else {
        ctx.save();
        ctx.translate(wheelCenter.x + wheelWobbleRef.current, wheelCenter.y);
        ctx.rotate(wheelAngleRef.current);

        const isBossStage = level % 5 === 0;
        const faceColor = isBossStage ? '#FF0055' : '#00F0FF';
        const sideColor = isBossStage ? '#BA005C' : '#006699';

        // Outer rim ring (largest band)
        drawExtrudedBand(ctx, wheelRadius, wheelRadius * 0.82, faceColor, sideColor);

        // Concentric inner rings stepping down to the hub
        for (let r = wheelRadius * 0.8; r > 22; r -= 16) {
          const inner = Math.max(4, r - 14);
          drawExtrudedBand(ctx, r, inner, faceColor, sideColor);
        }

        // Central Neo Hub Node
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(3, 3, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFE600';
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Hub circuit node dot
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Render Stuck Katanas on Rotating Target Wheel
      // Knives embed tip-INWARD at the exact contact point. The blade's local
      // frame points along -Y, so to sit at screen angle φ with the tip toward
      // the wheel center we rotate by φ - π/2 and translate (0, wheelRadius):
      //   position = center + R(φ-π/2)*(0,R) = center + R*(cos φ, sin φ)  ✓ bottom
      //   tip dir  = R(φ-π/2)*(0,-1) = -(cos φ, sin φ) → toward center  ✓
      // (The old rotate(Math.PI) + rotate(φ) + translate(0,R) mapped a bottom
      // hit to the left edge of the wheel — the glitch.)
      stuckKnivesRef.current.forEach((stuck) => {
        const globalAngle = stuck.angle + wheelAngleRef.current;
        ctx.save();
        ctx.translate(wheelCenter.x, wheelCenter.y);
        ctx.rotate(globalAngle - Math.PI / 2);
        ctx.translate(0, wheelRadius);
        draw3DKatanaBlade(ctx, 0, 0, 0, 0.42, 1.0);
        ctx.restore();
      });

      // Render falling debris knives
      if (fallingKnivesRef.current) {
        fallingKnivesRef.current.forEach((fk) => {
          fk.x += fk.vx;
          fk.y += fk.vy;
          fk.vy += 0.45; // gravity
          fk.rot += fk.vRot;

          draw3DKatanaBlade(ctx, fk.x, fk.y, fk.rot, 0.42, 1.0);
        });
      }

      // Boss Health HUD Bar
      const isBossStage = level % 5 === 0;
      if (isBossStage) {
        const barWidth = 190;
        const barHeight = 16;
        const barX = wheelCenter.x - barWidth / 2;
        const barY = wheelCenter.y - wheelRadius - 42;

        ctx.save();
        ctx.fillStyle = '#18000F';
        ctx.fillRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);
        ctx.strokeStyle = '#FF0055';
        ctx.lineWidth = 3;
        ctx.strokeRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);

        const healthPercent = Math.max(0, bossHealthRef.current / bossMaxHealthRef.current);
        ctx.fillStyle = '#FF0055';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`BOSS SHIELD: ${bossHealthRef.current} / ${bossMaxHealthRef.current}`, wheelCenter.x, barY - 6);
        ctx.restore();
      }

      // 6. Render Flying Katana in Flight
      if (flyingKnifeRef.current) {
        const fk = flyingKnifeRef.current;
        draw3DKatanaBlade(ctx, fk.x, fk.y, 0, 0.48, 1.0);
      }

      // 7. Render Ready Katana Stung at Bottom Launcher
      if (!isTransitioningRef.current && flyingKnifeRef.current === null && knivesRemainingRef.current > 0) {
        // If target is shattering during transition, make the ready knife fall down with gravity
        const fallOffsetY = targetPiecesRef.current && targetPiecesRef.current.length > 0 ? 120 : 0;
        draw3DKatanaBlade(ctx, CANVAS_WIDTH / 2, 570 + fallOffsetY, targetPiecesRef.current && targetPiecesRef.current.length > 0 ? 0.2 : 0, 0.52, targetPiecesRef.current && targetPiecesRef.current.length > 0 ? 0.0 : 1.0);
      }

      // 8. Particles & Floating Text
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.life += 1;
        ft.alpha = 1 - ft.life / 35;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '900 16px Impact, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.life < 35);

      // 9. Reserve Blades Indicator
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px monospace';
      ctx.fillText(`X${knivesRemainingRef.current} BLADE LEFT`, 24, 625);

      for (let i = 0; i < knivesRemainingRef.current; i++) {
        const kx = 155 + i * 16;
        const ky = 621;
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(kx, ky - 10, 4, 15);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(kx, ky - 10, 4, 15);
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isDead, level, playSfx]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black select-none overflow-hidden">
      {/* Top HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-4 py-2 rounded-2xl bg-portal-card border-3 border-black shadow-neo-sm text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-portal-cyan stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider text-portal-cyan">
              STAGE {level} {level % 5 === 0 ? ' [BOSS]' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-portal-yellow stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider text-portal-yellow">
              {displayScore} PTS
            </span>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-xl bg-portal-surface border-2 border-black text-white hover:text-portal-cyan transition-all shadow-neo-sm"
          title="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 stroke-[2.5]" /> : <VolumeX className="w-4 h-4 stroke-[2.5]" />}
        </button>
      </div>

      {/* Canvas Katana Slicer Arcade Container */}
      <div
        className="relative cursor-pointer touch-none"
        onClick={throwKnife}
        onTouchStart={(e) => {
          e.preventDefault();
          throwKnife();
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full max-w-[480px] h-[86dvh] max-h-[720px] object-contain border-4 border-black rounded-2xl shadow-neo-lg bg-[#18000F]"
        />

        {/* Start Overlay */}
        {!isPlaying && !isDead && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mb-4 shadow-neo-sm animate-bounce">
              <Target className="w-8 h-8 text-white stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
              Katana Thrower [Slicer Edition]
            </h2>
            <p className="text-xs text-slate-300 font-bold max-w-xs mb-6 leading-relaxed">
              Equipped with 3D isometric Katana blades from Cyber Slicer! Knives launch upward and embed perfectly at the bottom launcher area. Tap, click, or press Space!
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="px-8 py-3 rounded-2xl bg-portal-pink text-white text-sm font-black uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white stroke-[2.5]" />
              Enter Dojo
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isDead && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-rose-500 border-3 border-black flex items-center justify-center mb-4 shadow-neo-sm">
              <Flame className="w-8 h-8 text-white stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-black text-rose-400 uppercase tracking-tight mb-1">
              Blade Clash!
            </h2>
            <p className="text-xs text-slate-300 font-bold mb-4">
              Final Score: <span className="text-portal-yellow font-black">{displayScore} PTS</span> (Stage {level})
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDead(false);
                  setIsPlaying(true);
                  flyingKnifeRef.current = null;
                  particlesRef.current = [];
                  floatingTextsRef.current = [];
                  isTransitioningRef.current = false;
                  initLevel(level);
                }}
                className="w-full py-3 rounded-2xl bg-portal-cyan text-black text-xs font-black uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                Restart Stage {level}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="w-full py-3 rounded-2xl bg-portal-pink text-white text-xs font-black uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                Restart from Stage 1
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom helper prompt */}
      <div className="mt-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
        [Space / Click / Tap] Throw Katana • [R] Restart
      </div>
    </div>
  );
}
