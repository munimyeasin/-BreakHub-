'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Gamepad2,
  Trophy,
  FileText,
  Star,
  Trash2,
  CheckCircle,
  Clock,
  Lock,
  RefreshCw,
  ArrowLeft,
  Search,
  Activity,
  Zap,
  Layers
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [secret, setSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'users' | 'scores' | 'requests'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin?secret=${encodeURIComponent(secret)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthenticated(true);
        setData(json);
        localStorage.setItem('breakhub_admin_secret', secret);
      } else {
        setError(json.error || 'Invalid admin secret');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('breakhub_admin_secret');
    if (saved) {
      setSecret(saved);
      fetch(`/api/admin?secret=${encodeURIComponent(saved)}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setIsAuthenticated(true);
            setData(json);
          }
        })
        .catch(() => {});
    }
  }, []);

  const refreshData = async () => {
    if (!secret) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?secret=${encodeURIComponent(secret)}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch {}
    setLoading(false);
  };

  const handleUpdateGameStatus = async (gameId: string, status: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_game_status', secret, gameId, status })
      });
      if (res.ok) refreshData();
    } catch {}
  };

  const handleUpdateRequestParam = async (requestId: string, status: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_request_status', secret, requestId, status })
      });
      if (res.ok) refreshData();
    } catch {}
  };

  const handleDeleteScore = async (scoreId: string) => {
    if (!confirm('Are you sure you want to delete this score?')) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_score', secret, scoreId })
      });
      if (res.ok) refreshData();
    } catch {}
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and all associated scores?')) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', secret, userId })
      });
      if (res.ok) refreshData();
    } catch {}
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-portal-bg text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-portal-card border-4 border-black p-8 rounded-2xl shadow-neo">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-portal-pink border-3 border-black flex items-center justify-center shadow-neo-sm">
              <ShieldAlert className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">Admin Portal</h1>
              <p className="text-xs font-bold text-portal-cyan">Break Hub Secure Database Management</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">Admin Secret Token</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Enter admin secret..."
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-portal-surface border-3 border-black rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-portal-cyan shadow-neo-sm"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Default dev secret: <code className="text-portal-cyan font-bold">breakhub_admin_2026</code></p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border-2 border-red-500 text-red-300 text-xs font-bold rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-portal-cyan text-black font-black uppercase tracking-wider rounded-xl border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access Admin Dashboard'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t-2 border-slate-800 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-portal-cyan transition-colors">
              <ArrowLeft className="w-4 h-4" /> Return to Arcade Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const games = data?.games || [];
  const users = data?.users || [];
  const scores = data?.scores || [];
  const requests = data?.requests || [];

  return (
    <div className="min-h-screen bg-portal-bg text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <header className="bg-portal-surface border-b-4 border-black px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-neo-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-portal-cyan border-3 border-black flex items-center justify-center shadow-neo-sm">
            <ShieldAlert className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              Break Hub Admin Panel <span className="px-2 py-0.5 bg-portal-pink text-black text-[10px] font-black rounded border-2 border-black">LIVE DB</span>
            </h1>
            <p className="text-xs text-slate-400 font-bold">Manage games, users, scores, & wishlist requests</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-portal-yellow text-black font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2.5] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-portal-card text-white font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Portal Home</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1">

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b-2 border-black">
          {[
            { id: 'overview', label: 'Overview', icon: Activity, count: null },
            { id: 'games', label: 'Games Catalog', icon: Gamepad2, count: stats.totalGames },
            { id: 'users', label: 'Users & Profiles', icon: Users, count: stats.totalUsers },
            { id: 'scores', label: 'Score Submissions', icon: Trophy, count: stats.totalScores },
            { id: 'requests', label: 'Game Wishlist', icon: FileText, count: stats.totalRequests },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo-sm transition-all whitespace-nowrap ${
                  isActive ? 'bg-portal-cyan text-black translate-x-0.5 translate-y-0.5' : 'bg-portal-card text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border-2 border-black ${isActive ? 'bg-black text-white' : 'bg-portal-surface text-portal-cyan'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-portal-cyan text-black' },
                { title: 'Active Games', value: stats.totalGames, icon: Gamepad2, color: 'bg-portal-pink text-black' },
                { title: 'Score Records', value: stats.totalScores, icon: Trophy, color: 'bg-portal-yellow text-black' },
                { title: 'Wishlist Requests', value: stats.totalRequests, icon: FileText, color: 'bg-portal-purple text-black' },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div key={idx} className="bg-portal-card border-4 border-black p-5 rounded-2xl shadow-neo flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400">{card.title}</p>
                      <h3 className="text-3xl font-black text-white mt-1">{card.value}</h3>
                    </div>
                    <div className={`w-12 h-12 rounded-xl border-3 border-black flex items-center justify-center shadow-neo-sm ${card.color}`}>
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Scores Feed */}
              <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo">
                <h3 className="text-base font-black uppercase text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-portal-yellow" /> Recent Score Submissions
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {scores.slice(0, 10).map((s: any) => {
                    const u = users.find((user: any) => user.id === s.user_id);
                    const g = games.find((game: any) => game.id === s.game_id || game.slug === s.game_id);
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-portal-surface border-2 border-black rounded-xl">
                        <div>
                          <p className="font-black text-sm text-portal-cyan">{u ? u.username : 'Unknown Player'}</p>
                          <p className="text-xs font-bold text-slate-400">{g ? g.title : s.game_id}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-base text-portal-yellow">{s.score.toLocaleString()} pts</span>
                          <p className="text-[10px] text-slate-500">{new Date(s.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Wishlist Requests Preview */}
              <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo">
                <h3 className="text-base font-black uppercase text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-portal-pink" /> Top Community Wishlist
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {requests.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-portal-surface border-2 border-black rounded-xl">
                      <div>
                        <h4 className="font-black text-sm text-white">{r.title}</h4>
                        <p className="text-xs text-slate-400 font-medium">By {r.requested_by} • <span className="text-portal-cyan font-bold">{r.genre}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-portal-yellow text-black font-black text-xs rounded-lg border-2 border-black">
                          🔥 {r.upvotes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GAMES TAB */}
        {activeTab === 'games' && (
          <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-portal-cyan" /> Games Catalog Management ({games.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-3 border-black bg-portal-surface">
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Game</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Category</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Status</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Rating</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Plays</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {games.map((g: any) => (
                    <tr key={g.id} className="hover:bg-portal-surface/50 transition-colors">
                      <td className="p-3 font-black text-sm text-white flex items-center gap-3">
                        {g.thumbnail_url && <img src={g.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover border-2 border-black" />}
                        <div>
                          <span>{g.title}</span>
                          <p className="text-[10px] text-slate-400 font-medium">ID: {g.slug || g.id}</p>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-xs text-portal-cyan">{g.category}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border-2 border-black uppercase ${
                          g.status === 'active' ? 'bg-green-400 text-black' : g.status === 'coming_soon' ? 'bg-portal-yellow text-black' : 'bg-red-400 text-black'
                        }`}>
                          {g.status || 'active'}
                        </span>
                      </td>
                      <td className="p-3 font-black text-xs text-portal-yellow">⭐ {g.rating || 0} ({g.rating_count || 0})</td>
                      <td className="p-3 font-bold text-xs text-slate-300">{g.play_count || 0}</td>
                      <td className="p-3">
                        <select
                          value={g.status || 'active'}
                          onChange={(e) => handleUpdateGameStatus(g.id, e.target.value)}
                          className="px-2.5 py-1 bg-portal-surface border-2 border-black rounded-lg text-xs font-black text-white focus:outline-none"
                        >
                          <option value="active">Active</option>
                          <option value="coming_soon">Coming Soon</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-6">
            <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-portal-pink" /> Registered Players ({users.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-3 border-black bg-portal-surface">
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Gamer Tag</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Player ID</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Created At</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-portal-surface/50 transition-colors">
                      <td className="p-3 font-black text-sm text-white flex items-center gap-3">
                        {u.avatar_url && <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full bg-slate-800 border-2 border-black object-cover" />}
                        <span>{u.username}</span>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-400">{u.id}</td>
                      <td className="p-3 text-xs text-slate-300">{new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 bg-red-500 text-white rounded-xl border-2 border-black hover:bg-red-600 transition-colors shadow-neo-sm"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCORES TAB */}
        {activeTab === 'scores' && (
          <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-6">
            <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-portal-yellow" /> Score Submissions Ledger ({scores.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-3 border-black bg-portal-surface">
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Player</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Game</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Score</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Timestamp</th>
                    <th className="p-3 font-black text-xs uppercase text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {scores.map((s: any) => {
                    const u = users.find((user: any) => user.id === s.user_id);
                    const g = games.find((game: any) => game.id === s.game_id || game.slug === s.game_id);
                    return (
                      <tr key={s.id} className="hover:bg-portal-surface/50 transition-colors">
                        <td className="p-3 font-black text-sm text-portal-cyan">{u ? u.username : s.user_id}</td>
                        <td className="p-3 font-bold text-xs text-white">{g ? g.title : s.game_id}</td>
                        <td className="p-3 font-black text-base text-portal-yellow">{s.score.toLocaleString()}</td>
                        <td className="p-3 text-xs text-slate-300">{new Date(s.created_at).toLocaleString()}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteScore(s.id)}
                            className="p-2 bg-red-500 text-white rounded-xl border-2 border-black hover:bg-red-600 transition-colors shadow-neo-sm"
                            title="Delete Score"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-6">
            <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-portal-purple" /> Community Game Wishlist ({requests.length})
            </h2>

            <div className="space-y-4">
              {requests.map((r: any) => (
                <div key={r.id} className="p-5 bg-portal-surface border-3 border-black rounded-2xl shadow-neo-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">{r.title}</h3>
                      <span className="px-2 py-0.5 bg-portal-cyan text-black font-black text-[10px] rounded border-2 border-black uppercase">{r.genre}</span>
                      <span className="px-2 py-0.5 bg-portal-yellow text-black font-black text-[10px] rounded border-2 border-black uppercase">🔥 {r.upvotes} Upvotes</span>
                    </div>
                    <p className="text-xs font-medium text-slate-300">{r.description}</p>
                    <p className="text-[10px] text-slate-500 font-bold">Requested by <span className="text-portal-cyan">{r.requested_by}</span> on {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={r.status || 'under_review'}
                      onChange={(e) => handleUpdateRequestParam(r.id, e.target.value)}
                      className="px-3 py-2 bg-portal-card border-2 border-black rounded-xl text-xs font-black text-white focus:outline-none"
                    >
                      <option value="under_review">Under Review</option>
                      <option value="planned">Planned</option>
                      <option value="in_development">In Development</option>
                      <option value="released">Released</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
