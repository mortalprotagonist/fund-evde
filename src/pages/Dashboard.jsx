import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { PersonRow } from '../components/PersonRow';
import { TransactionForm } from '../components/TransactionForm';
import { usePeople, useTransactions } from '../hooks/useFirestore';

export const Dashboard = () => {
  const { people, loading: peopleLoading, addPerson, updatePersonBalance } = usePeople();
  const { addTransaction } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate Net Balance
  const netBalance = people.reduce((acc, p) => acc + p.totalBalance, 0);

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
    });

    // Update person total balance
    const change = data.type === 'lend' ? data.amount : -data.amount;
    await updatePersonBalance(finalPersonId, currentBalance + change);
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-gray-50 to-gray-50 pb-24">
      <div className="mx-auto max-w-lg px-4 pt-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Fund Evde</h1>
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" />
          </div>
        </header>

        <StatCard balance={netBalance} />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">People</h2>
        </div>

        {peopleLoading ? (
          <div className="animate-pulse space-y-4">
             <div className="h-20 w-full rounded-2xl bg-gray-200"></div>
             <div className="h-20 w-full rounded-2xl bg-gray-200"></div>
          </div>
        ) : (
          <div>
            {people.length === 0 ? (
              <div className="mt-8 text-center text-gray-500">
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
