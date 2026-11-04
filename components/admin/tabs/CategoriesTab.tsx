'use client';

import { useState } from 'react';
import { Layers, Plus, Trash2, Edit } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  display_order: number;
  is_visible: boolean;
};

type Props = {
  categories: Category[];
  onAddCategory: (name: string) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteCategory: (id: string) => void;
};

export function CategoriesTab({ categories, onAddCategory, onToggleVisibility, onDeleteCategory }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddCategory(name.trim());
    setName('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-portal-yellow" /> Add Category
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Action, Sci-Fi..."
              className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-portal-cyan text-black font-black text-xs uppercase rounded-xl border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Category
          </button>
        </form>
      </div>

      <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-portal-pink" /> Categories ({categories.length})
        </h2>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {categories.length === 0 ? (
            <p className="text-sm font-bold text-slate-500 py-4 text-center">No categories created yet.</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-portal-surface border-2 border-black rounded-xl">
                <div>
                  <span className="font-black text-sm text-white">{cat.name}</span>
                  <p className="text-[10px] text-slate-400 font-bold">Order: {cat.display_order}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleVisibility(cat.id)}
                    className={`px-2.5 py-1 text-xs font-black uppercase rounded-lg border-2 border-black ${
                      cat.is_visible !== false ? 'bg-green-400 text-black' : 'bg-red-400 text-black'
                    }`}
                  >
                    {cat.is_visible !== false ? 'Visible' : 'Hidden'}
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="p-1.5 bg-red-500 text-white rounded-lg border-2 border-black hover:bg-red-600 transition-colors shadow-neo-sm"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoriesTab;
