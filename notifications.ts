export const requestBrowserNotifications = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const showLocalNotification = (title: string, options: NotificationOptions) => {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  new Notification(title, options);
};
