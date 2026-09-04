'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Check, Edit3, Maximize2, Minimize2, Dices, Sparkles } from 'lucide-react';
import NeonSnakeGame from '@/components/games/NeonSnakeGame';
import MemoryMatrixGame from '@/components/games/MemoryMatrixGame';
import QuantumXOGame from '@/components/games/QuantumXOGame';
import HyperTapperGame from '@/components/games/HyperTapperGame';
import CyberDashGame from '@/components/games/CyberDashGame';
import NeonStarfighterGame from '@/components/games/NeonStarfighterGame';
import CyberBreakerGame from '@/components/games/CyberBreakerGame';
import Cyber2048Game from '@/components/games/Cyber2048Game';
import ChromaReflexGame from '@/components/games/ChromaReflexGame';
import GeometryDashGame from '@/components/games/GeometryDashGame';
import CyberSlicerGame from '@/components/games/CyberSlicerGame';
import NeonPaperIoGame from '@/components/games/NeonPaperIoGame';
import { Game } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatar';
import StarRating from '@/components/ui/StarRating';
import { gamification } from '@/lib/gamification';
import { audio } from '@/lib/audio';

interface GameModalProps {
  game: Game;
  username: string;
  userRating?: number | null;
  onRateGame?: (gameId: string, rating: number) => Promise<void> | void;
  onChangeUsername: () => void;
  onClose: () => void;
  onOpenLeaderboard: (gameId: string) => void;
  onNextGameRoulette?: () => void;
}

export default function GameModal({
  game,
  username,
  userRating = null,
  onRateGame,
  onChangeUsername,
  onClose,
  onOpenLeaderboard,
  onNextGameRoulette
}: GameModalProps) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync fullscreen state with native browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut toggle: Press 'F' to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.repeat
      ) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        const target = modalRef.current || document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if ((target as any).webkitRequestFullscreen) {
          await (target as any).webkitRequestFullscreen();
        } else if ((target as any).mozRequestFullScreen) {
          await (target as any).mozRequestFullScreen();
        } else if ((target as any).msRequestFullscreen) {
          await (target as any).msRequestFullscreen();
        } else {
          setIsFullscreen(prev => !prev);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      setIsFullscreen(prev => !prev);
    }
  };

  const handleScoreSubmit = async (score: number) => {
    if (score <= 0) return;
    setStatusMsg('Syncing score...');

    // Gamification Integration: Award XP, update streak, track daily quest, and check trophy achievements
    try {
      const result = gamification.recordGamePlay(game.id, score);
      if (result.leveledUp) {
        audio.playLevelUpSound();
      } else {
        audio.playXpGainSound();
      }
    } catch {}

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          username: username.trim() || 'Player',
          score,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`✓ Score (${score} pts) saved to leaderboard!`);
      } else {
        setStatusMsg(data.error || 'Failed to sync score');
      }
    } catch (err) {
      setStatusMsg('Network sync error');
    } finally {
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const avatarUrl = getAvatarUrl(username);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'p-0 bg-black' : 'p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn'}`}>
      <div
        ref={modalRef}
        className={`relative bg-portal-bg overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-none'
            : 'w-full max-w-[440px] border border-portal-border rounded-3xl max-h-[96vh]'
        }`}
      >

        {/* Modal Top Bar - Slim & Compact */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-portal-border bg-portal-surface/90">
          <div className="flex items-center gap-2">
            <img src={game.thumbnail_url} alt={game.title} className="w-7 h-7 rounded-lg object-cover border border-portal-border" />
            <div>
              <h3 className="font-black text-xs sm:text-sm text-white leading-tight">{game.title}</h3>
              <p className="text-[9px] text-portal-cyan font-extrabold uppercase tracking-wider">{game.category}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onNextGameRoulette && (
              <button
                onClick={onNextGameRoulette}
                className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-portal-cyan text-[11px] font-black hover:bg-cyan-500/25 hover:shadow-glow-cyan/40 active:scale-95 transition-all"
                title="Next Random Game Roulette"
              >
                <Dices className="w-3 h-3 text-portal-cyan" />
                <span>Next</span>
              </button>
            )}
            <button
              onClick={() => onOpenLeaderboard(game.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-portal-gold text-[11px] font-black hover:shadow-glow-gold active:scale-95 transition-all"
            >
              <Trophy className="w-3 h-3" />
              <span>Ranks</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-portal-card text-slate-300 hover:text-portal-cyan border border-portal-border hover:border-portal-cyan/40 active:scale-95 transition-all"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border active:scale-95 transition-all"
              title="Close (Esc)"
              aria-label="Close Modal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Player Profile & Handle Strip - Ultra Compact */}
        <div className="px-3.5 py-1 bg-portal-card/70 flex items-center justify-between text-[11px] border-b border-portal-border/40">
          <div className="flex items-center gap-1.5">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-5 h-5 rounded-full object-cover bg-slate-800 border border-portal-cyan"
            />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-bold">Player:</span>
              <span className="text-[11px] text-portal-cyan font-black tracking-wide truncate max-w-[110px] sm:max-w-[160px]">{username}</span>
            </div>
            <button
              onClick={onChangeUsername}
              className="p-0.5 text-slate-400 hover:text-white flex items-center gap-0.5 text-[9px] font-bold underline decoration-slate-600 hover:decoration-white"
              title="Change Gamer Tag"
            >
              <Edit3 className="w-2.5 h-2.5" /> Edit
            </button>
          </div>

          <div className="flex items-center gap-2">
            {statusMsg ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-extrabold animate-pulse">
                <Check className="w-2.5 h-2.5" /> {statusMsg}
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <StarRating
                  gameId={game.id}
                  gameTitle={game.title}
                  rating={game.rating || 4.9}
                  ratingCount={game.rating_count || 0}
                  userRating={userRating}
                  size="xs"
                  showCount={true}
                  interactive={true}
                  onRate={(val) => onRateGame?.(game.id, val)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Game Component Viewport */}
        <div className={`p-2 sm:p-3 flex flex-col items-center justify-center overflow-y-auto ${isFullscreen ? 'flex-1 my-auto w-full h-full' : ''}`}>
          {(game.id === 'g_snake_01' || game.slug === 'neon-snake') && (
            <NeonSnakeGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_flip_02' || game.slug === 'memory-matrix') && (
            <MemoryMatrixGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_ttt_03' || game.slug === 'quantum-xo') && (
            <QuantumXOGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_tap_04' || game.slug === 'hyper-tapper') && (
            <HyperTapperGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_action_06' || game.slug === 'cyber-dash') && (
            <CyberDashGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_shooter_07' || game.slug === 'neon-starfighter') && (
            <NeonStarfighterGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_breaker_08' || game.slug === 'cyber-breaker') && (
            <CyberBreakerGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_card_05' || game.slug === 'quantum-2048') && (
            <Cyber2048Game gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_reflex_09' || game.slug === 'chroma-reflex') && (
            <ChromaReflexGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_geometry_10' || game.slug === 'geometry-dash') && (
            <GeometryDashGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_slicer_11' || game.slug === 'cyber-slicer') && (
            <CyberSlicerGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}

          {(game.id === 'g_paper_12' || game.slug === 'paper-io' || game.slug === 'neon-paper-io') && (
            <NeonPaperIoGame gameId={game.id} onGameOver={handleScoreSubmit} />
          )}
        </div>
      </div>
    </div>
  );
}
