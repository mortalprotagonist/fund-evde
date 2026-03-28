import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = '40bae2cd-a63a-4949-baed-dd7e30f18a6b';

let initialized = false;

export const initOneSignal = async () => {
  if (initialized) return;
  initialized = true;

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: false },
      promptOptions: { slidedown: { enabled: false } },
    });
    console.log('[OneSignal] Initialized');
  } catch (err) {
    console.error('[OneSignal] Init failed:', err);
  }
};

// Call this AFTER init to register the push subscription
export const registerPush = async () => {
  try {
    // In v3 react-onesignal, requestPermission handles both permission + subscription
    await OneSignal.Notifications.requestPermission();
    // Confirm opt-in
    await OneSignal.User.PushSubscription.optIn();
    console.log('[OneSignal] Subscribed:', OneSignal.User.PushSubscription.optedIn);
  } catch (err) {
    console.warn('[OneSignal] Push registration failed:', err);
  }
};

export const requestNotificationPermission = async () => {
  try {
    // OneSignal v16 correct API
    const permission = await OneSignal.Notifications.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[OneSignal] Permission request failed:', err);
    return false;
  }
};

export const isSubscribed = async () => {
  try {
    return await OneSignal.User.PushSubscription.optedIn;
  } catch {
    return false;
  }
};

export { OneSignal };
