'use client';

import { HelpCircle, Trash2 } from 'lucide-react';

type Feedback = {
  id: string;
  message_text: string;
  sender_name: string;
  submitted_at: string;
};

type Props = {
  feedback: Feedback[];
  onDeleteFeedback: (id: string) => void;
};

export function FeedbackTab({ feedback, onDeleteFeedback }: Props) {
  return (
    <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
      <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-portal-yellow" /> User Feedback ({feedback.length})
      </h2>
      <div className="space-y-3">
        {feedback.length === 0 ? (
          <p className="text-sm font-bold text-slate-500 py-6 text-center">No feedback submitted yet.</p>
        ) : (
          feedback.map(f => (
            <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-portal-surface border-2 border-black rounded-xl gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">{f.message_text}</p>
                <p className="text-xs text-slate-400 font-bold">From <span className="text-portal-cyan">{f.sender_name}</span> · {new Date(f.submitted_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => onDeleteFeedback(f.id)}
                className="p-2 bg-red-500 text-white rounded-xl border-2 border-black hover:bg-red-600 transition-colors shadow-neo-sm shrink-0"
                title="Delete Feedback"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FeedbackTab;
