import { Activity } from 'lucide-react';
import type { AdminLog } from '@/lib/types';

type Props = { logs: AdminLog[] };

export function LogsTab({ logs }: Props) {
  return <section className="rounded-2xl border-4 border-black bg-portal-card p-5 shadow-neo"><h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase text-white"><Activity className="h-5 w-5 text-portal-pink" />Admin activity ({logs.length})</h2>{logs.length === 0 ? <p className="py-8 text-center text-sm font-bold text-slate-500">No activity recorded.</p> : <div className="space-y-2">{logs.map(log => <div key={log.id} className="flex flex-col gap-1 rounded-xl border-2 border-black bg-portal-surface p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-white">{log.action}</p><p className="text-xs font-bold text-slate-400">Target: {log.target_id || '—'} · Admin: {log.admin_id}</p></div><time className="text-xs font-bold text-portal-cyan">{new Date(log.created_at).toLocaleString()}</time></div>)}</div>}</section>;
}

export default LogsTab;
