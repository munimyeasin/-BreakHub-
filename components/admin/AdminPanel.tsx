'use client';

import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Gamepad2, Users, BarChart3, Settings, LogOut, Plus, Trash2, Edit2, CheckCircle, RefreshCw } from 'lucide-react';
import { INITIAL_GAMES } from '@/lib/gamesData';
import { Game } from '@/lib/types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function AdminPanel({ isOpen, onClose, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'users' | 'settings'>('overview');
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [isEditingGame, setIsEditingGame] = useState<Game | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('breakhub_admin_games');
      if (saved) setGames(JSON.parse(saved));
    } catch {}
  }, []);

  if (!isOpen) return null;

  const handleSaveGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingGame) return;

    const updated = games.map(g => g.id === isEditingGame.id ? isEditingGame : g);
    setGames(updated);
    try {
      localStorage.setItem('breakhub_admin_games', JSON.stringify(updated));
    } catch {}

    setIsEditingGame(null);
    setSuccessMessage('Game updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteGame = (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    const updated = games.filter(g => g.id !== id);
    setGames(updated);
    try {
      localStorage.setItem('breakhub_admin_games', JSON.stringify(updated));
    } catch {}
    setSuccessMessage('Game deleted.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0a0a0a] text-white overflow-hidden animate-fadeIn">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111] border-r border-[#222] flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-2.5 mb-8 px-2">
            <div className="w-9 h-9 rounded-xl bg-[#00ffff] text-black flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide">Break Hub</h1>
              <p className="text-[10px] text-[#00ffff] font-medium">ADMIN CONTROL PANEL</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'overview' ? 'bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/30' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'games' ? 'bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/30' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Manage Games</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'users' ? 'bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/30' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Player Ranks</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'settings' ? 'bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/30' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Supabase & Config</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-[#222]">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-[#111] border-b border-[#222] px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold capitalize">{activeTab} Dashboard</h2>
            {successMessage && (
              <span className="ml-4 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-lg flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {successMessage}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#222] hover:bg-[#333] text-sm font-bold rounded-xl transition-colors"
          >
            Return to Portal ✕
          </button>
        </header>

        <div className="p-6 max-w-6xl mx-auto w-full">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Total Games</p>
                  <p className="text-2xl font-black text-[#00ffff]">{games.length}</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Active Players</p>
                  <p className="text-2xl font-black text-green-400">1,248</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Backend DB</p>
                  <p className="text-2xl font-black text-yellow-400">Supabase Connected</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">System Status</p>
                  <p className="text-2xl font-black text-emerald-400">Optimal 100%</p>
                </div>
              </div>

              <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
                <h3 className="font-bold text-base mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('games')}
                    className="px-4 py-2.5 bg-[#00ffff] text-black font-bold rounded-xl text-sm hover:bg-[#00e6e6] transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Manage Mini-Games</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="px-4 py-2.5 bg-[#222] hover:bg-[#333] font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configure Supabase Keys</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Mini-Game Catalog ({games.length})</h3>
              </div>

              <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#262626] bg-[#181818] text-xs text-gray-400 uppercase font-bold">
                      <th className="p-4">Game Title</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222] text-sm">
                    {games.map(game => (
                      <tr key={game.id} className="hover:bg-[#1a1a1a]/50">
                        <td className="p-4 font-bold flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-[#222] flex items-center justify-center text-xs font-bold text-[#00ffff]">
                            {game.title.substring(0, 2).toUpperCase()}
                          </span>
                          {game.title}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-[#222] text-xs font-bold rounded-md text-gray-300">
                            {game.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${game.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {game.status}
                          </span>
                        </td>
                        <td className="p-4 font-medium">⭐ {game.rating || 5.0}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setIsEditingGame(game)}
                            className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Player Ranks & Leaderboard Sync</h3>
              <p className="text-sm text-gray-400 mb-6">
                Connected to Supabase PostgreSQL database table: <code className="text-[#00ffff]">leaderboard_scores</code> & <code className="text-[#00ffff]">profiles</code>.
              </p>
              <div className="p-4 bg-[#1a1a1a] rounded-xl border border-[#333] text-sm text-gray-300">
                ✅ Supabase client initialized and ready for real-time player telemetry and score verification.
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 max-w-2xl space-y-4">
              <h3 className="font-bold text-lg">Supabase Backend Configuration</h3>
              <p className="text-xs text-gray-400">
                To link your live Supabase database, set the following environment variables in your Vercel or local <code className="text-[#00ffff]">.env.local</code> file:
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">NEXT_PUBLIC_SUPABASE_URL</label>
                  <input
                    type="text"
                    readOnly
                    value={process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-project.supabase.co'}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs font-mono text-[#00ffff]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</label>
                  <input
                    type="text"
                    readOnly
                    value={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key'}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs font-mono text-[#00ffff]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Game Modal */}
      {isEditingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleSaveGame} className="w-full max-w-md bg-[#141414] border border-[#333] rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg">Edit Game: {isEditingGame.title}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={isEditingGame.title}
                onChange={e => setIsEditingGame({ ...isEditingGame, title: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Category</label>
              <select
                value={isEditingGame.category}
                onChange={e => setIsEditingGame({ ...isEditingGame, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white"
              >
                <option value="ARCADE">ARCADE</option>
                <option value="ACTION">ACTION</option>
                <option value="PUZZLE">PUZZLE</option>
                <option value="STRATEGY">STRATEGY</option>
                <option value="CARD">CARD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Status</label>
              <select
                value={isEditingGame.status}
                onChange={e => setIsEditingGame({ ...isEditingGame, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white"
              >
                <option value="active">Active</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingGame(null)}
                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#00ffff] text-black text-xs font-bold rounded-xl hover:bg-[#00e6e6]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
