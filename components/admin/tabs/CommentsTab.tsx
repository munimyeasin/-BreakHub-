'use client';

import { MessageSquare, Trash2 } from 'lucide-react';

type Comment = {
  id: string;
  comment_text: string;
  author_name: string;
  created_at: string;
  movie_title?: string;
};

type Props = {
  comments: Comment[];
  onDeleteComment: (id: string) => void;
};

export function CommentsTab({ comments, onDeleteComment }: Props) {
  return (
    <div className="bg-portal-card border-4 border-black p-6 rounded-2xl shadow-neo space-y-4">
      <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-portal-pink" /> User Comments Moderation ({comments.length})
      </h2>
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm font-bold text-slate-500 py-6 text-center">No comments found.</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-portal-surface border-2 border-black rounded-xl gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">{c.comment_text}</p>
                <p className="text-xs text-slate-400 font-bold">By <span className="text-portal-cyan">{c.author_name}</span> · {new Date(c.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => onDeleteComment(c.id)}
                className="p-2 bg-red-500 text-white rounded-xl border-2 border-black hover:bg-red-600 transition-colors shadow-neo-sm shrink-0"
                title="Delete Comment"
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

export default CommentsTab;
