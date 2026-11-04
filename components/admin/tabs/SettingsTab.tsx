'use client';

import { Save, Settings } from 'lucide-react';
import { useState } from 'react';

type Props = { initialUpi?: string; initialQrCode?: string; onSave: (settings: { upiId: string }) => void };

export function SettingsTab({ initialUpi = '', initialQrCode, onSave }: Props) {
  const [upiId, setUpiId] = useState(initialUpi);
  return <section className="max-w-2xl rounded-2xl border-4 border-black bg-portal-card p-5 shadow-neo"><h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase text-white"><Settings className="h-5 w-5 text-portal-cyan" />Payment settings</h2><form onSubmit={event => { event.preventDefault(); onSave({ upiId: upiId.trim() }); }} className="space-y-4"><label className="block text-xs font-black uppercase text-slate-300">Admin UPI ID<input value={upiId} onChange={event => setUpiId(event.target.value)} placeholder="yourname@bank" className="mt-1 w-full rounded-xl border-2 border-black bg-portal-surface px-3 py-2 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-portal-cyan" /></label>{initialQrCode && <div><p className="text-xs font-black uppercase text-slate-300">Current QR code</p><img src={initialQrCode} alt="Admin payment QR code" className="mt-2 max-h-56 rounded-xl border-2 border-black bg-white p-2" /></div>}<button type="submit" className="flex items-center gap-2 rounded-xl border-3 border-black bg-portal-cyan px-4 py-2 text-xs font-black uppercase text-black shadow-neo-sm"><Save className="h-4 w-4" />Save settings</button></form></section>;
}

export default SettingsTab;
