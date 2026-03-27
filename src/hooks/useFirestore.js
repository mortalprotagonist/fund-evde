import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, deleteDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const isMock = !db.app.options.projectId || db.app.options.projectId === "YOUR_PROJECT_ID";

let localPeople = JSON.parse(localStorage.getItem('people')) || [];
let localTransactions = JSON.parse(localStorage.getItem('transactions')) || [];

const saveLocal = () => {
  localStorage.setItem('people', JSON.stringify(localPeople));
  localStorage.setItem('transactions', JSON.stringify(localTransactions));
}

export const usePeople = () => {
  const { currentUser } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    if (isMock) {
      setPeople([...localPeople.filter(p => !p.userId || p.userId === currentUser.uid)]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'people'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setPeople(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const addPerson = async (personData) => {
    if (!currentUser) throw new Error("Not logged in");
    if (isMock) {
      const newPerson = { id: Date.now().toString(), totalBalance: 0, userId: currentUser.uid, ...personData };
      localPeople.push(newPerson);
      saveLocal();
      setPeople([...localPeople.filter(p => !p.userId || p.userId === currentUser.uid)]);
      return newPerson.id;
    }
    const docRef = await addDoc(collection(db, 'people'), { ...personData, totalBalance: 0, userId: currentUser.uid });
    return docRef.id;
  };

  const updatePersonBalance = async (id, newBalance) => {
    if (isMock) {
      const p = localPeople.find(x => x.id === id);
      if (p) p.totalBalance = newBalance;
      saveLocal();
      setPeople([...localPeople.filter(p => !p.userId || p.userId === currentUser.uid)]);
      return;
    }
    await updateDoc(doc(db, 'people', id), { totalBalance: newBalance });
  };

  const deletePerson = async (id) => {
    if (isMock) {
      localPeople = localPeople.filter(p => p.id !== id);
      localTransactions = localTransactions.filter(t => t.personId !== id);
      saveLocal();
      setPeople([...localPeople.filter(p => !p.userId || p.userId === currentUser.uid)]);
      return;
    }
    await deleteDoc(doc(db, 'people', id));
    // Prune orphaned transactions
    const q = query(collection(db, 'transactions'), where('personId', '==', id));
    const snap = await getDocs(q);
    snap.forEach(d => deleteDoc(d.ref));
  };

  return { people, loading, addPerson, updatePersonBalance, deletePerson };
};

export const useTransactions = (personId) => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    if (isMock) {
      const filtered = localTransactions.filter(t => (!t.userId || t.userId === currentUser.uid) && (!personId || t.personId === personId));
      filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
      setTransactions([...filtered]);
      setLoading(false);
      return;
    }
    let qRef = collection(db, 'transactions');
    if (personId) {
      // Omitting orderBy natively to avoid composite index limits, sort on client!
      qRef = query(qRef, where('userId', '==', currentUser.uid), where('personId', '==', personId));
    } else {
      qRef = query(qRef, where('userId', '==', currentUser.uid));
    }
    const unsub = onSnapshot(qRef, (snap) => {
      const docsData = snap.docs.map(d => ({id: d.id, ...d.data()}));
      docsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(docsData);
      setLoading(false);
    });
    return () => unsub();
  }, [personId, currentUser]);

  const addTransaction = async (txData) => {
    if (!currentUser) throw new Error("Not logged in");
    if (isMock) {
      const newTx = { id: Date.now().toString(), date: new Date().toISOString(), userId: currentUser.uid, ...txData };
      localTransactions.push(newTx);
      saveLocal();
      
      const filtered = localTransactions.filter(t => (!t.userId || t.userId === currentUser.uid) && (!personId || t.personId === personId));
      filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
      setTransactions([...filtered]);
      
      return newTx.id;
    }
    const docRef = await addDoc(collection(db, 'transactions'), { ...txData, userId: currentUser.uid, date: new Date().toISOString() });
    return docRef.id;
  };

  return { transactions, loading, addTransaction };
};
