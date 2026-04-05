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

const DEFAULT_INCOME_SOURCES = [
  { name: 'Salary / Stipend', colorHex: '#10B981' },
  { name: 'Freelance',        colorHex: '#6366F1' },
  { name: 'Scholarship',      colorHex: '#8B5CF6' },
  { name: 'Side Hustle',      colorHex: '#F59E0B' },
  { name: 'Pocket Money',     colorHex: '#EC4899' },
  { name: 'Gift / Other',     colorHex: '#64748B' },
];

let localExpenses      = JSON.parse(localStorage.getItem('expenses'))      || [];
let localCategories    = JSON.parse(localStorage.getItem('categories'))    || [];
let localBudgets       = JSON.parse(localStorage.getItem('budgets'))       || [];
let localIncomes       = JSON.parse(localStorage.getItem('incomes'))       || [];
let localIncomeSources = JSON.parse(localStorage.getItem('incomeSources')) || [];

const saveLocal = () => {
  localStorage.setItem('expenses',   JSON.stringify(localExpenses));
  localStorage.setItem('categories', JSON.stringify(localCategories));
  localStorage.setItem('budgets',    JSON.stringify(localBudgets));
};

const saveLocalIncome = () => {
  localStorage.setItem('incomes',       JSON.stringify(localIncomes));
  localStorage.setItem('incomeSources', JSON.stringify(localIncomeSources));
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

  const deleteCategory = async (id) => {
    if (!currentUser) throw new Error("Not logged in");
    // Prevent deleting default virtual categories if they haven't been pushed to DB (id starts with default-)
    if (id.startsWith('default-')) {
      alert("Cannot delete built-in default categories.");
      return; 
    }
    
    if (isMock) {
      localCategories = localCategories.filter(c => c.id !== id);
      localExpenses = localExpenses.filter(e => e.categoryId !== id); // Cascade delete
      saveLocal();
      setCategories([...localCategories.filter(c => !c.userId || c.userId === currentUser.uid)]);
      // note: useExpenses needs a way to refresh, but it auto-reloads lightly over storage if we managed context right,
      // or we can just let a manual refresh fix it. 
      return;
    }

    await deleteDoc(doc(db, 'categories', id));
    // Cascade delete related expenses if we want strict consistency (Not strictly necessary for the UI to not crash, but keeps DB clean)
    // We'll leave it simple for Firestore and assume manual cleanup for now unless deeply requested.
  };

  return { categories, loading, addCategory, deleteCategory };
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

export const useBudgets = () => {
  const { currentUser } = useAuth();
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    if (isMock) {
      const filtered = localBudgets.filter(b => !b.userId || b.userId === currentUser.uid);
      setBudgets([...filtered]);
      return;
    }

    const qRef = query(collection(db, 'budgets'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(qRef, (snap) => {
      setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [currentUser]);

  const setBudget = async (timeFrame, amount) => {
    if (!currentUser) return;
    
    if (isMock) {
      const existingIdx = localBudgets.findIndex(b => b.userId === currentUser.uid && b.timeFrame === timeFrame);
      if (existingIdx >= 0) {
        localBudgets[existingIdx].amount = parseFloat(amount);
      } else {
        localBudgets.push({ id: Date.now().toString(), userId: currentUser.uid, timeFrame, amount: parseFloat(amount) });
      }
      saveLocal();
      setBudgets([...localBudgets.filter(b => !b.userId || b.userId === currentUser.uid)]);
      return;
    }

    // Firestore Logic
    // Because we export useBudgets on mount, we can search the budgets array to see if the doc exists
    const existing = budgets.find(b => b.timeFrame === timeFrame);
    if (existing) {
      await updateDoc(doc(db, 'budgets', existing.id), { amount: parseFloat(amount) });
    } else {
      await addDoc(collection(db, 'budgets'), { userId: currentUser.uid, timeFrame, amount: parseFloat(amount) });
    }
  };

  return { budgets, setBudget };
};

// ── Income Sources hook (mirrors useCategories) ────────────────────────────────
export const useIncomeSources = () => {
  const { currentUser } = useAuth();
  const [incomeSources, setIncomeSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const resolveSources = (srcs) => {
      if (srcs.length === 0) {
        if (isMock) {
          const defaults = DEFAULT_INCOME_SOURCES.map(s => ({ ...s, id: `${Date.now()}${Math.random()}`, userId: currentUser.uid }));
          localIncomeSources.push(...defaults);
          saveLocalIncome();
          setIncomeSources(defaults);
          setLoading(false);
          return;
        } else {
          const defaultVirtuals = DEFAULT_INCOME_SOURCES.map((s, idx) => ({ ...s, id: `isrc-default-${idx}`, userId: currentUser.uid }));
          setIncomeSources(defaultVirtuals);
        }
      } else {
        setIncomeSources(srcs);
      }
      setLoading(false);
    };

    if (isMock) {
      const dbSrcs = localIncomeSources.filter(s => !s.userId || s.userId === currentUser.uid);
      resolveSources(dbSrcs);
      return;
    }

    const q = query(collection(db, 'incomeSources'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      resolveSources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentUser]);

  const addIncomeSource = async (srcData) => {
    if (!currentUser) throw new Error('Not logged in');
    if (isMock) {
      const newSrc = { id: Date.now().toString(), userId: currentUser.uid, ...srcData };
      localIncomeSources.push(newSrc);
      saveLocalIncome();
      setIncomeSources([...localIncomeSources.filter(s => !s.userId || s.userId === currentUser.uid)]);
      return newSrc.id;
    }
    const docRef = await addDoc(collection(db, 'incomeSources'), { ...srcData, userId: currentUser.uid });
    return docRef.id;
  };

  const deleteIncomeSource = async (id) => {
    if (!currentUser) throw new Error('Not logged in');
    if (id.startsWith('isrc-default-')) { alert('Cannot delete built-in default sources.'); return; }
    if (isMock) {
      localIncomeSources = localIncomeSources.filter(s => s.id !== id);
      saveLocalIncome();
      setIncomeSources([...localIncomeSources.filter(s => !s.userId || s.userId === currentUser.uid)]);
      return;
    }
    await deleteDoc(doc(db, 'incomeSources', id));
  };

  return { incomeSources, loading, addIncomeSource, deleteIncomeSource };
};

// ── Incomes hook (mirrors useExpenses) ────────────────────────────────────────
export const useIncomes = () => {
  const { currentUser } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    if (isMock) {
      const filtered = localIncomes.filter(i => !i.userId || i.userId === currentUser.uid);
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      setIncomes([...filtered]);
      setLoading(false);
      return;
    }

    const qRef = query(collection(db, 'incomes'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(qRef, (snap) => {
      const docsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setIncomes(docsData);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const addIncome = async (incomeData) => {
    if (!currentUser) throw new Error('Not logged in');
    const incDate = incomeData.date || new Date().toISOString();
    if (isMock) {
      const newInc = { id: Date.now().toString(), userId: currentUser.uid, ...incomeData, date: incDate };
      localIncomes.push(newInc);
      saveLocalIncome();
      const filtered = localIncomes.filter(i => !i.userId || i.userId === currentUser.uid);
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      setIncomes([...filtered]);
      return newInc.id;
    }
    const docRef = await addDoc(collection(db, 'incomes'), { ...incomeData, userId: currentUser.uid, date: incDate });
    return docRef.id;
  };

  const deleteIncome = async (id) => {
    if (!currentUser) throw new Error('Not logged in');
    if (isMock) {
      localIncomes = localIncomes.filter(i => i.id !== id);
      saveLocalIncome();
      const filtered = localIncomes.filter(i => !i.userId || i.userId === currentUser.uid);
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      setIncomes([...filtered]);
      return;
    }
    await deleteDoc(doc(db, 'incomes', id));
  };

  return { incomes, loading, addIncome, deleteIncome };
};
