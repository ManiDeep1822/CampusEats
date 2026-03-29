// Utility to convert VAPID public key to compatible format
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications not supported in this browser.');
  }

  try {
    // 1. Register or get existing service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    // 2. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission for notifications denied.');
    }

    // 3. Subscribe
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
    };

    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    return subscription;
  } catch (error) {
    console.error('Error during push notification subscription:', error);
    throw error;
  }
};
