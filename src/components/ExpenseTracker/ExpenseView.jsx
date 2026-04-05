import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useExpenses, useBudgets, useCategories, useIncomes } from '../../hooks/useExpenses';
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
  const { incomes, deleteIncome } = useIncomes();

  // Modals / Deletion States
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [incomeToDelete,  setIncomeToDelete]  = useState(null);
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

  // Income aggregation for the same window
  const { periodIncome, periodIncomeEntries } = useMemo(() => {
    const win = getPeriodWindow(periodType, periodOffset);
    if (!incomes) return { periodIncome: 0, periodIncomeEntries: [] };
    let total = 0;
    const dIncomes = [];
    incomes.forEach(inc => {
      const d = new Date(inc.date);
      if (d >= win.start && d <= win.end) {
        total += inc.amount;
        dIncomes.push({ ...inc, _type: 'income' });
      }
    });
    return { periodIncome: total, periodIncomeEntries: dIncomes };
  }, [incomes, periodType, periodOffset]);

  // Merged list: filtered expenses + all period incomes, sorted by date desc
  const mergedHistory = useMemo(() => {
    const expList = filteredHistory.map(e => ({ ...e, _type: 'expense' }));
    return [...expList, ...periodIncomeEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredHistory, periodIncomeEntries]);

  // Savings computation
  const netSaved     = periodIncome - periodTotal;
  const savingsRate  = periodIncome > 0 ? (netSaved / periodIncome) * 100 : null;

  const handleDeleteExpense = async () => {
    if (expenseToDelete) {
      await deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };

  const handleDeleteIncome = async () => {
    if (incomeToDelete) {
      await deleteIncome(incomeToDelete);
      setIncomeToDelete(null);
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

      {/* Period Navigator — sticky so it's always visible when scrolling */}
      <div className="sticky top-0 z-20 mb-6 space-y-2 bg-gray-50 dark:bg-zinc-950 pt-1 pb-2 -mx-4 px-4">
        {/* Type pills */}
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
        {/* Arrow navigator + compact spend badge */}
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
          {/* Compact spend chip — always visible when scrolled */}
          {periodTotal > 0 && (
            <span className="mx-2 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full shrink-0">
              ₹{periodTotal.toLocaleString()}
            </span>
          )}
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
        {/* Active category filter indicator */}
        {selectedCategory !== 'all' && (() => {
          const cat = categoryData.find(c => c.id === selectedCategory);
          return cat ? (
            <div className="flex items-center gap-2 px-1">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.colorHex }} />
              <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 truncate">{cat.name}</span>
              <span className="text-xs font-black" style={{ color: cat.colorHex }}>₹{cat.amount.toLocaleString()}</span>
              <span className="text-xs text-gray-400">({cat.percentage.toFixed(0)}%)</span>
              <button onClick={() => setSelectedCategory('all')} className="ml-auto text-xs font-bold text-rose-400 hover:text-rose-600">× Clear</button>
            </div>
          ) : null;
        })()}
      </div>

      {/* Stat Cards — period-aware layout */}
      <div className="mb-6">

        {periodType === 'weekly' ? (
          /* ── WEEKLY ONLY: Simple Spend + Top Category ── */
          <div className="grid grid-cols-2 gap-3">
            <div
              className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50 group cursor-pointer transition-all hover:shadow-md"
              onClick={openBudgetModal}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
              <div className="p-5">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {budgetLimit
                    ? <Pencil size={13} className="text-gray-400" />
                    : <span className="text-xs font-bold text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">+ Limit</span>
                  }
                </div>
                <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  {budgetLimit ? 'Left in Budget' : 'This Week'}
                </p>
                <p className={`text-2xl font-black leading-none ${
                  budgetLimit && (budgetLimit - periodTotal) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-zinc-100'
                }`}>
                  ₹{budgetLimit ? (budgetLimit - periodTotal).toLocaleString() : periodTotal.toLocaleString()}
                </p>
                {budgetLimit && (
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-600">of ₹{budgetLimit.toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
              <div className="p-5">
                <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Top Category</p>
                <p className="text-2xl font-black leading-none text-indigo-600 dark:text-indigo-400 truncate">
                  {categoryData.length > 0 ? categoryData[0].name : '–'}
                </p>
                {categoryData.length > 0 && (
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-600">₹{categoryData[0].total?.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

        ) : (
          /* ── MONTHLY & YEARLY: Full cashflow layout ── */
          <div className="space-y-3">
            {incomes.length === 0 ? (
              /* No income ever logged — single spend card */
              <div
                className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50 group cursor-pointer transition-all hover:shadow-md"
                onClick={openBudgetModal}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                <div className="p-5">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {budgetLimit
                      ? <Pencil size={13} className="text-gray-400" />
                      : <span className="text-xs font-bold text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">+ Set Limit</span>
                    }
                  </div>
                  <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    {periodType === 'monthly' ? 'This Month' : 'This Year'}
                  </p>
                  <p className="text-3xl font-black leading-none text-gray-900 dark:text-zinc-100">₹{periodTotal.toLocaleString()}</p>
                  {budgetLimit ? (
                    <p className="mt-2 text-sm font-semibold text-gray-400 dark:text-zinc-600">
                      ₹{(budgetLimit - periodTotal).toLocaleString()} left of ₹{budgetLimit.toLocaleString()} budget
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400 dark:text-zinc-600">Tap + → Log Credit to unlock savings tracking</p>
                  )}
                </div>
              </div>

            ) : (
              /* Income tracking active — 3-card cashflow */
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                    <div className="p-4">
                      <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Credit</p>
                      <p className="text-2xl font-black leading-none text-emerald-600 dark:text-emerald-400">₹{periodIncome.toLocaleString()}</p>
                      {periodIncome === 0 && (
                        <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1.5">Log this month's credit</p>
                      )}
                    </div>
                  </div>
                  <div className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50 group cursor-pointer" onClick={openBudgetModal}>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-orange-400" />
                    <div className="p-4">
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {budgetLimit
                          ? <Pencil size={12} className="text-gray-400" />
                          : <span className="text-xs font-bold text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">+ Limit</span>
                        }
                      </div>
                      <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Spend</p>
                      <p className="text-2xl font-black leading-none text-gray-900 dark:text-zinc-100">₹{periodTotal.toLocaleString()}</p>
                      {budgetLimit && <p className="mt-1 text-xs text-gray-400 dark:text-zinc-600">₹{(budgetLimit - periodTotal).toLocaleString()} left</p>}
                    </div>
                  </div>
                </div>

                {/* Savings card */}
                <div className="relative rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50">
                  {periodIncome === 0 && periodTotal === 0 ? (
                    <>
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700" />
                      <div className="px-5 py-4 flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800 text-xl">📊</div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Cashflow</p>
                          <p className="text-sm font-medium text-gray-400 dark:text-zinc-600 mt-0.5">Nothing logged this month.</p>
                        </div>
                      </div>
                    </>
                  ) : periodIncome === 0 ? (
                    <>
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-zinc-700 dark:to-zinc-800" />
                      <div className="px-5 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Savings Rate</p>
                          <p className="text-sm font-semibold text-gray-400 dark:text-zinc-500">No credit logged this month</p>
                        </div>
                        <p className="text-xs font-semibold text-indigo-400 dark:text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-xl leading-tight shrink-0 ml-3 text-right">
                          Log credit<br/>to calculate
                        </p>
                      </div>
                    </>
                  ) : periodTotal === 0 ? (
                    <>
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
                      <div className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">All Saved!</p>
                            <p className="text-2xl font-black leading-none text-emerald-600 dark:text-emerald-400">+₹{periodIncome.toLocaleString()}</p>
                          </div>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl">100% saved 🎉</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950/30">
                          <div className="h-full w-full rounded-full bg-emerald-400" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${netSaved >= 0 ? 'from-emerald-400 to-teal-400' : 'from-rose-400 to-pink-500'}`} />
                      <div className="px-5 py-4">
                        <div className="flex items-end justify-between mb-2">
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${netSaved >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                              {netSaved >= 0 ? 'Saved' : 'Overspent'}
                            </p>
                            <p className={`text-2xl font-black leading-none ${netSaved >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {netSaved >= 0 ? '+' : '-'}₹{Math.abs(netSaved).toLocaleString()}
                            </p>
                          </div>
                          <p className={`text-sm font-bold pb-0.5 ${netSaved >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                            {Math.round(Math.abs(savingsRate || 0))}% {netSaved >= 0 ? 'saved' : 'over income'}
                          </p>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${netSaved >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                            style={{ width: `${Math.min(Math.abs(savingsRate || 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>


      {expenses.length === 0 && incomes.length === 0 && !budgetLimit ? (
        <div className="mt-8 rounded-2xl bg-white dark:bg-zinc-900 p-10 text-center shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-2xl">
            💰
          </div>
          <p className="font-bold text-gray-700 dark:text-zinc-300">Nothing tracked yet</p>
          <p className="text-sm mt-1 text-gray-400 dark:text-zinc-600">Tap + to log an expense or income entry.</p>
        </div>
      ) : (
        <>
          {/* Donut Chart Visualization */}
          {(periodTotal > 0 || budgetLimit) && (
            <div className="mb-6 rounded-3xl bg-white dark:bg-zinc-900 pt-6 pb-2 px-6 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors relative flex flex-col items-center">
              
              {periodTotal > 0 ? (
                <div>
                  {/* Donut SVG — fixed height so ResponsiveContainer works */}
                  <div className="h-60 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={categoryData}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
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
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Total Spend</span>
                      <span className="text-2xl font-black text-gray-900 dark:text-zinc-100">₹{periodTotal.toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Custom legend — auto-height, never overflows */}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-4 pb-4 pt-1">
                    {categoryData.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                        className={`flex items-center gap-1.5 transition-opacity ${
                          selectedCategory !== 'all' && selectedCategory !== cat.id ? 'opacity-40' : 'opacity-100'
                        }`}
                      >
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.colorHex }} />
                        <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400">{cat.name}</span>
                      </button>
                    ))}
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
              {mergedHistory.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-gray-400 dark:text-zinc-600">
                    {selectedCategory === 'all' ? `No entries in this ${periodType}.` : 'No entries for this category in this period.'}
                  </p>
                </div>
              ) : (
                mergedHistory.slice(0, 20).map(entry =>
                  entry._type === 'income' ? (
                    /* Income row */
                    <div key={entry.id} className="relative flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-emerald-50 dark:border-emerald-900/20 transition-all hover:shadow-md">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" style={{ backgroundColor: entry.colorHex || '#10B981' }} />
                      <div className="flex items-center gap-3 pl-5 pr-3 py-4 flex-1 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-base" style={{ backgroundColor: `${entry.colorHex || '#10B981'}18`, color: entry.colorHex || '#10B981' }}>
                          ↑
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 dark:text-zinc-100">{entry.sourceName || 'Credit'}</p>
                            {entry.paymentMethod && entry.paymentMethod !== 'In Hand' && (
                              <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold shrink-0">{entry.paymentMethod}</span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-gray-400 dark:text-zinc-600 truncate">
                            {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{entry.note && ` • ${entry.note}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pr-3">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">+₹{entry.amount.toLocaleString()}</span>
                        <button onClick={() => setIncomeToDelete(entry.id)} className="p-2 rounded-xl text-gray-300 dark:text-zinc-700 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Expense row */
                    <div key={entry.id} className="relative flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-zinc-700">
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: entry.colorHex }} />
                      <div className="flex items-center gap-3 pl-5 pr-3 py-4 flex-1 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm" style={{ backgroundColor: `${entry.colorHex}18`, color: entry.colorHex }}>
                          {entry.categoryName?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 dark:text-zinc-100 truncate">{entry.categoryName || 'Expense'}</p>
                            {entry.paymentMethod && entry.paymentMethod !== 'In Hand' && (
                              <span className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 px-2 py-0.5 rounded-full font-semibold shrink-0">{entry.paymentMethod}</span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-gray-400 dark:text-zinc-600 truncate">
                            {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{entry.note && ` • ${entry.note}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pr-3">
                        <span className="font-black text-gray-900 dark:text-zinc-100 tabular-nums">₹{entry.amount.toLocaleString()}</span>
                        <button onClick={() => setExpenseToDelete(entry.id)} className="p-2 rounded-xl text-gray-300 dark:text-zinc-700 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </>
      )}

      {/* Expense Delete Overlay */}
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

      {/* Income Delete Overlay */}
      {incomeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-colors border border-transparent dark:border-zinc-800/50">
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-zinc-100">Delete Credit Entry?</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">This will remove the income record. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setIncomeToDelete(null)} className="flex-1 rounded-xl bg-gray-100 dark:bg-zinc-800 py-3 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDeleteIncome} className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 active:scale-95 transition-all">Delete</button>
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
