'use client';

import { useState } from 'react';
import { Gamepad2, Plus, Trash2, Edit, Eye, EyeOff, Search } from 'lucide-react';

type Game = {
  id: string;
  title: string;
  slug?: string;
  category: string;
  status: 'active' | 'coming_soon' | 'hidden';
  thumbnail_url?: string;
  rating?: number;
  rating_count?: number;
  play_count?: number;
};

type Category = {
  id: string;
  name: string;
  display_order: number;
  is_visible: boolean;
};

type Props = {
  games: Game[];
  categories?: Category[];
  onUpdateStatus: (gameId: string, status: string) => void;
  onDeleteGame?: (gameId: string) => void;
  onSaveGame?: (game: Partial<Game>) => void;
};

export function MovieCatalogTab({ games, categories = [], onUpdateStatus, onDeleteGame, onSaveGame }: Props) {
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Partial<Game> | null>(null);

  const filteredGames = games.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || g.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-portal-cyan" /> Arcade & Movie Catalog Management
        </h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-portal-surface border-2 border-black rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => { setSelectedGame({ title: '', category: 'Action', status: 'active' }); setIsEditing(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-portal-cyan text-black font-black text-xs uppercase rounded-xl border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredGames.map(game => (
          <div key={game.id} className="bg-portal-card border-3 border-black rounded-2xl p-4 shadow-neo flex flex-col justify-between gap-3 relative group">
            <div className="flex items-start gap-3">
              {game.thumbnail_url && (
                <img src={game.thumbnail_url} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-black shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-sm text-white truncate">{game.title}</h4>
                <p className="text-xs font-bold text-portal-cyan">{game.category}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase rounded border border-black ${
                  game.status === 'active' ? 'bg-green-400 text-black' : game.status === 'coming_soon' ? 'bg-portal-yellow text-black' : 'bg-red-400 text-black'
                }`}>
                  {game.status || 'active'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t-2 border-slate-800">
              <select
                value={game.status || 'active'}
                onChange={e => onUpdateStatus(game.id, e.target.value)}
                className="px-2 py-1 bg-portal-surface border-2 border-black rounded-lg text-xs font-black text-white focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="hidden">Hidden</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setSelectedGame(game); setIsEditing(true); }}
                  className="p-1.5 bg-portal-yellow text-black rounded-lg border-2 border-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all shadow-neo-sm"
                  title="Edit"
                >
                  <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                {onDeleteGame && (
                  <button
                    onClick={() => onDeleteGame(game.id)}
                    className="p-1.5 bg-portal-pink text-black rounded-lg border-2 border-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all shadow-neo-sm"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isEditing && selectedGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-portal-card border-4 border-black rounded-2xl max-w-lg w-full p-6 shadow-neo space-y-4">
            <h3 className="text-lg font-black uppercase text-white">{selectedGame.id ? 'Edit Catalog Item' : 'Add Catalog Item'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={selectedGame.title || ''}
                  onChange={e => setSelectedGame({ ...selectedGame, title: e.target.value })}
                  className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white focus:outline-none"
                  placeholder="Item title..."
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  value={selectedGame.category || ''}
                  onChange={e => setSelectedGame({ ...selectedGame, category: e.target.value })}
                  className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white focus:outline-none"
                  placeholder="Category..."
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">Thumbnail URL</label>
                <input
                  type="text"
                  value={selectedGame.thumbnail_url || ''}
                  onChange={e => setSelectedGame({ ...selectedGame, thumbnail_url: e.target.value })}
                  className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white focus:outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-800">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-portal-surface text-white font-black text-xs uppercase rounded-xl border-2 border-black shadow-neo-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onSaveGame && selectedGame) onSaveGame(selectedGame);
                  setIsEditing(false);
                }}
                className="px-4 py-2 bg-portal-cyan text-black font-black text-xs uppercase rounded-xl border-2 border-black shadow-neo-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MovieCatalogTab;
