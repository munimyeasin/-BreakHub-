'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Crown, RefreshCw, X, Filter } from 'lucide-react';
import { Game, LeaderboardEntry } from '@/lib/types';

interface LeaderboardModalProps {
  initialGameId?: string | 'global';
  games: Game[];
  onClose: () => void;
}

export default function LeaderboardModal({ initialGameId = 'global', games, onClose }: LeaderboardModalProps) {
  const [selectedGameId, setSelectedGameId] = useState<string | 'global'>(initialGameId);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = async (gameId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?gameId=${gameId}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(selectedGameId);
  }, [selectedGameId]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg md:max-w-xl bg-portal-bg border border-portal-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-portal-border bg-portal-surface/90 shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black shadow-glow-gold shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                  HALL OF FAME
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Competitive player rankings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-portal-card text-slate-400 hover:text-white border border-portal-border shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-portal-surface/40 border-b border-portal-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-portal-cyan" />
            <span className="text-xs font-bold text-slate-300">Viewing:</span>
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="flex-1 sm:flex-initial min-w-0 bg-portal-card border border-portal-border rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold text-portal-cyan focus:outline-none focus:border-portal-cyan cursor-pointer truncate"
            >
              <option value="global">🏆 Global Championship (All Games)</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  🎮 {g.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchLeaderboard(selectedGameId)}
              className="p-1.5 sm:p-2 bg-portal-card border border-portal-border rounded-xl text-slate-400 hover:text-portal-cyan shrink-0"
              title="Refresh Ranks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-portal-cyan' : ''}`} />
            </button>
          </div>
        </div>

        {/* Body Viewport */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 overscroll-contain min-w-0">
          {isLoading ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-portal-cyan animate-spin" />
              <p className="text-xs text-slate-400 font-bold">Querying high-score database...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 sm:py-16 space-y-2">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No champions recorded yet</p>
              <p className="text-xs text-slate-500">Play a match and be the first to claim Rank #1!</p>
            </div>
          ) : (
            <>
              {/* TOP 3 PODIUM */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3.5 items-end pt-5 pb-1 w-full min-w-0">

                {/* 2nd Place (Silver) */}
                {top3[1] ? (
                  <div className="w-full min-w-0 flex flex-col items-center bg-portal-surface/90 border border-slate-400/40 rounded-xl sm:rounded-2xl p-2 sm:p-3 relative order-1 shadow-lg">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-300 text-black font-black text-[10px] sm:text-xs flex items-center justify-center -top-2.5 sm:-top-3 absolute shadow-md border border-white">
                      2
                    </div>
                    <img src={top3[1].avatar_url} alt="" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-slate-300 my-1.5 sm:my-2 bg-slate-800 shrink-0" />
                    <p className="font-extrabold text-[10px] sm:text-xs text-white truncate w-full text-center px-0.5">{top3[1].username}</p>
                    <p className="font-black text-[10px] sm:text-xs text-slate-300 mt-0.5 truncate w-full text-center">{top3[1].score.toLocaleString()}</p>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">SILVER</span>
                  </div>
                ) : <div className="order-1" />}

                {/* 1st Place (Gold / Crown) */}
                {top3[0] && (
                  <div className="w-full min-w-0 flex flex-col items-center bg-gradient-to-b from-amber-500/20 via-portal-surface to-portal-surface border-2 border-portal-gold rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative order-2 shadow-glow-gold -translate-y-1.5 sm:-translate-y-2">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-portal-gold -top-3 sm:-top-4 absolute animate-bounce" />
                    <img src={top3[0].avatar_url} alt="" className="w-11 h-11 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-portal-gold my-1.5 sm:my-2 bg-amber-950/40 shrink-0" />
                    <p className="font-black text-[11px] sm:text-sm text-portal-gold truncate w-full text-center px-0.5">{top3[0].username}</p>
                    <p className="font-black text-xs sm:text-sm text-white mt-0.5 truncate w-full text-center">
                      {top3[0].score.toLocaleString()} <span className="text-[9px] sm:text-[10px] text-portal-gold font-normal">pts</span>
                    </p>
                    <span className="text-[8px] sm:text-[10px] text-amber-400 font-black uppercase mt-0.5 tracking-wider">CHAMPION</span>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3[2] ? (
                  <div className="w-full min-w-0 flex flex-col items-center bg-portal-surface/90 border border-amber-700/50 rounded-xl sm:rounded-2xl p-2 sm:p-3 relative order-3 shadow-lg">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-700 text-white font-black text-[10px] sm:text-xs flex items-center justify-center -top-2.5 sm:-top-3 absolute shadow-md border border-amber-600">
                      3
                    </div>
                    <img src={top3[2].avatar_url} alt="" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-amber-700 my-1.5 sm:my-2 bg-slate-800 shrink-0" />
                    <p className="font-extrabold text-[10px] sm:text-xs text-white truncate w-full text-center px-0.5">{top3[2].username}</p>
                    <p className="font-black text-[10px] sm:text-xs text-amber-500 mt-0.5 truncate w-full text-center">{top3[2].score.toLocaleString()}</p>
                    <span className="text-[8px] sm:text-[9px] text-amber-700 font-bold uppercase mt-0.5 tracking-wider">BRONZE</span>
                  </div>
                ) : <div className="order-3" />}
              </div>

              {/* Ranks 4 to 10 List */}
              {rest.length > 0 && (
                <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-portal-border min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Contenders (Ranks 4–{leaderboard.length})
                  </span>
                  {rest.map((entry) => (
                    <div
                      key={entry.user_id + entry.rank}
                      className="flex items-center justify-between gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-portal-surface hover:bg-portal-card border border-portal-border/60 transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="w-5 sm:w-6 text-center font-black text-xs text-slate-400 shrink-0">
                          #{entry.rank}
                        </span>
                        <img src={entry.avatar_url} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-slate-200 block truncate">{entry.username}</span>
                          {entry.games_played && (
                            <span className="text-[10px] text-slate-500 block truncate">{entry.games_played} games played</span>
                          )}
                        </div>
                      </div>
                      <span className="font-black text-xs sm:text-sm text-portal-cyan shrink-0 whitespace-nowrap">
                        {entry.score.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">pts</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
