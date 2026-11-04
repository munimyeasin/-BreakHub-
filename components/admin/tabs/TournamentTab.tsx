'use client';

import { CalendarPlus, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import type { Tournament } from '@/lib/types';

type Props = { tournaments: Tournament[]; onCreate: (input: Omit<Tournament, 'id' | 'status'>) => void; onDelete: (id: string) => void };

export function TournamentTab({ tournaments, onCreate, onDelete }: Props) {
  const [name, setName] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [prizePool, setPrizePool] = useState('');
  const [startDate, setStartDate] = useState('');
  const handleSubmit = (event: React.FormEvent) => { event.preventDefault(); if (!name.trim() || !startDate) return; onCreate({ name: name.trim(), entry_fee: Number(entryFee) || 0, prize_pool: Number(prizePool) || 0, start_date: new Date(startDate).toISOString() }); setName(''); setEntryFee(''); setPrizePool(''); setStartDate(''); };

  return <div className="space-y-6">
    <form onSubmit={handleSubmit} className="rounded-2xl border-4 border-black bg-portal-card p-5 shadow-neo">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase text-white"><CalendarPlus className="h-5 w-5 text-portal-cyan" />Create tournament</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input required value={name} onChange={event => setName(event.target.value)} placeholder="Tournament name" className="rounded-xl border-2 border-black bg-portal-surface px-3 py-2 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-portal-cyan" /><input type="number" min="0" value={entryFee} onChange={event => setEntryFee(event.target.value)} placeholder="Entry fee" className="rounded-xl border-2 border-black bg-portal-surface px-3 py-2 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-portal-cyan" /><input type="number" min="0" value={prizePool} onChange={event => setPrizePool(event.target.value)} placeholder="Prize pool" className="rounded-xl border-2 border-black bg-portal-surface px-3 py-2 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-portal-cyan" /><input required type="datetime-local" value={startDate} onChange={event => setStartDate(event.target.value)} className="rounded-xl border-2 border-black bg-portal-surface px-3 py-2 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-portal-cyan" /></div>
      <button type="submit" className="mt-4 rounded-xl border-3 border-black bg-portal-cyan px-4 py-2 text-xs font-black uppercase text-black shadow-neo-sm">Create tournament</button>
    </form>
    <section className="rounded-2xl border-4 border-black bg-portal-card p-5 shadow-neo"><h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase text-white"><Trophy className="h-5 w-5 text-portal-yellow" />Tournaments ({tournaments.length})</h2><div className="space-y-3">{tournaments.map(tournament => <div key={tournament.id} className="flex flex-col gap-3 rounded-xl border-2 border-black bg-portal-surface p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-white">{tournament.name}</p><p className="text-xs font-bold text-slate-400">{new Date(tournament.start_date).toLocaleString()} · ₹{tournament.entry_fee} entry · ₹{tournament.prize_pool} prize</p></div><button type="button" onClick={() => onDelete(tournament.id)} className="flex w-fit items-center gap-1 rounded-lg border-2 border-black bg-red-400 px-3 py-2 text-xs font-black uppercase text-black"><Trash2 className="h-4 w-4" />Delete</button></div>)}</div></section>
  </div>;
}

export default TournamentTab;
