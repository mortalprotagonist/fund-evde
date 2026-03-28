import React from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export const HistoryItem = ({ transaction, onDelete }) => {
  const { amount, type, note, date } = transaction;
  const isLend = type === 'lend'; // I lent = they owe me = positive for me
  
  const d = new Date(date);
  const formattedDate = new Intl.DateTimeFormat('en-US', { disable: false, dateStyle: 'medium', timeStyle: 'short' }).format(d);

  return (
    <div className="relative mb-4 flex gap-4">
      {/* Timeline line */}
      <div className="absolute bottom-[-1rem] left-[1.15rem] top-10 w-0.5 bg-gray-200 dark:bg-slate-800 transition-colors"></div>
      
      {/* Icon */}
      <div className={clsx("relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-sm outline outline-4 outline-gray-50 dark:outline-slate-900 transition-all",
        isLend ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
      )}>
        {isLend ? <Upload size={18} /> : <Download size={18} />}
      </div>

      {/* Content */}
      <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-slate-800 dark:border-slate-700/50 transition-all hover:shadow-md relative overflow-hidden group">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white transition-colors">{isLend ? "You Lent" : "You Borrowed"}</p>
            {note && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">{note}</p>}
            <p className="mt-1 text-xs font-medium text-gray-400 dark:text-slate-500 transition-colors">{formattedDate}</p>
          </div>
          <p className={clsx("font-bold text-lg transition-colors", isLend ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            ₹{amount.toLocaleString()}
          </p>
        </div>
        
        {/* Delete Overlay */}
        {onDelete && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-rose-50 to-transparent dark:from-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-4 pointer-events-none z-20">
            <button 
              onClick={(e) => {
                e.preventDefault();
                onDelete(transaction);
              }}
              className="pointer-events-auto p-2 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
              title="Delete transaction"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
