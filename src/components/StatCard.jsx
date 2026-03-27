import React from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import clsx from 'clsx';

export const StatCard = ({ balance, totalLent, totalOwed }) => {
  const isPositive = balance >= 0;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-xl mb-8">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500 opacity-20 blur-2xl"></div>
      
      <div className="relative z-10 flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-200">Net Balance</p>
            <h2 className="mt-1 text-4xl font-bold tracking-tight">
              ₹{Math.abs(balance).toLocaleString()}
            </h2>
          </div>
          <div className={clsx("flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20", 
            isPositive ? "text-emerald-400" : "text-rose-400"
          )}>
            {isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/10 p-4 border border-white/10 backdrop-blur-sm">
          <div>
            <p className="text-xs text-indigo-200 mb-0.5 uppercase tracking-wide">Lent</p>
            <p className="text-base font-bold text-emerald-400">₹{totalLent.toLocaleString()}</p>
          </div>
          <div className="h-8 w-px bg-white/20 mx-2"></div>
          <div>
            <p className="text-xs text-indigo-200 mb-0.5 uppercase tracking-wide">Owe</p>
            <p className="text-base font-bold text-rose-400">₹{totalOwed.toLocaleString()}</p>
          </div>
          <div className="h-8 w-px bg-white/20 mx-2"></div>
          <div className="text-right">
            <p className="text-xs text-indigo-200 mb-0.5 uppercase tracking-wide">Net</p>
            <p className={clsx("text-base font-bold", isPositive ? "text-white" : "text-rose-200")}>
              {isPositive ? '+' : '-'}₹{Math.abs(balance).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
