'use client';

import React, { useState, useEffect } from 'react';
import TournamentTab from '@/components/admin/tabs/TournamentTab';
import LogsTab from '@/components/admin/tabs/LogsTab';
import MovieCatalogTab from '@/components/admin/tabs/MovieCatalogTab';
import AdminsTab from '@/components/admin/tabs/AdminsTab';
import {
  ShieldAlert,
  Users,
  Gamepad2,
  Trophy,
  FileText,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  User as UserIcon,
  Key
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [secret, setSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'games'
    | 'admins'
    | 'users'
    | 'scores'
    | 'requests'
    | 'tournaments'
    | 'logs'
  >('overview');
  const [isGenresMenuOpen, setIsGenresMenuOpen] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedUser = usernameInput.trim();
    const trimmedPass = passwordInput.trim();

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: trimmedUser, password: trimmedPass, secret: trimmedPass || 'breakhub_admin_2026' })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthenticated(true);
        setCurrentAdminUser(json.result);
        const token = trimmedPass || 'breakhub_admin_2026';
        setSecret(token);
        localStorage.setItem('breakhub_admin_secret', token);
        localStorage.setItem('breakhub_admin_user', JSON.stringify(json.result));

        // Fetch full admin dashboard data
        const dataRes = await fetch(`/api/admin?secret=${encodeURIComponent(token)}&username=${encodeURIComponent(trimmedUser)}&password=${encodeURIComponent(trimmedPass)}`);
        const dataJson = await dataRes.json();
        if (dataJson.success) setData(dataJson);
      } else {
        setError(json.error || 'Invalid username or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login connection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedSecret = localStorage.getItem('breakhub_admin_secret');
    const savedUser = localStorage.getItem('breakhub_admin_user');
    if (savedSecret) {
      setSecret(savedSecret);
      if (savedUser) {
        try { setCurrentAdminUser(JSON.parse(savedUser)); } catch {}
      }
      fetch(`/api/admin?secret=${encodeURIComponent(savedSecret)}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setIsAuthenticated(true);
            setData(json);
            if (!savedUser) {
              setCurrentAdminUser({ username: 'Munim_yeasin', role: 'prime' });
            }
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

  const adminAction = async (action: string, payload: Record<string, unknown> = {}) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, secret, username: currentAdminUser?.username, ...payload })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Admin action failed');
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Admin action failed');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-portal-bg text-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md bg-portal-card border-4 border-black p-6 sm:p-8 rounded-2xl shadow-neo">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-portal-cyan border-3 border-black flex items-center justify-center shadow-neo-sm shrink-0">
              <ShieldAlert className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">Admin Login</h1>
              <p className="text-xs font-bold text-portal-cyan">Break Hub Security Portal</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter admin username..."
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-portal-surface border-3 border-black rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-portal-cyan shadow-neo-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-portal-surface border-3 border-black rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-portal-cyan shadow-neo-sm"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Secure Admin Login Required</p>
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
              {loading ? 'Authenticating...' : 'Login to Admin Panel'}
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

  const games = data?.games || [];
  const users = data?.users || [];
  const scores = data?.scores || [];
  const requests = data?.requests || [];
  const admins = data?.admins || [];

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: Activity, count: null },
    { id: 'games', label: 'Games Catalog', icon: Gamepad2, count: games.length },
    { id: 'admins', label: 'Admins', icon: ShieldAlert, count: admins.length },
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    { id: 'scores', label: 'Scores', icon: Trophy, count: scores.length },
    { id: 'requests', label: 'Wishlist', icon: FileText, count: requests.length },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy, count: (data?.tournaments || []).length },
    { id: 'logs', label: 'Logs', icon: Activity, count: (data?.adminLogs || []).length },
  ];

  const currentTabObj = navTabs.find(t => t.id === activeTab);
  const isPrimeAdmin = currentAdminUser?.role === 'prime' || currentAdminUser?.username?.toLowerCase() === 'munim_yeasin';

  return (
    <div className="min-h-screen bg-portal-bg text-slate-100 flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-portal-surface border-b-4 border-black px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between sticky top-0 z-30 shadow-neo-sm gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-portal-cyan border-3 border-black flex items-center justify-center shadow-neo-sm shrink-0">
            <ShieldAlert className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2 truncate">
              Break Hub Admin <span className="px-2 py-0.5 bg-portal-pink text-black text-[10px] font-black rounded border-2 border-black shrink-0">{currentAdminUser?.username} ({isPrimeAdmin ? 'Prime' : 'Standard'})</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-bold truncate">Secure Database & Content Control</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={refreshData}
            disabled={loading}
            aria-label="Refresh admin data"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-portal-yellow text-black font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('breakhub_admin_secret');
              localStorage.removeItem('breakhub_admin_user');
              setIsAuthenticated(false);
              setCurrentAdminUser(null);
            }}
            aria-label="Logout"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-400 text-black font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <span>Logout</span>
          </button>
          <Link
            href="/"
            aria-label="Return to portal home"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-portal-card text-white font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main Container with Responsive Grid Layout */}
      <div className="max-w-7xl mx-auto w-full p-3 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 flex-1 items-start">

        {/* Genres-style Collapsible Vertical Sidebar Menu */}
        <div className="bg-portal-card border-4 border-black p-3.5 sm:p-4 rounded-2xl shadow-neo flex flex-col gap-2 md:sticky md:top-24">
          <div
            onClick={() => setIsGenresMenuOpen(!isGenresMenuOpen)}
            className="flex items-center justify-between cursor-pointer px-2 py-1 select-none group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-portal-pink stroke-[2.5]" />
              <span className="text-xs font-black tracking-widest text-white uppercase">
                ADMIN MENU ({currentTabObj?.label})
              </span>
            </div>
            {isGenresMenuOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            )}
          </div>

          {isGenresMenuOpen && (
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[70vh] sm:max-h-[75vh] pr-1 pt-2 border-t-2 border-slate-800 animate-fadeIn">
              {navTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (window.innerWidth < 768) setIsGenresMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all border-2 border-black uppercase ${
                      isActive
                        ? 'bg-portal-cyan text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5'
                        : 'bg-portal-surface text-slate-200 hover:bg-portal-card hover:text-white shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 stroke-[2.5] shrink-0 ${isActive ? 'text-black' : 'text-portal-cyan'}`} />
                      <span className="truncate text-[11px] sm:text-xs">{tab.label}</span>
                    </div>
                    {tab.count !== null && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border border-black shrink-0 ${
                        isActive ? 'bg-black text-white' : 'bg-portal-card text-portal-cyan'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6 min-w-0">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: 'Total Users', value: users.length, icon: Users, color: 'bg-portal-cyan text-black' },
                  { title: 'Active Games', value: games.length, icon: Gamepad2, color: 'bg-portal-pink text-black' },
                  { title: 'Score Records', value: scores.length, icon: Trophy, color: 'bg-portal-yellow text-black' },
                  { title: 'Wishlist Requests', value: requests.length, icon: FileText, color: 'bg-portal-purple text-black' },
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
                <div className="bg-portal-card border-4 border-black p-4 sm:p-6 rounded-2xl shadow-neo overflow-hidden">
                  <h3 className="text-base font-black uppercase text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-portal-yellow" /> Recent Score Submissions
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {scores.slice(0, 10).map((s: any) => {
                      const u = users.find((user: any) => user.id === s.user_id);
                      const g = games.find((game: any) => game.id === s.game_id || game.slug === s.game_id);
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-portal-surface border-2 border-black rounded-xl gap-2">
                          <div className="min-w-0">
                            <p className="font-black text-sm text-portal-cyan truncate">{u ? u.username : 'Unknown Player'}</p>
                            <p className="text-xs font-bold text-slate-400 truncate">{g ? g.title : s.game_id}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-sm sm:text-base text-portal-yellow">{s.score.toLocaleString()} pts</span>
                            <p className="text-[10px] text-slate-500">{new Date(s.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-portal-card border-4 border-black p-4 sm:p-6 rounded-2xl shadow-neo overflow-hidden">
                  <h3 className="text-base font-black uppercase text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-portal-pink" /> Top Community Wishlist
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {requests.slice(0, 5).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-portal-surface border-2 border-black rounded-xl gap-2">
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-white truncate">{r.title}</h4>
                          <p className="text-xs text-slate-400 font-medium truncate">By {r.requested_by} • <span className="text-portal-cyan font-bold">{r.genre}</span></p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
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

          {activeTab === 'games' && (
            <MovieCatalogTab
              games={games}
              onUpdateStatus={(gameId, status) => adminAction('update_game_status', { gameId, status })}
              onDeleteGame={gameId => adminAction('delete_game', { gameId })}
              onSaveGame={game => adminAction('save_game', game)}
            />
          )}

          {activeTab === 'admins' && (
            <AdminsTab
              admins={admins}
              currentAdmin={currentAdminUser}
              onAddAdmin={(username, password) => adminAction('add_admin', { newUsername: username, newPassword: password })}
              onUpdatePassword={(username, password) => adminAction('update_admin_password', { username, newPassword: password })}
              onDeleteId={id => adminAction('delete_admin', { adminId: id })}
              isPrime={isPrimeAdmin}
            />
          )}

          {activeTab === 'users' && (
            <div className="bg-portal-card border-4 border-black p-4 sm:p-6 rounded-2xl shadow-neo space-y-6 overflow-hidden">
              <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-portal-pink" /> Registered Players ({users.length})
              </h2>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left border-collapse min-w-[500px]">
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
                          {u.avatar_url && <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full bg-slate-800 border-2 border-black object-cover shrink-0" />}
                          <span className="truncate max-w-[120px] sm:max-w-none">{u.username}</span>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-400 truncate max-w-[100px]">{u.id}</td>
                        <td className="p-3 text-xs text-slate-300">{new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                        <td className="p-3">
                          <button
                            onClick={() => adminAction('delete_user', { userId: u.id })}
                            aria-label={`Delete user ${u.username}`}
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

          {activeTab === 'scores' && (
            <div className="bg-portal-card border-4 border-black p-4 sm:p-6 rounded-2xl shadow-neo space-y-6 overflow-hidden">
              <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-portal-yellow" /> Score Submissions Ledger ({scores.length})
              </h2>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left border-collapse min-w-[500px]">
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
                          <td className="p-3 font-black text-sm text-portal-cyan truncate max-w-[100px]">{u ? u.username : s.user_id}</td>
                          <td className="p-3 font-bold text-xs text-white truncate max-w-[100px]">{g ? g.title : s.game_id}</td>
                          <td className="p-3 font-black text-base text-portal-yellow">{s.score.toLocaleString()}</td>
                          <td className="p-3 text-xs text-slate-300">{new Date(s.created_at).toLocaleString()}</td>
                          <td className="p-3">
                            <button
                              onClick={() => adminAction('delete_score', { scoreId: s.id })}
                              aria-label="Delete score submission"
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

          {activeTab === 'tournaments' && <TournamentTab tournaments={data?.tournaments || []} onCreate={input => adminAction('create_tournament', { name: input.name, entry_fee: input.entry_fee, prize_pool: input.prize_pool, start_date: input.start_date })} onDelete={id => adminAction('delete_tournament', { tournamentId: id })} />}

          {activeTab === 'logs' && <LogsTab logs={data?.adminLogs || []} />}

          {activeTab === 'requests' && (
            <div className="bg-portal-card border-4 border-black p-4 sm:p-6 rounded-2xl shadow-neo space-y-6 overflow-hidden">
              <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-portal-purple" /> Community Game Wishlist ({requests.length})
              </h2>
              <div className="space-y-4">
                {requests.map((r: any) => (
                  <div key={r.id} className="p-4 sm:p-5 bg-portal-surface border-3 border-black rounded-2xl shadow-neo-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-white truncate">{r.title}</h3>
                        <span className="px-2 py-0.5 bg-portal-cyan text-black font-black text-[10px] rounded border-2 border-black uppercase">{r.genre}</span>
                        <span className="px-2 py-0.5 bg-portal-yellow text-black font-black text-[10px] rounded border-2 border-black uppercase">🔥 {r.upvotes}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-300 leading-relaxed">{r.description}</p>
                      <p className="text-[10px] text-slate-500 font-bold">Requested by <span className="text-portal-cyan">{r.requested_by}</span> on {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <select
                        value={r.status || 'under_review'}
                        onChange={(e) => adminAction('update_request_status', { requestId: r.id, status: e.target.value })}
                        className="w-full sm:w-auto px-3 py-2 bg-portal-card border-2 border-black rounded-xl text-xs font-black text-white focus:outline-none"
                      >
                        <option value="under_review">Under Review</option>
                        <option value="planned">Planned</option>
                        <option value="in_development">In Development</option>
                        <option value="completed">Completed</option>
                        <option value="declined">Declined</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
