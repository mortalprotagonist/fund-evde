import React from 'react';
import { Download, Upload } from 'lucide-react';
import clsx from 'clsx';

export const HistoryItem = ({ transaction }) => {
  const { amount, type, note, date } = transaction;
  const isLend = type === 'lend'; // I lent = they owe me = positive for me
  
  const d = new Date(date);
  const formattedDate = new Intl.DateTimeFormat('en-US', { disable: false, dateStyle: 'medium', timeStyle: 'short' }).format(d);

  return (
    <div className="relative mb-4 flex gap-4">
      {/* Timeline line */}
      <div className="absolute bottom-[-1rem] left-[1.15rem] top-10 w-0.5 bg-gray-200"></div>
      
      {/* Icon */}
      <div className={clsx("relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-sm outline outline-4 outline-gray-50",
        isLend ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
      )}>
        {isLend ? <Upload size={18} /> : <Download size={18} />}
      </div>

      {/* Content */}
      <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900">{isLend ? "You Lent" : "You Borrowed"}</p>
            {note && <p className="text-sm text-gray-500 mt-1">{note}</p>}
            <p className="mt-1 text-xs font-medium text-gray-400">{formattedDate}</p>
          </div>
          <p className={clsx("font-bold text-lg", isLend ? "text-emerald-600" : "text-rose-600")}>
            ₹{amount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};
