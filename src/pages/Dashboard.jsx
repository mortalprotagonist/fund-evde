import React, { useState } from 'react';
import { Plus, LogOut, Download, Loader2 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { PersonRow } from '../components/PersonRow';
import { TransactionForm } from '../components/TransactionForm';
import { ExpenseView } from '../components/ExpenseTracker/ExpenseView';
import { ExpenseForm } from '../components/ExpenseTracker/ExpenseForm';
import { ThemeToggle } from '../components/ThemeToggle';
import { usePeople, useTransactions } from '../hooks/useFirestore';
import { useExpenses } from '../hooks/useExpenses';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const { people, loading: peopleLoading, addPerson, updatePersonBalance } = usePeople();
  const { transactions, addTransaction } = useTransactions();
  const { addExpense, expenses } = useExpenses();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');

  // Export debt (lend/borrow) transactions
  const generateDebtCSV = () => {
    if (!transactions || !transactions.length) return alert('No debt transactions to export!');
    const headers = ['Date', 'Type', 'Amount', 'Person', 'Note'];
    const rows = transactions.map(tx => {
      const person = people.find(p => p.id === tx.personId);
      const personName = person ? person.name : 'Unknown';
      const dateStr = new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const escapedNote = `"${(tx.note || '').replace(/"/g, '""')}"`;
      const escapedName = `"${personName.replace(/"/g, '""')}"`;
      return [dateStr, tx.type, tx.amount, escapedName, escapedNote].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fund_evde_debt_transactions.csv';
    link.click();
  };

  // Export ALL expenses grouped by year — one year section per block
  const generateExpenseCSV = () => {
    if (!expenses || !expenses.length) return alert('No expenses to export!');
    const byYear = {};
    [...expenses]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(exp => {
        const year = new Date(exp.date).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(exp);
      });
    const sortedYears = Object.keys(byYear).sort((a, b) => Number(a) - Number(b));
    const lines = [];
    sortedYears.forEach((year, idx) => {
      if (idx > 0) lines.push('');
      lines.push(`=== ${year} ===`);
      lines.push('Date,Category,Amount,Note');
      byYear[year].forEach(exp => {
        const dateStr = new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const cat = `"${(exp.categoryName || 'Unknown').replace(/"/g, '""')}"`;
        const note = `"${(exp.note || '').replace(/"/g, '""')}"`;
        lines.push(`${dateStr},${cat},${exp.amount},${note}`);
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fund_evde_expenses_all.csv';
    link.click();
  };

  // Calculate Net Balance & Breakdown
  const netBalance = people.reduce((acc, p) => acc + p.totalBalance, 0);
  const totalLent = people.filter(p => p.totalBalance > 0).reduce((acc, p) => acc + p.totalBalance, 0);
  const totalOwed = Math.abs(people.filter(p => p.totalBalance < 0).reduce((acc, p) => acc + p.totalBalance, 0));

  const handleAddTransaction = async (data) => {
    let finalPersonId = data.personId;
    let currentBalance = 0;

    if (data.personId === 'new') {
      finalPersonId = await addPerson({ name: data.newPersonName });
    } else {
      const person = people.find(p => p.id === data.personId);
      currentBalance = person ? person.totalBalance : 0;
    }

    // Save transaction
    await addTransaction({
      personId: finalPersonId,
      amount: data.amount,
      type: data.type,
      note: data.note,
      date: data.date,
    });

    // Update person total balance
    const change = data.type === 'lend' ? data.amount : -data.amount;
    await updatePersonBalance(finalPersonId, currentBalance + change);
  };

  const handleAddExpense = async (data) => {
    await addExpense(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24 transition-colors duration-300">
      {/* Subtle top gradient band */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-indigo-50/80 to-transparent dark:from-indigo-950/30 dark:to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-lg px-4 pt-8">
        <header className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">Fund Evde</h1>
            <p className="text-xs font-medium text-gray-400 dark:text-zinc-600 mt-0.5">Personal finance tracker</p>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <ThemeToggle />
            <button
              id="download-btn"
              onClick={activeTab === 'expenses' ? generateExpenseCSV : generateDebtCSV}
              title={activeTab === 'expenses' ? 'Export All Expenses CSV' : 'Export Debt Transactions CSV'}
              className="flex items-center justify-center rounded-xl p-2 text-gray-500 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 hover:border-indigo-200 hover:text-indigo-600 dark:hover:border-indigo-800/50 dark:hover:text-indigo-400 shadow-sm transition-all"
            >
              <Download size={18} />
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center rounded-xl p-2 text-gray-500 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 hover:border-rose-200 hover:text-rose-500 dark:hover:border-rose-800/50 dark:hover:text-rose-400 shadow-sm transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
            <div className="ml-0.5 h-9 w-9 overflow-hidden rounded-xl border-2 border-indigo-100 dark:border-indigo-900/50 shadow-md shadow-indigo-100/50 dark:shadow-none transition-colors">
              <img src={currentUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="Avatar" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            </div>
          </div>
        </header>

        {/* Segmented Control — gradient active pill */}
        <div className="mb-8 flex w-full bg-white dark:bg-zinc-900/80 p-1.5 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'expenses'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                : 'text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'people'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                : 'text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300'
            }`}
          >
            Debt Tracker
          </button>
        </div>

        {activeTab === 'people' ? (
          <>
            <StatCard balance={netBalance} totalLent={totalLent} totalOwed={totalOwed} />

            <div className="mb-4 flex items-center justify-between mt-8">
              <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-100 transition-colors">People</h2>
            </div>

        {peopleLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-zinc-500 animate-pulse transition-colors">Loading records...</p>
          </div>
        ) : (
          <div>
            {people.length === 0 ? (
              <div className="mt-8 text-center text-gray-500 dark:text-zinc-500 transition-colors">
                <p>No transactions yet.</p>
                <p className="text-sm">Tap the + button to add one.</p>
              </div>
            ) : (
              people.map(person => (
                <PersonRow key={person.id} person={person} />
              ))
            )}
          </div>
        )}
          </>
        ) : (
          <ExpenseView />
        )}
      </div>

      {/* FAB - Context Aware */}
      <button
        onClick={() => activeTab === 'people' ? setIsModalOpen(true) : setIsExpenseModalOpen(true)}
        className="fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-300 dark:shadow-none transition-transform hover:scale-105 active:scale-95 z-40"
      >
        <Plus size={32} />
      </button>

      <TransactionForm 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleAddTransaction}
        people={people}
      />
      
      <ExpenseForm 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        onSubmit={handleAddExpense}
      />
    </div>
  );
};
