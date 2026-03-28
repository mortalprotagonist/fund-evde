import React, { useState } from 'react';
import { Plus, LogOut, Download } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { PersonRow } from '../components/PersonRow';
import { TransactionForm } from '../components/TransactionForm';
import { ThemeToggle } from '../components/ThemeToggle';
import { usePeople, useTransactions } from '../hooks/useFirestore';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const { people, loading: peopleLoading, addPerson, updatePersonBalance } = usePeople();
  const { transactions, addTransaction } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const generateCSV = () => {
    if (!transactions || !transactions.length) return alert('No transactions to export!');
    const headers = ["Date", "Type", "Amount", "Person", "Note"];
    const rows = transactions.map(tx => {
      const person = people.find(p => p.id === tx.personId);
      const personName = person ? person.name : 'Unknown';
      const dateStr = new Date(tx.date).toLocaleString('en-US');
      const escapedNote = `"${(tx.note || '').replace(/"/g, '""')}"`;
      const escapedName = `"${personName.replace(/"/g, '""')}"`;
      return [dateStr, tx.type, tx.amount, escapedName, escapedNote].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "fund_evde_transactions.csv";
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24 transition-colors duration-300">
      <div className="mx-auto max-w-lg px-4 pt-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white transition-colors">Fund Evde</h1>
          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />
            <button onClick={generateCSV} className="flex items-center justify-center rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-indigo-400 transition-all" title="Export CSV">
              <Download size={20} />
            </button>
            <button onClick={logout} className="flex items-center justify-center rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-rose-400 transition-all" title="Logout">
              <LogOut size={20} />
            </button>
            <div className="ml-1 h-10 w-10 overflow-hidden rounded-full border-2 border-white dark:border-zinc-800 shadow-sm transition-colors">
              <img src={currentUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="Avatar" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            </div>
          </div>
        </header>

        <StatCard balance={netBalance} totalLent={totalLent} totalOwed={totalOwed} />

        <div className="mb-4 flex items-center justify-between mt-8">
          <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-100 transition-colors">People</h2>
        </div>

        {peopleLoading ? (
          <div className="animate-pulse space-y-4">
             <div className="h-20 w-full rounded-2xl bg-gray-200"></div>
             <div className="h-20 w-full rounded-2xl bg-gray-200"></div>
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
      </div>

      {/* FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-300 transition-transform hover:scale-105 active:scale-95 z-40"
      >
        <Plus size={32} />
      </button>

      <TransactionForm 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleAddTransaction}
        people={people}
      />
    </div>
  );
};
