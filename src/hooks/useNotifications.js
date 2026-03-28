import { useMemo } from 'react';

const REMINDERS = [
  "Hey, did your money disappear today? Log it before it ghosts you 👻",
  "Your wallet had a rough day. Tell the app about it 💸",
  "No expense logged today... either you're broke or you forgot. Which is it? 🤔",
  "Log today's expenses before your future self cries 😭",
  "Money went somewhere today. The app wants receipts 🧾",
  "One day of not logging = one month of confusion. Add today's expense! 📊",
  "Your chai took ₹ from you today. At least make it official 🍵",
  "Friendly reminder from your wallet: IT HURTS. Log it. 💀",
];

const BUDGET_WARNINGS = [
  "⚠️ You've used {pct}% of your budget. Slow down, speedster.",
  "⚠️ {pct}% of budget gone. Hope those purchases sparked joy.",
  "Budget check: {pct}% used. The other {left}% is watching you.",
];

const BUDGET_EXCEEDED = [
  "💀 You broke your budget. Your future self has been notified.",
  "🚨 Budget exceeded! Your money said BYE BYE.",
  "You went over budget. Bold strategy. Let's see how it plays out 😬",
];

const STREAK_MSG = [
  "🔥 {days}-day logging streak! Look at you being responsible.",
  "💪 {days} days of tracking! Your bank account is proud.",
];

const getRandomFrom = (arr, replacements = {}) => {
  let msg = arr[Math.floor(Math.random() * arr.length)];
  Object.entries(replacements).forEach(([key, val]) => {
    msg = msg.replace(`{${key}}`, val);
  });
  return msg;
};

export const useNotifications = ({ expenses, budgets, timeFrame = 'monthly' } = {}) => {
  const notifications = useMemo(() => {
    if (!expenses) return [];
    const msgs = [];
    const now = new Date();
    const hour = now.getHours();

    // --- 1. Daily Expense Reminder (after 7PM if no expense logged today) ---
    if (hour >= 19) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const loggedToday = expenses.some(e => new Date(e.date) >= today);
      if (!loggedToday) {
        msgs.push({
          id: 'daily-reminder',
          type: 'reminder', // indigo
          message: getRandomFrom(REMINDERS),
        });
      }
    }

    // --- 2. Budget Status ---
    if (budgets && budgets.length > 0) {
      const budgetDoc = budgets.find(b => b.timeFrame === timeFrame);
      if (budgetDoc) {
        const budgetLimit = budgetDoc.amount;
        let startDate = new Date(now);
        if (timeFrame === 'weekly') {
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
        } else if (timeFrame === 'monthly') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const periodSpend = expenses
          .filter(e => new Date(e.date) >= startDate)
          .reduce((sum, e) => sum + e.amount, 0);

        const pct = Math.round((periodSpend / budgetLimit) * 100);

        if (pct >= 100) {
          msgs.push({
            id: 'budget-exceeded',
            type: 'danger', // rose
            message: getRandomFrom(BUDGET_EXCEEDED),
          });
        } else if (pct >= 80) {
          msgs.push({
            id: 'budget-warning',
            type: 'warning', // amber
            message: getRandomFrom(BUDGET_WARNINGS, { pct, left: 100 - pct }),
          });
        }
      }
    }

    // --- 3. Streak Message ---
    if (expenses.length > 0) {
      let streak = 0;
      const dayMs = 86400000;
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      for (let i = 0; i < 30; i++) {
        const dayStart = new Date(todayMidnight.getTime() - i * dayMs);
        const dayEnd = new Date(dayStart.getTime() + dayMs);
        const hasEntry = expenses.some(e => {
          const d = new Date(e.date);
          return d >= dayStart && d < dayEnd;
        });
        if (hasEntry) streak++;
        else break;
      }

      if (streak >= 3) {
        msgs.push({
          id: 'streak',
          type: 'success', // green
          message: getRandomFrom(STREAK_MSG, { days: streak }),
        });
      }
    }

    return msgs;
  }, [expenses, budgets, timeFrame]);

  return { notifications };
};
