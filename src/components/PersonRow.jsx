import React from 'react';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

export const PersonRow = ({ person }) => {
  const { id, name, totalBalance } = person;
  const isPositive = totalBalance >= 0;
  const amount = Math.abs(totalBalance);

  return (
    <Link to={`/person/${id}`} className="group block mb-4 transition-all">
      <div className="flex items-center justify-between rounded-2xl bg-white/60 p-4 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md border border-gray-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-800/40 text-lg font-bold text-indigo-700 dark:text-indigo-400 shadow-inner dark:shadow-slate-900/50 transition-colors">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white transition-colors">{name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">{isPositive ? "Owes you" : "You owe"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={clsx("font-bold text-lg transition-colors", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              ₹{amount.toLocaleString()}
            </p>
          </div>
          <ChevronRight size={20} className="text-gray-300 dark:text-slate-600 transition-all group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
};
