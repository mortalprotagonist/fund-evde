import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = '40bae2cd-a63a-4949-baed-dd7e30f18a6b';

let initialized = false;

export const initOneSignal = async () => {
  if (initialized) return;
  initialized = true;

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true, // Enables testing on localhost
      notifyButton: {
        enable: false, // We use our own custom UI prompt
      },
      promptOptions: {
        slidedown: {
          enabled: false, // We control the prompt manually
        },
      },
    });

    console.log('[OneSignal] Initialized successfully');
  } catch (err) {
    console.error('[OneSignal] Init failed:', err);
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
