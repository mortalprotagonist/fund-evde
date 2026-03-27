import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export const SettleModal = ({ isOpen, onClose, onSubmit, person }) => {
  const [amount, setAmount] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) setAmount('');
  }, [isOpen]);

  if (!isOpen || !person) return null;

  const isOwed = person.totalBalance > 0; // They owe me
  const absBalance = Math.abs(person.totalBalance);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount) return;
    
    // If they owe me, a repayment means I mathematically "owe" them to reduce the balance back to 0.
    const mathType = isOwed ? 'owe' : 'lend';
    const noteStr = isOwed ? 'Received Repayment' : 'Paid Repayment';

    onSubmit({
      type: mathType,
      amount: parseFloat(amount),
      note: noteStr,
      personId: person.id
    });
    
    setAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full transform rounded-t-3xl bg-white p-6 shadow-2xl transition-all sm:max-w-md sm:rounded-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isOwed ? 'Record Repayment' : 'Pay Back'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          {isOwed ? `${person.name} is paying you back.` : `You are paying ${person.name} back.`}
          <br/>Current balance: <span className="font-bold">₹{absBalance.toLocaleString()}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Amount to Settle</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
              <input
                type="number"
                required
                min="1"
                max={absBalance}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-8 pr-4 text-lg font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                placeholder="0.00"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button 
                type="button" 
                onClick={() => setAmount(absBalance.toString())}
                className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
              >
                Full (₹{absBalance.toLocaleString()})
              </button>
              <button 
                type="button" 
                onClick={() => setAmount((absBalance / 2).toString())}
                className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
              >
                Half
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95"
          >
            Confirm
          </button>
        </form>
      </div>
    </div>
  );
};
