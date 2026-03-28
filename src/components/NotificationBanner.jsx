import React, { useState, useEffect } from 'react';
import { X, Bell, Flame, AlertTriangle, CheckCircle } from 'lucide-react';

const TYPE_STYLES = {
  reminder: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800/50',
    icon: <Bell size={18} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />,
    close: 'text-indigo-400 hover:text-indigo-600 dark:text-indigo-500 dark:hover:text-indigo-300',
    text: 'text-indigo-800 dark:text-indigo-200',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/50',
    icon: <AlertTriangle size={18} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />,
    close: 'text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300',
    text: 'text-amber-800 dark:text-amber-200',
  },
  danger: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800/50',
    icon: <AlertTriangle size={18} className="text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />,
    close: 'text-rose-400 hover:text-rose-600 dark:text-rose-500 dark:hover:text-rose-300',
    text: 'text-rose-800 dark:text-rose-200',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    icon: <Flame size={18} className="text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />,
    close: 'text-emerald-400 hover:text-emerald-600 dark:text-emerald-500 dark:hover:text-emerald-300',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
};

const DISMISSED_KEY = 'fundEvde_dismissedNotifs';

const getDismissed = () => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const setDismissed = (id) => {
  const map = getDismissed();
  // Store with today's date so reminders re-appear next day
  map[id] = new Date().toDateString();
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
};

const isTodayDismissed = (id) => {
  const map = getDismissed();
  return map[id] === new Date().toDateString();
};

export const NotificationBanner = ({ notifications = [] }) => {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    // Filter out ones already dismissed today
    const active = notifications.filter(n => !isTodayDismissed(n.id));
    setVisible(active);
  }, [notifications]);

  const dismiss = (id) => {
    setDismissed(id);
    setVisible(prev => prev.filter(n => n.id !== id));
  };

  if (visible.length === 0) return null;

  return (
    <div className="mb-5 flex flex-col gap-2">
      {visible.map((notif, idx) => {
        const styles = TYPE_STYLES[notif.type] || TYPE_STYLES.reminder;
        return (
          <div
            key={notif.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${styles.bg} ${styles.border}`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {styles.icon}
            <p className={`flex-1 text-sm font-semibold leading-snug ${styles.text}`}>
              {notif.message}
            </p>
            <button
              onClick={() => dismiss(notif.id)}
              className={`mt-0.5 rounded-full p-1 transition-colors ${styles.close}`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
