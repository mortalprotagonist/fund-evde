import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Trash2, Plus } from 'lucide-react';
import { usePeople, useTransactions } from '../hooks/useFirestore';
import { HistoryItem } from '../components/HistoryItem';
import { SettleModal } from '../components/SettleModal';
import { TransactionForm } from '../components/TransactionForm';

export const PersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { people, updatePersonBalance, deletePerson } = usePeople();
  const { transactions, loading, addTransaction, deleteTransaction } = useTransactions(id);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const handleDeletePerson = async () => {
    try {
      await deletePerson(person.id);
      navigate('/', { replace: true });
    } catch (err) {
      alert("Failed to delete person: " + err.message);
    }
  };

  const executeDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteTransaction(transactionToDelete.id);
      // Revert the totalBalance effect. If we lent +, so we -, if we borrowed -, so we +.
      const txAmount = transactionToDelete.amount;
      const change = transactionToDelete.type === 'lend' ? -txAmount : txAmount;
      await updatePersonBalance(id, person.totalBalance + change);
      setTransactionToDelete(null);
    } catch (err) {
      alert("Failed to delete transaction: " + err.message);
    }
  };

  const person = people.find(p => p.id === id);
  if (!person) return <div className="p-8 text-center text-gray-500">Loading or Not Found...</div>;

  const isPositive = person.totalBalance >= 0;
  const absBalance = Math.abs(person.totalBalance);

  const handleSettleSubmit = async (data) => {
    // Save transaction
    await addTransaction({
      personId: id,
      amount: data.amount,
      type: data.type,
      note: data.note || 'Settle / Partial Payment',
    });

    // Update person total balance
    const change = data.type === 'lend' ? data.amount : -data.amount;
    await updatePersonBalance(id, person.totalBalance + change);
    setIsSettleModalOpen(false);
  };

  const handleQuickAddSubmit = async (data) => {
    await addTransaction({
      personId: id,
      amount: data.amount,
      type: data.type,
      note: data.note,
    });
    const change = data.type === 'lend' ? data.amount : -data.amount;
    await updatePersonBalance(id, person.totalBalance + change);
    setIsTransactionFormOpen(false);
  };

  const handleWhatsApp = () => {
    let message = '';
    if (person.totalBalance > 0) {
      message = `Hi ${person.name}, just a friendly reminder about the ₹${absBalance} you owe me. Let me know when you can settle it!`;
    } else {
      message = `Hi ${person.name}, reminding myself I owe you ₹${absBalance}. I'll transfer it soon!`;
    }
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24 transition-colors">
      {/* Header Profile Section */}
      <div className="bg-white dark:bg-slate-800 px-4 pb-8 pt-6 shadow-sm rounded-b-3xl transition-colors">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <ArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="rounded-full p-2 text-rose-500 hover:bg-rose-50 transition-colors" title="Delete Person">
              <Trash2 size={24} />
            </button>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40 text-4xl font-bold text-indigo-700 dark:text-indigo-400 shadow-inner dark:shadow-slate-900/50 transition-colors">
              {person.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white transition-colors">{person.name}</h1>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">{isPositive ? "Owes you" : "You owe"}</p>
              <h2 className={`mt-1 text-5xl font-black tracking-tight transition-colors ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                ₹{absBalance.toLocaleString()}
              </h2>
            </div>
            
            <div className="mt-8 flex w-full items-center gap-3">
              <button 
                onClick={() => setIsTransactionFormOpen(true)}
                className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-slate-700 font-bold text-indigo-600 dark:text-indigo-400 shadow-sm transition-all hover:bg-indigo-200 dark:hover:bg-slate-600 active:scale-95"
              >
                <Plus size={28} />
              </button>
              <button 
                onClick={() => setIsSettleModalOpen(true)}
                className="flex-1 rounded-2xl bg-indigo-600 h-[56px] font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95"
              >
                Settle Up
              </button>
              <button 
                onClick={handleWhatsApp}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl h-[56px] bg-[#25D366] font-bold text-white shadow-lg shadow-green-200 transition-all hover:bg-[#20bd5a] hover:shadow-green-300 active:scale-95"
              >
                <MessageCircle size={22} />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="mx-auto mt-10 max-w-lg px-4">
        <h3 className="mb-6 text-xl font-bold text-gray-900 dark:text-white transition-colors">Transaction History</h3>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
             <div className="h-24 w-full rounded-2xl bg-gray-200 dark:bg-slate-800"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-800 p-8 text-center shadow-sm border border-gray-100 dark:border-slate-700/50 transition-colors">
            <p className="text-gray-500 dark:text-gray-400">No transactions recorded.</p>
          </div>
        ) : (
          <div className="pl-2 pb-6">
            {transactions.map((tx, idx) => (
              <div key={tx.id} className="relative">
                <HistoryItem transaction={tx} onDelete={setTransactionToDelete} />
                {/* Hide the line on the last item by adding a cover or adjusting styles in HistoryItem */}
                {idx === transactions.length - 1 && (
                  <div className="absolute bottom-0 left-[1.15rem] top-10 w-4 bg-gray-50 dark:bg-slate-900 -ml-2 transition-colors"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SettleModal 
        isOpen={isSettleModalOpen} 
        onClose={() => setIsSettleModalOpen(false)} 
        onSubmit={handleSettleSubmit}
        person={person}
      />

      <TransactionForm 
        isOpen={isTransactionFormOpen} 
        onClose={() => setIsTransactionFormOpen(false)} 
        onSubmit={handleQuickAddSubmit}
        people={[person]} 
        initialPersonId={person.id}
      />

      {/* Delete Confirmation Modal for Person */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl transition-colors">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Person?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 transition-colors">
              Are you sure you want to delete {person.name}? This will permanently erase all their transactions.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl bg-gray-100 dark:bg-slate-700 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeletePerson}
                className="flex-1 rounded-xl bg-rose-500 py-3 font-semibold text-white hover:bg-rose-600 shadow-lg shadow-rose-200 dark:shadow-rose-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Transaction */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl transition-colors">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Transaction?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 transition-colors">
              Are you sure you want to delete this {transactionToDelete.type === 'lend' ? "lent" : "borrowed"} amount of ₹{transactionToDelete.amount}? The total balance will be recalculated.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setTransactionToDelete(null)}
                className="flex-1 rounded-xl bg-gray-100 dark:bg-slate-700 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteTransaction}
                className="flex-1 rounded-xl bg-rose-500 py-3 font-semibold text-white hover:bg-rose-600 shadow-lg shadow-rose-200 dark:shadow-rose-900/20 transition-colors"
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
