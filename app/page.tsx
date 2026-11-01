'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Heart } from 'lucide-react';
import dynamic from 'next/dynamic';
import GameGrid from '@/components/games/GameGrid';
import { Game } from '@/lib/types';
import { INITIAL_GAMES } from '@/lib/gamesData';

const GameModal = dynamic(() => import('@/components/ui/GameModal'), { ssr: false });
const LeaderboardModal = dynamic(() => import('@/components/leaderboard/LeaderboardModal'), { ssr: false });
const UsernamePromptModal = dynamic(() => import('@/components/ui/UsernamePromptModal'), { ssr: false });

export default function ArcadePortalDashboard() {
  const [games] = useState<Game[]>(INITIAL_GAMES);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playerTag, setPlayerTag] = useState<string>('');
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [pendingGameToPlay, setPendingGameToPlay] = useState<Game | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardGameId, setLeaderboardGameId] = useState<string | 'global'>('global');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const savedTag = localStorage.getItem('stressbuster_player_tag');
    const savedFavorites = localStorage.getItem('stressbuster_favorites');
    if (savedTag) setPlayerTag(savedTag);
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch {}
    }
  }, []);

  const toggleFavorite = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId];
      try {
        localStorage.setItem('stressbuster_favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const launchGameSession = (game: Game) => {
    setActiveGame(game);
  };

  const handleLaunchGame = (game: Game) => {
    if (game.status === 'hidden') return;
    if (!playerTag || playerTag.trim().length < 2) {
      setPendingGameToPlay(game);
      setIsUsernameModalOpen(true);
      return;
    }
    launchGameSession(game);
  };

  const handleConfirmUsername = (newUsername: string) => {
    const clean = newUsername.trim();
    if (!clean) return;
    setPlayerTag(clean);
    try {
      localStorage.setItem('stressbuster_player_tag', clean);
    } catch {}
    setIsUsernameModalOpen(false);
    if (pendingGameToPlay) {
      const gameToPlay = pendingGameToPlay;
      setPendingGameToPlay(null);
      launchGameSession(gameToPlay);
    }
  };

  const handleOpenLeaderboard = (gameId: string | 'global') => {
    setLeaderboardGameId(gameId);
    setIsLeaderboardOpen(true);
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      if (game.status === 'hidden') return false;
      if (activeTab === 'favorites') return favorites.includes(game.id);
      return true;
    });
  }, [games, activeTab, favorites]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#140F21] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#140F21] text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#1A1526] border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Tab Toggle */}
          <div className="flex items-center gap-2 bg-[#281E3B] rounded-full p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all ${
                activeTab === 'all'
                  ? 'bg-[#140F21] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Games
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                activeTab === 'favorites'
                  ? 'bg-[#140F21] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Heart className="w-4 h-4" />
              Favorite
            </button>
          </div>

          {/* Trophy Button */}
          <button
            onClick={() => handleOpenLeaderboard('global')}
            className="p-2.5 bg-yellow-500 rounded-full hover:bg-yellow-400 transition-colors"
            title="Leaderboard"
          >
            <Trophy className="w-5 h-5 text-black" />
          </button>
        </div>
      </header>

      {/* Game Grid */}
      <main>
        <GameGrid
          games={filteredGames}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onPlayGame={handleLaunchGame}
        />
      </main>

      {/* Modals */}
      <UsernamePromptModal
        isOpen={isUsernameModalOpen}
        initialUsername={playerTag}
        title={pendingGameToPlay ? "Enter Your Gamer Tag" : (playerTag ? "Update Gamer Tag" : "Create Player Handle")}
        subtitle="Choose a player handle to record your high scores."
        confirmText="SAVE HANDLE"
        onClose={() => {
          setIsUsernameModalOpen(false);
          setPendingGameToPlay(null);
        }}
        onConfirm={handleConfirmUsername}
      />

      {activeGame && (
        <GameModal
          game={activeGame}
          username={playerTag || 'Player'}
          onChangeUsername={() => {
            setPendingGameToPlay(activeGame);
            setIsUsernameModalOpen(true);
          }}
          onClose={() => setActiveGame(null)}
          onOpenLeaderboard={(gameId) => handleOpenLeaderboard(gameId)}
          onNextGameRoulette={() => {
            const activeGames = games.filter(g => g.status === 'active' && g.id !== activeGame.id);
            if (activeGames.length > 0) {
              const nextGame = activeGames[Math.floor(Math.random() * activeGames.length)];
              handleLaunchGame(nextGame);
            }
          }}
          userRating={null}
          onRateGame={async () => {}}
        />
      )}

      {isLeaderboardOpen && (
        <LeaderboardModal
          initialGameId={leaderboardGameId}
          games={games.filter(g => g.status !== 'hidden')}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}
    </div>
  );
}
