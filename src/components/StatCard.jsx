import React from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import clsx from 'clsx';

export const StatCard = ({ balance }) => {
  const isPositive = balance >= 0;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-xl mb-8">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500 opacity-20 blur-2xl"></div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-200">Net Balance</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight">
            ₹{Math.abs(balance).toLocaleString()}
          </h2>
        </div>
        <div className={clsx("flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20", 
          isPositive ? "text-emerald-400" : "text-rose-400"
        )}>
          {isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
        </div>
      </div>
      <div className="relative z-10 mt-6 flex items-center gap-2 text-sm text-indigo-100">
        <Wallet size={16} className="text-indigo-300"/>
        <span>{isPositive ? "People owe you more overall" : "You owe more overall"}</span>
      </div>
    </div>
  );
};
