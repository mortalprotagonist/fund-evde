import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings2 } from 'lucide-react';
import { useCategories } from '../../hooks/useExpenses';

export const ExpenseForm = ({ isOpen, onClose, onSubmit }) => {
  const { categories, addCategory, deleteCategory } = useCategories();
  
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [dateStr, setDateStr] = useState(getTodayISO());

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setCategoryId(categories?.length > 0 ? categories[0].id : '');
      setNewCatName('');
      setDateStr(getTodayISO());
      setIsManagingCategories(false);
      setCategoryToDelete(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || (!categoryId && !newCatName)) return;
    
    let finalCatId = categoryId;
    let finalCatName = categories.find(c => c.id === categoryId)?.name || '';
    let finalCatColor = categories.find(c => c.id === categoryId)?.colorHex || '#4F46E5';

    // Auto-generate random hex for new category
    if (categoryId === 'new' && newCatName) {
      const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#8B5CF6', '#EC4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      finalCatId = await addCategory({ name: newCatName, colorHex: randomColor });
      finalCatName = newCatName;
      finalCatColor = randomColor;
    }

    const finalDate = dateStr === getTodayISO() ? new Date().toISOString() : new Date(dateStr).toISOString();
    
    onSubmit({
      amount: parseFloat(amount),
      note,
      categoryId: finalCatId,
      categoryName: finalCatName,
      colorHex: finalCatColor,
      date: finalDate
    });
    
    onClose();
  };

  const handleConfirmCategoryDelete = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete);
      setCategoryToDelete(null);
      setCategoryId('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full transform rounded-t-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-all sm:max-w-md sm:rounded-3xl border border-transparent dark:border-zinc-800/50">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 transition-colors">
            {isManagingCategories ? 'Manage Categories' : 'New Expense'}
          </h2>
          <div className="flex items-center gap-2">
            {!isManagingCategories && (
              <button onClick={() => setIsManagingCategories(true)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors" title="Manage Categories">
                <Settings2 size={20} className="text-gray-500 dark:text-zinc-400" />
              </button>
            )}
            <button onClick={() => { isManagingCategories ? setIsManagingCategories(false) : onClose() }} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <X size={20} className="text-gray-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {isManagingCategories ? (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
            {categories.length === 0 ? (
              <p className="text-gray-500 dark:text-zinc-400 text-sm text-center py-4">No custom categories found.</p>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-4 border border-gray-100 dark:border-zinc-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.colorHex }}></div>
                    <span className="font-bold text-gray-800 dark:text-zinc-200">{cat.name}</span>
                  </div>
                  <button 
                    onClick={() => setCategoryToDelete(cat.id)}
                    className="flex items-center justify-center rounded-full p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
            <button
              onClick={() => setIsManagingCategories(false)}
              className="mt-6 w-full rounded-xl bg-gray-100 dark:bg-zinc-800 py-4 font-bold text-gray-700 dark:text-zinc-300 transition-all hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-95"
            >
              Done Managing
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300 transition-colors">Amount spent</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 dark:text-zinc-500 transition-colors">₹</span>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white py-3 pl-8 pr-4 text-lg font-bold outline-none transition-all focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 transition-colors mb-1">Date</label>
            <input
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white p-3 font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300 transition-colors">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white p-3 font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 appearance-none"
            >
              <option value="" disabled>Select Category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="new">+ Add Custom Category</option>
            </select>
          </div>

          {categoryId === 'new' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Groceries"
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white p-3 outline-none transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300 transition-colors">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white p-3 outline-none transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
              placeholder="e.g. Weekly supermarket"
            />
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95"
          >
            Save Expense
          </button>
        </form>
        )}
      </div>

      {categoryToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-colors border border-transparent dark:border-zinc-800/50">
            <h3 className="mb-2 text-xl font-bold text-rose-600 dark:text-rose-500">Delete Category?</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">This instantly wipes out all expenses tracked inside it. Are you absolutely sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setCategoryToDelete(null)} className="flex-1 rounded-xl bg-gray-100 dark:bg-zinc-800 py-3 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleConfirmCategoryDelete} className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 active:scale-95 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
