'use client';

import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, AlertCircle, Gamepad2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Try Supabase Auth if configured
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (sbError) throw sbError;
        if (data.session) {
          localStorage.setItem('breakhub_admin_session', JSON.stringify(data.session));
          onSuccess();
          onClose();
          return;
        }
      }

      // 2. Fallback local admin check for demo/local environment (admin@breakhub.com / admin123)
      if (email === 'admin@breakhub.com' && password === 'admin123') {
        const mockSession = { user: { email: 'admin@breakhub.com' }, token: 'mock-admin-token' };
        localStorage.setItem('breakhub_admin_session', JSON.stringify(mockSession));
        onSuccess();
        onClose();
      } else {
        throw new Error('Invalid email or password. (Default demo: admin@breakhub.com / admin123)');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#121212] border border-[#333] rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#00ffff]/10 border border-[#00ffff]/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#00ffff]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Admin Portal Login</h2>
            <p className="text-xs text-gray-400">Manage games, analytics & portal settings</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Admin Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@breakhub.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ffff]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ffff]"
              />
            </div>
          </div>

          <div className="text-[11px] text-gray-500 bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
            💡 <strong className="text-gray-400">Demo Credentials:</strong><br />
            Email: <code className="text-[#00ffff]">admin@breakhub.com</code><br />
            Password: <code className="text-[#00ffff]">admin123</code>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#00ffff] hover:bg-[#00e6e6] text-black font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#00ffff]/20"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Access Admin Panel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
