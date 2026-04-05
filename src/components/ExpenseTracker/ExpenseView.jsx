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
        {/* Type pills — gradient active */}
        <div className="flex w-full bg-white dark:bg-zinc-900/80 p-1.5 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
          {['weekly', 'monthly', 'yearly'].map(type => (
            <button
              key={type}
              onClick={() => { setPeriodType(type); setPeriodOffset(0); setSelectedCategory('all'); }}
              className={`flex-1 py-1.5 text-xs uppercase tracking-wider font-bold rounded-xl transition-all duration-200 ${
                periodType === type
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/60 dark:shadow-indigo-900/40'
                  : 'text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {/* Arrow navigator — indigo left accent when in past */}
        <div className={`flex items-center justify-between rounded-2xl border px-3 py-2 shadow-sm transition-all ${
          periodOffset < 0
            ? 'bg-indigo-50/60 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40'
            : 'bg-white border-gray-100 dark:bg-zinc-900 dark:border-zinc-800/50'
        }`}>
          <button
            id="period-prev-btn"
            onClick={() => { setPeriodOffset(o => o - 1); setSelectedCategory('all'); }}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-all font-bold text-base select-none"
            title="Previous period"
          >
            ←
          </button>
          <span className={`text-sm font-bold text-center flex-1 px-2 truncate ${
            periodOffset < 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-zinc-100'
          }`}>
            {periodWindow?.label}
          </span>
          <button
            id="period-next-btn"
            onClick={() => { setPeriodOffset(o => o + 1); setSelectedCategory('all'); }}
            disabled={periodOffset >= 0}
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all font-bold text-base select-none ${
              periodOffset >= 0
                ? 'text-gray-200 dark:text-zinc-800 cursor-not-allowed'
                : 'text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/40'
            }`}
            title="Next period"
          >
            →
          </button>
        </div>
      </div>

      {/* Dynamic Top Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {budgetLimit ? (
          <div className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-5">
              <button onClick={openBudgetModal} className="absolute top-4 right-4 text-gray-300 hover:text-indigo-600 dark:text-zinc-700 dark:hover:text-indigo-400 transition-colors">
                <Pencil size={13} />
              </button>
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Left in Budget</p>
              <p className={`text-2xl font-black leading-none ${(budgetLimit - periodTotal) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-zinc-100'}`}>
                ₹{(budgetLimit - periodTotal).toLocaleString()}
              </p>
              <p className="mt-1.5 text-xs font-medium text-gray-400 dark:text-zinc-600">of ₹{budgetLimit.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors group cursor-pointer" onClick={openBudgetModal}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-5">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-indigo-500 dark:text-indigo-400 transition-opacity">
                <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">+ Limit</span>
              </div>
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2 capitalize">Spend ({periodType})</p>
              <p className="text-2xl font-black leading-none text-gray-900 dark:text-zinc-100">₹{periodTotal.toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div className="p-5">
            <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Top Category</p>
            <p className="text-2xl font-black leading-none text-indigo-600 dark:text-indigo-400 truncate">{categoryData.length > 0 ? categoryData[0].name : '–'}</p>
          </div>
        </div>
      </div>

      {expenses.length === 0 && !budgetLimit ? (
        <div className="mt-8 rounded-2xl bg-white dark:bg-zinc-900 p-10 text-center shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <p className="font-bold text-gray-700 dark:text-zinc-300">No expenses yet</p>
          <p className="text-sm mt-1 text-gray-400 dark:text-zinc-600">Tap the + button to log your first one.</p>
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
              <div className="flex items-center gap-3 mb-4 px-1">
                <h3 className="text-base font-black text-gray-800 dark:text-zinc-100 uppercase tracking-wide">Breakdown</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-indigo-100 to-transparent dark:from-indigo-900/30" />
              </div>
              <div className="space-y-2.5">
                {categoryData.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                    className={`rounded-2xl overflow-hidden shadow-sm border transition-all duration-200 cursor-pointer group ${
                      selectedCategory === cat.id
                        ? 'border-indigo-200 dark:border-indigo-700/40'
                        : 'border-gray-100 hover:border-gray-200 dark:border-zinc-800/50 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Category color accent bar */}
                    <div className="h-1 w-full" style={{ backgroundColor: cat.colorHex }} />
                    <div className={`p-4 ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-50/70 dark:bg-zinc-800/90'
                        : 'bg-white dark:bg-zinc-900'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black" style={{ backgroundColor: `${cat.colorHex}18`, color: cat.colorHex }}>
                            {cat.name.charAt(0)}
                          </div>
                          <div>
                            <span className={`font-bold text-sm ${selectedCategory === cat.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-800 dark:text-zinc-200'}`}>{cat.name}</span>
                            <p className="text-xs text-gray-400 dark:text-zinc-600">{cat.count} {cat.count === 1 ? 'entry' : 'entries'}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCategoryToDelete(cat.id); }}
                            className="flex items-center justify-center rounded-lg p-1.5 transition-colors text-gray-200 dark:text-zinc-800 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Delete Category"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="text-right">
                          <span className={`block font-black text-base ${selectedCategory === cat.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-zinc-100'}`}>₹{cat.amount.toLocaleString()}</span>
                          <span className="text-xs font-semibold text-gray-400 dark:text-zinc-600">{cat.percentage.toFixed(0)}%{budgetLimit ? ' of budget' : ''}</span>
                        </div>
                      </div>
                      <div className={`h-1.5 w-full rounded-full overflow-hidden ${selectedCategory === cat.id ? 'bg-indigo-100 dark:bg-indigo-950/40' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ backgroundColor: cat.colorHex, width: `${Math.max(Math.min(cat.percentage, 100), 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Expenses List */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4 px-1">
              <h3 className="text-base font-black text-gray-800 dark:text-zinc-100 uppercase tracking-wide">History</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-indigo-100 to-transparent dark:from-indigo-900/30" />
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            {categoryData.length > 0 && (
              <div className="flex overflow-x-auto gap-2 pb-3 mb-3 px-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-white text-gray-500 border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 hover:border-gray-300'
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
                        : 'bg-transparent border-gray-200 text-gray-500 dark:border-zinc-800 dark:text-zinc-400 hover:border-gray-300'
                    }`}
                    style={selectedCategory === cat.id ? { borderColor: cat.colorHex, color: cat.colorHex } : {}}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2.5">
              {filteredHistory.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-gray-400 dark:text-zinc-600">
                    {selectedCategory === 'all' ? `No entries in this ${periodType}.` : 'No entries for this category in this period.'}
                  </p>
                </div>
              ) : (
                filteredHistory.slice(0, 15).map(exp => (
                  <div key={exp.id} className="relative flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-all group hover:shadow-md hover:border-gray-200 dark:hover:border-zinc-700">
                    {/* Category color left bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: exp.colorHex }} />
                    <div className="flex items-center gap-3 pl-5 pr-3 py-4 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm" style={{ backgroundColor: `${exp.colorHex}18`, color: exp.colorHex }}>
                        {exp.categoryName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-zinc-100 truncate">{exp.categoryName || 'Expense'}</p>
                        <p className="text-xs font-medium text-gray-400 dark:text-zinc-600 truncate">
                          {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{exp.note && ` • ${exp.note}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pr-3">
                      <span className="font-black text-gray-900 dark:text-zinc-100 tabular-nums">₹{exp.amount.toLocaleString()}</span>
                      <button
                        onClick={() => setExpenseToDelete(exp.id)}
                        className="p-2 rounded-xl text-gray-300 dark:text-zinc-700 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:text-rose-500 transition-colors"
                      >
                        <Trash2 size={15} />
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
