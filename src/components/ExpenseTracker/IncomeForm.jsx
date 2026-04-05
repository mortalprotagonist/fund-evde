import React, { useState, useEffect } from 'react';
import { X, Trash2, Settings2 } from 'lucide-react';
import { useIncomeSources } from '../../hooks/useExpenses';

const PAYMENT_METHODS = ['In Hand', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

export const IncomeForm = ({ isOpen, onClose, onSubmit }) => {
  const { incomeSources, addIncomeSource, deleteIncomeSource } = useIncomeSources();

  const [amount, setAmount]               = useState('');
  const [note, setNote]                   = useState('');
  const [sourceId, setSourceId]           = useState('');
  const [paymentMethod, setPaymentMethod] = useState('In Hand');
  const [newSourceName, setNewSourceName] = useState('');
  const [isManagingSources, setIsManagingSources] = useState(false);
  const [sourceToDelete, setSourceToDelete]       = useState(null);

  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [dateStr, setDateStr] = useState(getTodayISO());

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setSourceId(incomeSources?.length > 0 ? incomeSources[0].id : '');
      setPaymentMethod('In Hand');
      setNewSourceName('');
      setDateStr(getTodayISO());
      setIsManagingSources(false);
      setSourceToDelete(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || (!sourceId && !newSourceName)) return;

    let finalSourceId    = sourceId;
    let finalSourceName  = incomeSources.find(s => s.id === sourceId)?.name || '';
    let finalSourceColor = incomeSources.find(s => s.id === sourceId)?.colorHex || '#10B981';

    if (sourceId === 'new' && newSourceName) {
      const colors = ['#10B981', '#6366F1', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      finalSourceId    = await addIncomeSource({ name: newSourceName, colorHex: randomColor });
      finalSourceName  = newSourceName;
      finalSourceColor = randomColor;
    }

    const finalDate = dateStr === getTodayISO()
      ? new Date().toISOString()
      : new Date(dateStr).toISOString();

    onSubmit({
      amount: parseFloat(amount),
      note,
      sourceId: finalSourceId,
      sourceName: finalSourceName,
      colorHex: finalSourceColor,
      paymentMethod,
      date: finalDate,
    });
    onClose();
  };

  const handleConfirmSourceDelete = async () => {
    if (sourceToDelete) {
      await deleteIncomeSource(sourceToDelete);
      setSourceToDelete(null);
      setSourceId(incomeSources.find(s => s.id !== sourceToDelete)?.id || '');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full transform rounded-t-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-all sm:max-w-md sm:rounded-3xl border border-transparent dark:border-zinc-800/50">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
              {isManagingSources ? 'Manage Sources' : 'Log Credit'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isManagingSources && (
              <button
                onClick={() => setIsManagingSources(true)}
                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Manage Credit Sources"
              >
                <Settings2 size={20} className="text-gray-500 dark:text-zinc-400" />
              </button>
            )}
            <button
              onClick={() => isManagingSources ? setIsManagingSources(false) : onClose()}
              className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Manage Sources View */}
        {isManagingSources ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {incomeSources.length === 0 ? (
              <p className="text-gray-500 dark:text-zinc-400 text-sm text-center py-4">No sources found.</p>
            ) : (
              incomeSources.map(src => (
                <div key={src.id} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-4 border border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: src.colorHex }} />
                    <span className="font-bold text-gray-800 dark:text-zinc-200">{src.name}</span>
                  </div>
                  <button
                    onClick={() => setSourceToDelete(src.id)}
                    className="flex items-center justify-center rounded-full p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
            <button
              onClick={() => setIsManagingSources(false)}
              className="mt-4 w-full rounded-xl bg-gray-100 dark:bg-zinc-800 py-4 font-bold text-gray-700 dark:text-zinc-300 transition-all hover:bg-gray-200 active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          /* Add Income Form */
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Amount */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Amount received</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-500">₹</span>
                <input
                  type="number" required min="1" step="any"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white py-3 pl-8 pr-4 text-lg font-bold outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Date received</label>
              <input
                type="date" required value={dateStr} onChange={e => setDateStr(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white p-3 font-semibold outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20"
              />
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1.5 leading-snug">
                This date decides which period your credit appears in — e.g. April 1st salary shows in April monthly &amp; 2026 yearly views.
              </p>
            </div>

            {/* Income Source */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Credit Source</label>
              <select
                value={sourceId} onChange={e => setSourceId(e.target.value)} required
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white p-3 font-semibold outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 appearance-none"
              >
                <option value="" disabled>Select Source...</option>
                {incomeSources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="new">+ Add Custom Source</option>
              </select>
            </div>

            {sourceId === 'new' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="text" required value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  placeholder="e.g. Tuition / Internship"
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white p-3 outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20"
                />
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-zinc-300">Received via</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method} type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      paymentMethod === method
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200'
                        : 'bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-700 hover:border-emerald-300 hover:text-emerald-600'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Note (Optional)</label>
              <input
                type="text" value={note} onChange={e => setNote(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white p-3 outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20"
                placeholder="e.g. April salary"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:bg-emerald-600 active:scale-95"
            >
              Log Credit
            </button>
          </form>
        )}
      </div>

      {/* Delete Source Confirm */}
      {sourceToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-transparent dark:border-zinc-800/50">
            <h3 className="mb-2 text-xl font-bold text-rose-600 dark:text-rose-500">Delete Source?</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">Existing income entries under this source will remain but become unlinked. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setSourceToDelete(null)} className="flex-1 rounded-xl bg-gray-100 dark:bg-zinc-800 py-3 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleConfirmSourceDelete} className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 active:scale-95 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
