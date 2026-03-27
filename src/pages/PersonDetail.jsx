import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { usePeople, useTransactions } from '../hooks/useFirestore';
import { HistoryItem } from '../components/HistoryItem';
import { TransactionForm } from '../components/TransactionForm';

export const PersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { people, updatePersonBalance } = usePeople();
  const { transactions, loading, addTransaction } = useTransactions(id);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Profile Section */}
      <div className="bg-white px-4 pb-8 pt-6 shadow-sm rounded-b-3xl">
        <div className="mx-auto max-w-lg">
          <button onClick={() => navigate(-1)} className="mb-6 rounded-full p-2 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-4xl font-bold text-indigo-700 shadow-inner">
              {person.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">{person.name}</h1>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{isPositive ? "Owes you" : "You owe"}</p>
              <h2 className={`mt-1 text-5xl font-black tracking-tight ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                ₹{absBalance.toLocaleString()}
              </h2>
            </div>
            
            <div className="mt-8 flex w-full gap-4">
              <button 
                onClick={() => setIsSettleModalOpen(true)}
                className="flex-1 rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95"
              >
                Settle Up
              </button>
              <button 
                onClick={handleWhatsApp}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 font-bold text-white shadow-lg shadow-green-200 transition-all hover:bg-[#20bd5a] hover:shadow-green-300 active:scale-95"
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
        <h3 className="mb-6 text-xl font-bold text-gray-900">Transaction History</h3>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
             <div className="h-24 w-full rounded-2xl bg-gray-200"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500">No transactions recorded.</p>
          </div>
        ) : (
          <div className="pl-2 pb-6">
            {transactions.map((tx, idx) => (
              <div key={tx.id} className="relative">
                <HistoryItem transaction={tx} />
                {/* Hide the line on the last item by adding a cover or adjusting styles in HistoryItem */}
                {idx === transactions.length - 1 && (
                  <div className="absolute bottom-0 left-[1.15rem] top-10 w-4 bg-gray-50 -ml-2"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionForm 
        isOpen={isSettleModalOpen} 
        onClose={() => setIsSettleModalOpen(false)} 
        onSubmit={handleSettleSubmit}
        people={[person]} // Only show this person
      />
    </div>
  );
};
