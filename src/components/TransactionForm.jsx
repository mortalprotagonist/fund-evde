import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export const TransactionForm = ({ isOpen, onClose, onSubmit, people, initialPersonId }) => {
  const [type, setType] = useState('lend'); // 'lend' or 'owe'
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [personId, setPersonId] = useState(initialPersonId || (people?.length === 1 ? people[0].id : ''));
  const [newPersonName, setNewPersonName] = useState('');
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [dateStr, setDateStr] = useState(getTodayISO());

  useEffect(() => {
    if (isOpen) {
      setType('lend');
      setAmount('');
      setNote('');
      setPersonId(initialPersonId || (people?.length === 1 ? people[0].id : ''));
      setNewPersonName('');
      setDateStr(getTodayISO());
    }
  }, [isOpen, initialPersonId, people]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || (!personId && !newPersonName)) return;
    
    const finalDate = dateStr === getTodayISO() ? new Date().toISOString() : new Date(dateStr).toISOString();
    onSubmit({
      type,
      amount: parseFloat(amount),
      note,
      personId,
      newPersonName: personId === 'new' ? newPersonName : null,
      date: finalDate
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full transform rounded-t-3xl bg-white p-6 shadow-2xl transition-all sm:max-w-md sm:rounded-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">New Transaction</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                type === 'lend' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => setType('lend')}
            >
              I Lent
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                type === 'owe' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => setType('owe')}
            >
              I Owe
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-8 pr-4 text-lg font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Who</label>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            >
              <option value="" disabled>Select Person</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="new">+ Add New Person</option>
            </select>
          </div>

          {personId === 'new' && (
            <div>
              <input
                type="text"
                required
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Person Name"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              placeholder="e.g. Dinner"
            />
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95"
          >
            Save Transaction
          </button>
        </form>
      </div>
    </div>
  );
};
