import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useExpenses, useBudgets, useCategories } from '../../hooks/useExpenses';
import { Loader2, Trash2, X, Pencil, FilterX } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationBanner } from '../NotificationBanner';
import { NotificationPrompt } from '../NotificationPrompt';

// ── Pure utility ─────────────────────────────────────────────────────────────
// Returns { start, end, label } for any period type + offset combination.
// offset 0 = current period, -1 = one period back, etc.
// Week is a true calendar week: Monday 00:00 → Sunday 23:59.
const getPeriodWindow = (type, offset) => {
  const now = new Date();
  let start, end, label;

  if (type === 'weekly') {
    const day = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
    const daysToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToMonday + offset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    start = monday;
    end = sunday;
    label = `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (type === 'monthly') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    start = new Date(d);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } else {
    const year = now.getFullYear() + offset;
    start = new Date(year, 0, 1, 0, 0, 0, 0);
    end = new Date(year, 11, 31, 23, 59, 59, 999);
    label = String(year);
  }

  return { start, end, label };
};
// ─────────────────────────────────────────────────────────────────────────────

export const ExpenseView = () => {
  const { expenses, loading: expensesLoading, deleteExpense } = useExpenses();
  const { budgets, setBudget } = useBudgets();
  const { deleteCategory } = useCategories();
  
  // Modals / Deletion States
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  
  // Time and Filter States
  const [periodType, setPeriodType] = useState('monthly');  // 'weekly' | 'monthly' | 'yearly'
  const [periodOffset, setPeriodOffset] = useState(0);      // 0 = current, -1 = last, etc.
  const [selectedCategory, setSelectedCategory] = useState('all');

  const activeBudgetDoc = budgets?.find(b => b.timeFrame === periodType);
  const budgetLimit = activeBudgetDoc ? activeBudgetDoc.amount : null;

  const { notifications } = useNotifications({ expenses, budgets, timeFrame: periodType });

  // Unified Time & Category Aggregator (uses explicit start/end window from getPeriodWindow)
  const { periodWindow, periodTotal, categoryData, periodExpenses } = useMemo(() => {
    const win = getPeriodWindow(periodType, periodOffset);
    if (!expenses) return { periodWindow: win, periodTotal: 0, categoryData: [], periodExpenses: [] };

    let total = 0;
    const catMap = {};
    const dExpenses = [];

    expenses.forEach(exp => {
      const d = new Date(exp.date);
      if (d >= win.start && d <= win.end) {
        total += exp.amount;
        dExpenses.push(exp);

        const cId = exp.categoryId || 'unknown';
        if (!catMap[cId]) {
          catMap[cId] = {
            id: cId,
            name: exp.categoryName || 'Unknown',
            colorHex: exp.colorHex || '#9ca3af',
            amount: 0,
            count: 0
          };
        }
        catMap[cId].amount += exp.amount;
        catMap[cId].count += 1;
      }
    });

    const cData = Object.values(catMap).sort((a, b) => b.amount - a.amount);
    const percentageBase = budgetLimit || total;
    cData.forEach(c => {
      c.percentage = percentageBase > 0 ? (c.amount / percentageBase) * 100 : 0;
    });

    return { periodWindow: win, periodTotal: total, categoryData: cData, periodExpenses: dExpenses };
  }, [expenses, periodType, periodOffset, budgetLimit]);

  const filteredHistory = useMemo(() => {
    if (selectedCategory === 'all') return periodExpenses;
    return periodExpenses.filter(e => e.categoryId === selectedCategory);
  }, [periodExpenses, selectedCategory]);

  const handleDeleteExpense = async () => {
    if (expenseToDelete) {
      await deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete);
      setCategoryToDelete(null);
      // Fallback selection to 'all' if active category was deleted
      if (selectedCategory === categoryToDelete) setSelectedCategory('all');
    }
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    setBudget(periodType, parseFloat(budgetInput) || 0);
    setIsBudgetModalOpen(false);
  };

  const openBudgetModal = () => {
    setBudgetInput(budgetLimit ? budgetLimit.toString() : '');
    setIsBudgetModalOpen(true);
  };

  if (expensesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-zinc-500 animate-pulse transition-colors">Loading tracking data...</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl bg-white dark:bg-zinc-800 p-3 shadow-xl dark:shadow-none border border-gray-100 dark:border-zinc-700 transition-colors z-50">
          <p className="font-bold text-gray-900 dark:text-zinc-100">{data.name}</p>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            ₹{data.amount.toLocaleString()} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      
      {/* Push Notification Permission Prompt */}
      <NotificationPrompt />

      {/* In-App Notifications */}
      <NotificationBanner notifications={notifications} />

      {/* Period Navigator */}
      <div className="mb-6 space-y-2">
        {/* Type pills */}
        <div className="flex w-full bg-gray-200/50 dark:bg-zinc-900/50 p-1.5 rounded-2xl backdrop-blur-sm border border-gray-200 dark:border-zinc-800 shadow-inner">
          {['weekly', 'monthly', 'yearly'].map(type => (
            <button
              key={type}
              onClick={() => { setPeriodType(type); setPeriodOffset(0); setSelectedCategory('all'); }}
              className={`flex-1 py-1.5 text-xs uppercase tracking-wider font-bold rounded-xl transition-all ${periodType === type ? 'bg-white text-indigo-600 shadow-sm dark:bg-zinc-800 dark:text-indigo-400 dark:shadow-none' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
            >
              {type}
            </button>
          ))}
        </div>
        {/* Arrow navigator */}
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800/50 px-3 py-2 shadow-sm">
          <button
            id="period-prev-btn"
            onClick={() => { setPeriodOffset(o => o - 1); setSelectedCategory('all'); }}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-indigo-400 transition-all font-bold text-base select-none"
            title="Previous period"
          >
            ←
          </button>
          <span className="text-sm font-bold text-gray-800 dark:text-zinc-100 text-center flex-1 px-2 truncate">
            {periodWindow?.label}
          </span>
          <button
            id="period-next-btn"
            onClick={() => { setPeriodOffset(o => o + 1); setSelectedCategory('all'); }}
            disabled={periodOffset >= 0}
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all font-bold text-base select-none ${
              periodOffset >= 0
                ? 'text-gray-300 dark:text-zinc-700 cursor-not-allowed'
                : 'text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-indigo-400'
            }`}
            title="Next period"
          >
            →
          </button>
        </div>
      </div>

      {/* Dynamic Top Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {budgetLimit ? (
          <div className="relative rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
            <button onClick={openBudgetModal} className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors">
              <Pencil size={14} />
            </button>
            <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1 text-ellipsis overflow-hidden whitespace-nowrap">Left in Budget</p>
            <p className={`text-2xl font-black ${(budgetLimit - periodTotal) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-zinc-100'}`}>
              ₹{(budgetLimit - periodTotal).toLocaleString()}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-zinc-500">of ₹{budgetLimit.toLocaleString()}</p>
          </div>
        ) : (
          <div className="relative rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors group cursor-pointer" onClick={openBudgetModal}>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-indigo-600 dark:text-indigo-400 transition-opacity">
              <span className="text-xs font-bold">+ Limit</span>
            </div>
            <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1 text-ellipsis overflow-hidden whitespace-nowrap capitalize">Spend ({periodType})</p>
            <p className="text-2xl font-black text-gray-900 dark:text-zinc-100">₹{periodTotal.toLocaleString()}</p>
          </div>
        )}

        <div className="rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
          <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1 text-ellipsis overflow-hidden whitespace-nowrap">Top Category</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 text-ellipsis overflow-hidden whitespace-nowrap">{categoryData.length > 0 ? categoryData[0].name : '-'}</p>
        </div>
      </div>

      {expenses.length === 0 && !budgetLimit ? (
        <div className="mt-8 rounded-3xl bg-white dark:bg-zinc-900 p-8 text-center shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
          <p className="text-gray-500 dark:text-zinc-400">No expenses recorded yet.</p>
          <p className="text-sm mt-1">Tap the + button to add one.</p>
        </div>
      ) : (
        <>
          {/* Donut Chart Visualization */}
          {(periodTotal > 0 || budgetLimit) && (
            <div className="mb-6 rounded-3xl bg-white dark:bg-zinc-900 pt-6 pb-2 px-6 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors relative flex flex-col items-center">
              
              {periodTotal > 0 ? (
                <div className="h-72 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: '600' }} />
                      <Pie
                        data={categoryData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={80}
                        outerRadius={115}
                        stroke="none"
                        paddingAngle={3}
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.colorHex} className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none" onClick={() => setSelectedCategory(entry.id)} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-10%' }}>
                    <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Total Span</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-zinc-100">₹{periodTotal.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="h-48 w-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-600 text-sm font-medium">
                  <p>Budget active, but no spending recorded.</p>
                </div>
              )}
            </div>
          )}

          {/* Categories List */}
          {categoryData.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mb-4 px-1">Detailed Breakdown</h3>
              <div className="space-y-3">
                {categoryData.map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                    className={`rounded-2xl p-4 shadow-sm border transition-colors cursor-pointer group ${
                      selectedCategory === cat.id 
                        ? 'bg-indigo-50 border-indigo-200 dark:bg-zinc-800/90 dark:border-indigo-500/30' 
                        : 'bg-white border-gray-100 hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800/50 dark:hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-opacity-20" style={{ backgroundColor: `${cat.colorHex}20`, color: cat.colorHex }}>
                          <span className="text-xs font-bold uppercase">{cat.name.charAt(0)}</span>
                        </div>
                        <span className={`font-bold ${selectedCategory === cat.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-800 dark:text-zinc-200'}`}>{cat.name}</span>
                        {/* Category Trash Icon (Inline) */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCategoryToDelete(cat.id); }}
                          className={`flex items-center justify-center rounded-full p-1 transition-colors ${selectedCategory === cat.id ? 'text-indigo-300 hover:text-rose-500' : 'text-gray-300 dark:text-zinc-700 hover:text-rose-500'}`}
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="text-right">
                        <span className={`block font-black ${selectedCategory === cat.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-zinc-100'}`}>₹{cat.amount.toLocaleString()}</span>
                        <span className="text-xs font-bold text-gray-400 dark:text-zinc-500">{cat.percentage.toFixed(0)}% {budgetLimit ? 'of budget' : ''}</span>
                      </div>
                    </div>
                    <div className={`h-2 w-full rounded-full overflow-hidden ${selectedCategory === cat.id ? 'bg-indigo-200/50 dark:bg-indigo-950/50' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ backgroundColor: cat.colorHex, width: `${Math.max(Math.min(cat.percentage, 100), 2)}%` }} // max 100, min 2
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Expenses List with Category Chips Filter */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100">History</h3>
              {selectedCategory !== 'all' && (
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  <X size={14} /> Clear Filter
                </button>
              )}
            </div>

            {categoryData.length > 0 && (
              <div className="flex overflow-x-auto gap-2 pb-3 mb-2 px-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    selectedCategory === 'all' 
                      ? 'bg-gray-800 text-white dark:bg-zinc-100 dark:text-zinc-900' 
                      : 'bg-white text-gray-500 border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  All
                </button>
                {categoryData.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                      selectedCategory === cat.id 
                        ? 'bg-white shadow-sm dark:bg-zinc-800' 
                        : 'bg-transparent border-gray-200 text-gray-500 dark:border-zinc-800 dark:text-zinc-400'
                    }`}
                    style={selectedCategory === cat.id ? { borderColor: cat.colorHex, color: cat.colorHex } : {}}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.colorHex }}></div>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="py-8 text-center text-gray-400 dark:text-zinc-600 text-sm font-medium">
                  {selectedCategory === 'all' ? `No entries in this ${periodType}.` : 'No entries for this category in this period.'}
                </div>
              ) : (
                filteredHistory.slice(0, 15).map(exp => ( // Showing up to 15 matching items
                  <div key={exp.id} className="relative flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-opacity-10" style={{ backgroundColor: `${exp.colorHex}20`, color: exp.colorHex }}>
                        <span className="font-bold uppercase">{exp.categoryName?.charAt(0) || '?'}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-zinc-100">{exp.categoryName || 'Expense'}</p>
                        <p className="text-xs font-medium text-gray-500 dark:text-zinc-500">
                          {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} 
                          {exp.note && ` • ${exp.note}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-gray-900 dark:text-zinc-100">₹{exp.amount.toLocaleString()}</span>
                      <button 
                        onClick={() => setExpenseToDelete(exp.id)}
                        className="hidden sm:group-hover:flex items-center justify-center rounded-full p-2 text-gray-400 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => setExpenseToDelete(exp.id)}
                        className="sm:hidden p-2 text-gray-300 dark:text-zinc-700 active:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Expense Overlay */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-colors border border-transparent dark:border-zinc-800/50">
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-zinc-100">Delete Expense?</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">This action cannot be undone. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setExpenseToDelete(null)} className="flex-1 rounded-xl bg-gray-100 dark:bg-zinc-800 py-3 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDeleteExpense} className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 active:scale-95 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Target Overlay */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-colors border border-transparent dark:border-zinc-800/50">
            <h3 className="mb-2 text-xl font-bold text-rose-600 dark:text-rose-500">Delete Entire Category?</h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-zinc-400">Deleting a category instantly cascades and wipes OUT all expenses ever tracked inside it.</p>
            <p className="mb-6 text-sm font-bold text-gray-900 dark:text-zinc-100">This is highly destructive. Proceed?</p>
            <div className="flex gap-3">
              <button onClick={() => setCategoryToDelete(null)} className="flex-1 rounded-xl bg-gray-100 dark:bg-zinc-800 py-3 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDeleteCategory} className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 active:scale-95 transition-all">Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Set Overlay */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm transform rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-colors border border-transparent dark:border-zinc-800/50">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 capitalize">{periodType} Budget Limit</h2>
              <button onClick={() => setIsBudgetModalOpen(false)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <X size={20} className="text-gray-500 dark:text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleSaveBudget}>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">Set a custom spending cap for this specific timeframe to shift your progress bars against a strict Budget limit.</p>
              <div className="relative mb-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 dark:text-zinc-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 dark:text-white py-3 pl-8 pr-4 text-lg font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
                  placeholder="Leave blank to disable"
                />
              </div>
              <button type="submit" className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all">
                {budgetInput ? 'Apply Budget Limit' : 'Disable Budget Limit'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
