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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg md:max-w-xl bg-white border-4 border-black rounded-2xl sm:rounded-3xl shadow-neo-xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden min-w-0 animate-scaleIn">
        {/* Figma Selection Frame Transform Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        {/* Top Decorative Color Bar */}
        <div className="h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b-3 border-black bg-white shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-portal-yellow border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0">
              <Trophy className="w-5 h-5 fill-black stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-black tracking-tight truncate uppercase">
                  HALL OF FAME
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-portal-pink text-black border-2 border-black shadow-neo-sm shrink-0">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-bold truncate">Competitive player rankings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-portal-pink text-black border-2 border-black shadow-neo-sm font-black shrink-0 ml-2 transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b-3 border-black flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-4 h-4 text-black stroke-[2.5]" />
            <span className="text-xs font-black uppercase text-black">Viewing:</span>
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="flex-1 sm:flex-initial min-w-0 bg-white border-2 border-black shadow-neo-sm rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-black text-black focus:outline-none focus:bg-portal-yellow cursor-pointer truncate uppercase"
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
              className="p-1.5 sm:p-2 bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-sm rounded-xl shrink-0 font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
              title="Refresh Ranks"
            >
              <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isLoading ? 'animate-spin text-black' : ''}`} />
            </button>
          </div>
        </div>

        {/* Body Viewport */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 overscroll-contain min-w-0 bg-white">
          {isLoading ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-black animate-spin stroke-[2.5]" />
              <p className="text-xs text-black font-black uppercase tracking-wider">Querying high-score database...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 sm:py-16 space-y-2 bg-slate-50 border-2 border-black rounded-xl p-4 shadow-neo-sm">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-black mx-auto stroke-[2.5]" />
              <p className="text-sm font-black uppercase text-black">No champions recorded yet</p>
              <p className="text-xs text-slate-700 font-bold">Play a match and be the first to claim Rank #1!</p>
            </div>
          ) : (
            <>
              {/* TOP 3 PODIUM */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3.5 items-end pt-5 pb-1 w-full min-w-0">

                {/* 2nd Place (Silver) */}
                {top3[1] ? (
                  <div className="w-full min-w-0 flex flex-col items-center bg-portal-cyan border-3 border-black rounded-xl sm:rounded-2xl p-2 sm:p-3 relative order-1 shadow-neo">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white text-black font-black text-[11px] sm:text-xs flex items-center justify-center -top-3 sm:-top-3.5 absolute border-2 border-black shadow-neo-sm">
                      2
                    </div>
                    <img src={top3[1].avatar_url} alt="" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-black my-1.5 sm:my-2 bg-white shrink-0" />
                    <p className="font-black text-[10px] sm:text-xs text-black truncate w-full text-center px-0.5 uppercase">{top3[1].username}</p>
                    <p className="font-black text-[10px] sm:text-xs text-black mt-0.5 truncate w-full text-center">{top3[1].score.toLocaleString()}</p>
                    <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-white text-black font-black uppercase mt-1 rounded border border-black tracking-wider shadow-neo-sm">SILVER</span>
                  </div>
                ) : <div className="order-1" />}

                {/* 1st Place (Gold / Crown) */}
                {top3[0] && (
                  <div className="w-full min-w-0 flex flex-col items-center bg-portal-yellow border-4 border-black rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative order-2 shadow-neo-lg -translate-y-2 sm:-translate-y-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border-2 border-black text-black flex items-center justify-center -top-4 sm:-top-5 absolute shadow-neo-sm">
                      <Crown className="w-5 h-5 fill-black stroke-[2.5]" />
                    </div>
                    <img src={top3[0].avatar_url} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-3 border-black my-1.5 sm:my-2 bg-white shrink-0" />
                    <p className="font-black text-[11px] sm:text-sm text-black truncate w-full text-center px-0.5 uppercase">{top3[0].username}</p>
                    <p className="font-black text-xs sm:text-sm text-black mt-0.5 truncate w-full text-center">
                      {top3[0].score.toLocaleString()} <span className="text-[10px] text-black font-black">PTS</span>
                    </p>
                    <span className="px-2 py-0.5 text-[9px] sm:text-[10px] bg-white text-black font-black uppercase mt-1 rounded border-2 border-black tracking-wider shadow-neo-sm">CHAMPION</span>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3[2] ? (
                  <div className="w-full min-w-0 flex flex-col items-center bg-portal-pink border-3 border-black rounded-xl sm:rounded-2xl p-2 sm:p-3 relative order-3 shadow-neo">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white text-black font-black text-[11px] sm:text-xs flex items-center justify-center -top-3 sm:-top-3.5 absolute border-2 border-black shadow-neo-sm">
                      3
                    </div>
                    <img src={top3[2].avatar_url} alt="" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-black my-1.5 sm:my-2 bg-white shrink-0" />
                    <p className="font-black text-[10px] sm:text-xs text-black truncate w-full text-center px-0.5 uppercase">{top3[2].username}</p>
                    <p className="font-black text-[10px] sm:text-xs text-black mt-0.5 truncate w-full text-center">{top3[2].score.toLocaleString()}</p>
                    <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-white text-black font-black uppercase mt-1 rounded border border-black tracking-wider shadow-neo-sm">BRONZE</span>
                  </div>
                ) : <div className="order-3" />}
              </div>

              {/* Ranks 4 to 10 List */}
              {rest.length > 0 && (
                <div className="space-y-2 pt-2 border-t-3 border-black min-w-0">
                  <span className="text-[11px] font-black text-black uppercase tracking-wider block mb-1.5">
                    Contenders (Ranks 4–{leaderboard.length})
                  </span>
                  {rest.map((entry) => (
                    <div
                      key={entry.user_id + entry.rank}
                      className="flex items-center justify-between gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 hover:bg-portal-yellow border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all min-w-0"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="w-6 sm:w-7 h-6 sm:h-7 rounded-md bg-white border border-black flex items-center justify-center font-black text-xs text-black shrink-0 shadow-neo-sm">
                          #{entry.rank}
                        </span>
                        <img src={entry.avatar_url} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-black bg-slate-200 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-black text-xs text-black block truncate uppercase">{entry.username}</span>
                          {entry.games_played && (
                            <span className="text-[10px] text-slate-600 font-bold block truncate">{entry.games_played} games played</span>
                          )}
                        </div>
                      </div>
                      <span className="font-black text-xs sm:text-sm text-black shrink-0 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-black shadow-neo-sm">
                        {entry.score.toLocaleString()} <span className="text-[10px] text-slate-600 font-black">PTS</span>
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
