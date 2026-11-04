'use client';

import { useState } from 'react';
import { ShieldAlert, Plus, Trash2, Lock, Key } from 'lucide-react';

type Admin = {
  id: string;
  username: string;
  admin_role: string;
};

type Props = {
  admins: Admin[];
  currentAdmin: { username: string; role: string } | null;
  onAddAdmin: (username: string, password: string) => void;
  onUpdatePassword: (username: string, password: string) => void;
  onDeleteId: (id: string) => void;
  isPrime: boolean;
};

export function AdminsTab({ admins, currentAdmin, onAddAdmin, onUpdatePassword, onDeleteId, isPrime }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    onAddAdmin(username.trim(), password.trim());
    setUsername('');
    setPassword('');
    setSuccessMsg('Admin account created successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !currentAdmin?.username) return;
    onUpdatePassword(currentAdmin.username, newPassword.trim());
    setNewPassword('');
    setSuccessMsg('Password updated successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Prime Admin Only: Create Standard Admins */}
      {isPrime ? (
        <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
          <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-portal-cyan" /> Create Standard Admin
          </h2>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Standard admin username..."
                className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Secure password..."
                className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-portal-cyan text-black font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Create Admin
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
          <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-portal-yellow" /> Update Password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">Username (Locked)</label>
              <input
                type="text"
                value={currentAdminUserUsername(currentAdmin)}
                disabled
                className="w-full px-3 py-2 bg-slate-800 border-2 border-black rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">Standard admins cannot change their username.</p>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New secure password..."
                className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-portal-yellow text-black font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              <Key className="w-4 h-4 stroke-[3]" /> Update Password
            </button>
          </form>
        </div>
      )}

      {/* Authorized Admins List */}
      <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-portal-yellow" /> Authorized Administrators ({admins.length})
        </h2>
        {successMsg && (
          <div className="p-3 bg-green-500/20 border-2 border-green-500 text-green-300 text-xs font-bold rounded-xl">
            {successMsg}
          </div>
        )}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {admins.map((admin: any) => (
            <div key={admin.id || admin.username} className="flex items-center justify-between p-3 bg-portal-surface border-2 border-black rounded-xl">
              <div>
                <span className="font-black text-sm text-white">{admin.username}</span>
                <p className="text-[10px] font-black uppercase text-portal-cyan">{admin.admin_role || (admin.username.toLowerCase() === 'munim_yeasin' ? 'prime' : 'standard')}</p>
              </div>
              {isPrime && admin.admin_role !== 'prime' && admin.username.toLowerCase() !== 'munim_yeasin' && (
                <button
                  onClick={() => onDeleteId(admin.id)}
                  aria-label={`Remove admin ${admin.username}`}
                  className="p-1.5 bg-red-500 text-white rounded-lg border-2 border-black hover:bg-red-600 transition-colors shadow-neo-sm"
                  title="Remove Admin"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function currentAdminUserUsername(currentAdmin: { username: string; role: string } | null): string {
  return currentAdmin?.username || 'Munim_yeasin';
}

export default AdminsTab;
