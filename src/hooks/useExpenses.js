import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const isMock = !db.app.options.projectId || db.app.options.projectId === "YOUR_PROJECT_ID";

const DEFAULT_CATEGORIES = [
  { name: 'Food', colorHex: '#4F46E5' }, // Indigo 600
  { name: 'Travel', colorHex: '#0891B2' }, // Cyan 600
  { name: 'Rent', colorHex: '#059669' }, // Emerald 600
  { name: 'Entertainment', colorHex: '#D946EF' }, // Fuchsia 500
  { name: 'Side Hustle', colorHex: '#F59E0B' } // Amber 500
];

let localExpenses = JSON.parse(localStorage.getItem('expenses')) || [];
let localCategories = JSON.parse(localStorage.getItem('categories')) || [];

const saveLocal = () => {
  localStorage.setItem('expenses', JSON.stringify(localExpenses));
  localStorage.setItem('categories', JSON.stringify(localCategories));
};

export const useCategories = () => {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const resolveCategories = (cats) => {
      if (cats.length === 0) {
        // If they have no categories, auto-populate defaults
        if (isMock) {
          const defaults = DEFAULT_CATEGORIES.map(c => ({ ...c, id: Date.now().toString() + Math.random(), userId: currentUser.uid }));
          localCategories.push(...defaults);
          saveLocal();
          setCategories(defaults);
          setLoading(false);
          return;
        } else {
          // Initialize in firestore? Or just return default visually.
          // Better to just show defaults visually if empty so we don't spam db on mount,
          // but for consistency let's add them to DB if empty.
          // Since adding them to db inside useEffect is messy, we'll just yield them virtually if empty.
          const defaultVirtuals = DEFAULT_CATEGORIES.map((c, idx) => ({ ...c, id: `default-${idx}`, userId: currentUser.uid }));
          setCategories(defaultVirtuals);
        }
      } else {
        setCategories(cats);
      }
      setLoading(false);
    };

    if (isMock) {
      const dbCats = localCategories.filter(c => !c.userId || c.userId === currentUser.uid);
      resolveCategories(dbCats);
      return;
    }

    const q = query(collection(db, 'categories'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      resolveCategories(docsData);
    });

    return () => unsub();
  }, [currentUser]);

  const addCategory = async (catData) => {
    if (!currentUser) throw new Error("Not logged in");
    if (isMock) {
      const newCat = { id: Date.now().toString(), userId: currentUser.uid, ...catData };
      localCategories.push(newCat);
      saveLocal();
      setCategories([...localCategories.filter(c => !c.userId || c.userId === currentUser.uid)]);
      return newCat.id;
    }
    const docRef = await addDoc(collection(db, 'categories'), { ...catData, userId: currentUser.uid });
    return docRef.id;
  };

  return { categories, loading, addCategory };
};

export const useExpenses = () => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    if (isMock) {
      const filtered = localExpenses.filter(e => !e.userId || e.userId === currentUser.uid);
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses([...filtered]);
      setLoading(false);
      return;
    }

    const qRef = query(collection(db, 'expenses'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(qRef, (snap) => {
      const docsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(docsData);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const addExpense = async (expenseData) => {
    if (!currentUser) throw new Error("Not logged in");
    const expDate = expenseData.date || new Date().toISOString();
    
    if (isMock) {
      const newExp = { id: Date.now().toString(), userId: currentUser.uid, ...expenseData, date: expDate };
      localExpenses.push(newExp);
      saveLocal();
      
      const filtered = localExpenses.filter(e => !e.userId || e.userId === currentUser.uid);
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses([...filtered]);
      
      return newExp.id;
    }

    const docRef = await addDoc(collection(db, 'expenses'), { ...expenseData, userId: currentUser.uid, date: expDate });
    return docRef.id;
  };

  const deleteExpense = async (id) => {
    if (!currentUser) throw new Error("Not logged in");
    
    if (isMock) {
      localExpenses = localExpenses.filter(e => e.id !== id);
      saveLocal();
      
      const filtered = localExpenses.filter(e => !e.userId || e.userId === currentUser.uid);
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses([...filtered]);
      return;
    }

    await deleteDoc(doc(db, 'expenses', id));
  };

  return { expenses, loading, addExpense, deleteExpense };
};
