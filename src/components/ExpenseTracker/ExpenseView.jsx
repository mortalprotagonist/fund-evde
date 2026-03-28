import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useExpenses } from '../../hooks/useExpenses';
import { Loader2, Trash2 } from 'lucide-react';

export const ExpenseView = () => {
  const { expenses, loading, deleteExpense } = useExpenses();
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // Time aggregations
  const { weeklyTotal, monthlyTotal, categoryData, monthlyExpenses } = useMemo(() => {
    if (!expenses) return { weeklyTotal: 0, monthlyTotal: 0, categoryData: [], monthlyExpenses: [] };

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let wTotal = 0;
    let mTotal = 0;
    const catMap = {};
    const mExpenses = [];

    expenses.forEach(exp => {
      const d = new Date(exp.date);
      if (d >= startOfWeek) {
        wTotal += exp.amount;
      }
      if (d >= startOfMonth) {
        mTotal += exp.amount;
        mExpenses.push(exp);

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

    // Formatting for Recharts
    const cData = Object.values(catMap).sort((a, b) => b.amount - a.amount);
    
    // Add percentage
    cData.forEach(c => {
      c.percentage = mTotal > 0 ? (c.amount / mTotal) * 100 : 0;
    });

    return { weeklyTotal: wTotal, monthlyTotal: mTotal, categoryData: cData, monthlyExpenses: mExpenses };
  }, [expenses]);

  const handleDelete = async () => {
    if (expenseToDelete) {
      await deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-zinc-500 animate-pulse transition-colors">Loading expenses...</p>
      </div>
    );
  }

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl bg-white dark:bg-zinc-800 p-3 shadow-xl dark:shadow-none border border-gray-100 dark:border-zinc-700 transition-colors z-50">
          <p className="font-bold text-gray-900 dark:text-zinc-100">{data.name}</p>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">₹{data.amount.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      
      {/* Top Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
          <p className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">This Week</p>
          <p className="text-2xl font-black text-gray-900 dark:text-zinc-100">₹{weeklyTotal.toLocaleString()}</p>
        </div>
        <div className="rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
          <p className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{monthlyTotal.toLocaleString()}</p>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white dark:bg-zinc-900 p-8 text-center shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors">
          <p className="text-gray-500 dark:text-zinc-400">No expenses recorded yet.</p>
          <p className="text-sm mt-1">Tap the + button to add one.</p>
        </div>
      ) : (
        <>
          {/* Donut Chart Visualization */}
          <div className="mb-6 rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors relative flex flex-col items-center">
            <h3 className="w-full text-left text-lg font-bold text-gray-800 dark:text-zinc-100 mb-2">Monthly Breakdown</h3>
            
            {monthlyTotal > 0 ? (
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      stroke="none"
                      paddingAngle={4}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.colorHex} className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-gray-400 dark:text-zinc-500">Total</span>
                  <span className="text-2xl font-black text-gray-900 dark:text-zinc-100">₹{monthlyTotal.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="h-48 w-full flex items-center justify-center text-gray-400 dark:text-zinc-600 text-sm font-medium">
                No spending this month.
              </div>
            )}
          </div>

          {/* Categories List */}
          {categoryData.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mb-4 px-1">Top Categories</h3>
              <div className="space-y-3">
                {categoryData.map(cat => (
                  <div key={cat.id} className="rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-sm border border-gray-100 dark:border-zinc-800/50 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/80 active:scale-[0.98]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.colorHex }}></div>
                        <span className="font-bold text-gray-800 dark:text-zinc-200">{cat.name}</span>
                      </div>
                      <span className="font-black text-gray-900 dark:text-zinc-100">₹{cat.amount.toLocaleString()}</span>
                    </div>
                    {/* Progress Bar mapped to percentage */}
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ backgroundColor: cat.colorHex, width: `${Math.max(cat.percentage, 2)}%` }} // min 2% width for visibility
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Expenses List */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mb-4 px-1">Recent History</h3>
            <div className="space-y-3">
              {expenses.slice(0, 5).map(exp => (
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
                    {/* Delete Icon revealing on Hover/Focus */}
                    <button 
                      onClick={() => setExpenseToDelete(exp.id)}
                      className="hidden sm:group-hover:flex items-center justify-center rounded-full p-2 text-gray-400 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    {/* Always visible inline tap target on mobile */}
                    <button 
                      onClick={() => setExpenseToDelete(exp.id)}
                      className="sm:hidden p-2 text-gray-300 dark:text-zinc-700 active:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-colors border border-transparent dark:border-zinc-800/50">
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-zinc-100">Delete Expense?</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">This action cannot be undone. Are you sure?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 rounded-xl bg-gray-100 dark:bg-zinc-800 py-3 font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
