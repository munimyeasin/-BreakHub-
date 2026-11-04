'use client';

import { CheckCircle, Clock, XCircle } from 'lucide-react';
import type { Deposit, Transaction, User, Withdrawal } from '@/lib/types';

type Props = {
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  transactions: Transaction[];
  users: User[];
  onProcessDeposit: (id: string, status: 'completed' | 'failed') => void;
  onProcessWithdrawal: (id: string, status: 'completed' | 'failed') => void;
};

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export function FinanceTab({ deposits, withdrawals, transactions, users, onProcessDeposit, onProcessWithdrawal }: Props) {
  const pendingDeposits = deposits.filter(item => item.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(item => item.status === 'pending');
  const userName = (id: string) => users.find(user => user.id === id)?.username || id;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[['Pending deposits', pendingDeposits.length], ['Pending withdrawals', pendingWithdrawals.length], ['Transactions', transactions.length]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border-4 border-black bg-portal-card p-5 shadow-neo">
            <p className="text-xs font-black uppercase text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>
      <RequestList title="Deposit requests" items={pendingDeposits} userName={userName} onProcess={onProcessDeposit} />
      <RequestList title="Withdrawal requests" items={pendingWithdrawals} userName={userName} onProcess={onProcessWithdrawal} />
    </div>
  );
}

type Request = Deposit | Withdrawal;
type RequestListProps = {
  title: string;
  items: Request[];
  userName: (id: string) => string;
  onProcess: (id: string, status: 'completed' | 'failed') => void;
};

function RequestList({ title, items, userName, onProcess }: RequestListProps) {
  return (
    <section className="rounded-2xl border-4 border-black bg-portal-card p-5 shadow-neo">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase text-white"><Clock className="h-5 w-5 text-portal-yellow" />{title}</h2>
      {items.length === 0 ? <p className="py-6 text-center text-sm font-bold text-slate-500">No pending requests.</p> : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border-2 border-black bg-portal-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-black text-white">{userName(item.user_id)}</p><p className="text-xs font-bold text-slate-400">{money(item.amount)} · {new Date(item.created_at).toLocaleString()}</p></div>
              <div className="flex gap-2"><button type="button" onClick={() => onProcess(item.id, 'completed')} className="flex items-center gap-1 rounded-lg border-2 border-black bg-green-400 px-3 py-2 text-xs font-black uppercase text-black"><CheckCircle className="h-4 w-4" />Approve</button><button type="button" onClick={() => onProcess(item.id, 'failed')} className="flex items-center gap-1 rounded-lg border-2 border-black bg-red-400 px-3 py-2 text-xs font-black uppercase text-black"><XCircle className="h-4 w-4" />Reject</button></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default FinanceTab;
