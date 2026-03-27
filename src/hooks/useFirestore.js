import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, where } from 'firebase/firestore';

// Check if we are using the placeholder project ID
const isMock = !db.app.options.projectId || db.app.options.projectId === "YOUR_PROJECT_ID";

// Initial mock data
let localPeople = JSON.parse(localStorage.getItem('people')) || [
  { id: '1', name: 'Alice', totalBalance: 500, phone: '+1234567890' },
  { id: '2', name: 'Bob', totalBalance: -300, phone: '+0987654321' }
];

let localTransactions = JSON.parse(localStorage.getItem('transactions')) || [
  { id: '101', personId: '1', amount: 500, type: 'lend', note: 'Dinner', date: new Date().toISOString() },
  { id: '102', personId: '2', amount: 300, type: 'owe', note: 'Movies', date: new Date().toISOString() }
];

const saveLocal = () => {
  localStorage.setItem('people', JSON.stringify(localPeople));
  localStorage.setItem('transactions', JSON.stringify(localTransactions));
}

export const usePeople = () => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMock) {
      setPeople([...localPeople]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'people'));
    const unsub = onSnapshot(q, (snap) => {
      setPeople(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addPerson = async (personData) => {
    if (isMock) {
      const newPerson = { id: Date.now().toString(), totalBalance: 0, ...personData };
      localPeople.push(newPerson);
      saveLocal();
      setPeople([...localPeople]);
      return newPerson.id;
    }
    const docRef = await addDoc(collection(db, 'people'), { ...personData, totalBalance: 0 });
    return docRef.id;
  };

  const updatePersonBalance = async (id, newBalance) => {
    if (isMock) {
      const p = localPeople.find(x => x.id === id);
      if (p) p.totalBalance = newBalance;
      saveLocal();
      setPeople([...localPeople]);
      return;
    }
    await updateDoc(doc(db, 'people', id), { totalBalance: newBalance });
  };

  return { people, loading, addPerson, updatePersonBalance };
};

export const useTransactions = (personId) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMock) {
      const filtered = localTransactions.filter(t => !personId || t.personId === personId);
      filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
      setTransactions([...filtered]);
      setLoading(false);
      return;
    }
    let qRef = collection(db, 'transactions');
    if (personId) {
      // Omit orderBy to avoid requiring a Firebase composite index, we will sort on the client!
      qRef = query(qRef, where('personId', '==', personId));
    }
    const unsub = onSnapshot(qRef, (snap) => {
      const docsData = snap.docs.map(d => ({id: d.id, ...d.data()}));
      docsData.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort client-side
      setTransactions(docsData);
      setLoading(false);
    });
    return () => unsub();
  }, [personId]);

  const addTransaction = async (txData) => {
    if (isMock) {
      const newTx = { id: Date.now().toString(), date: new Date().toISOString(), ...txData };
      localTransactions.push(newTx);
      saveLocal();
      
      const filtered = localTransactions.filter(t => !personId || t.personId === personId);
      filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
      setTransactions([...filtered]);
      
      return newTx.id;
    }
    const docRef = await addDoc(collection(db, 'transactions'), { ...txData, date: new Date().toISOString() });
    return docRef.id;
  };

  return { transactions, loading, addTransaction };
};
