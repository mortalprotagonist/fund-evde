import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { requestNotificationPermission, isSubscribed } from '../lib/oneSignal';

const PROMPT_DISMISSED_KEY = 'fundEvde_notifPromptDismissed';

export const NotificationPrompt = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissed) return;

    // Check if already subscribed
    const check = async () => {
      const subscribed = await isSubscribed();
      if (!subscribed) {
        // Delay slightly so it doesn't fire immediately on page load
        setTimeout(() => setShow(true), 3000);
      }
    };
    check();
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      // Step 1: Native browser permission (never hangs, instant dialog)
      const permission = await window.Notification.requestPermission();

      if (permission === 'granted') {
        // Step 2: Init OneSignal (lazy, only now)
        const { initOneSignal, registerPush } = await import('../lib/oneSignal.js');
        await initOneSignal();
        // Step 3: Register push subscription with OneSignal servers
        await registerPush();
        setGranted(true);
        setTimeout(() => setShow(false), 2000);
      } else {
        handleDismiss();
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mb-5 animate-in fade-in slide-in-from-top-3 duration-500">
      <div className="relative rounded-2xl border border-indigo-200 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 p-4 shadow-sm overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
            <Bell size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="flex-1 min-w-0">
            {granted ? (
              <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                ✅ Notifications enabled! We'll remind you to log expenses daily.
              </p>
            ) : (
              <>
                <p className="font-bold text-indigo-900 dark:text-indigo-100 text-sm leading-snug">
                  Never forget to log your expenses 🔔
                </p>
                <p className="mt-0.5 text-xs text-indigo-600/80 dark:text-indigo-400/80 font-medium">
                  Get a daily reminder — even when the app is closed.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleEnable}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70"
                  >
                    <Bell size={13} />
                    {loading ? 'Enabling...' : 'Enable Notifications'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-3 py-2 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
                  >
                    <BellOff size={13} />
                    Not now
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
