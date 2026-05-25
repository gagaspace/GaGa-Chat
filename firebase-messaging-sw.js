importScripts('https://www.gstatic.com/firebasejs/10.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.16.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD0RZ-w6Z0eIjmIxsSDCz8R_SXOebmAThY',
  authDomain: 'gaga-chats.firebaseapp.com',
  projectId: 'gaga-chats',
  storageBucket: 'gaga-chats.appspot.com',
  messagingSenderId: '814397766265',
  appId: '1:814397766265:web:4caa9203d6025b1348f2a8',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || 'GaGa Chat';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/favicon.ico',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
