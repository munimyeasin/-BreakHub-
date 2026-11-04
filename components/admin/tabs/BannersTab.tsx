'use client';

import { useState } from 'react';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';

type Banner = {
  id: string;
  banner_image_url: string;
  target_movie_id?: string;
  created_at?: string;
};

type Game = {
  id: string;
  title: string;
};

type Props = {
  banners: Banner[];
  games: Game[];
  onAddBanner: (imageUrl: string, targetId?: string) => void;
  onDeleteBanner: (id: string) => void;
};

export function BannersTab({ banners, games, onAddBanner, onDeleteBanner }: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [targetId, setTargetId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    onAddBanner(imageUrl.trim(), targetId || undefined);
    setImageUrl('');
    setTargetId('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-portal-purple" /> Add Hero Banner
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">Banner Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">Target Game (Optional)</label>
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white focus:outline-none"
            >
              <option value="">None</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-portal-cyan text-black font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Banner
          </button>
        </form>
      </div>

      <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-portal-cyan" /> Active Hero Banners ({banners.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map(b => (
            <div key={b.id} className="relative group bg-portal-surface border-3 border-black rounded-2xl overflow-hidden shadow-neo">
              <img src={b.banner_image_url} alt="" className="w-full h-32 object-cover" />
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Target ID: {b.target_movie_id || 'None'}</span>
                <button
                  onClick={() => onDeleteBanner(b.id)}
                  className="p-1.5 bg-red-500 text-white rounded-lg border-2 border-black hover:bg-red-600 transition-colors shadow-neo-sm"
                  title="Delete Banner"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BannersTab;
