// public/firebase-messaging-sw.js
// This file MUST be at the root of your public folder so Firebase can register it.
// It handles push notifications when the app is in the background or closed.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// ⚠️  These values are intentionally hardcoded in the service worker
// because service workers cannot access Vite env variables.
// Replace these with your actual Firebase project values.
firebase.initializeApp({
  apiKey:            'YOUR_FIREBASE_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message received:', payload)

  const title = payload.notification?.title || payload.data?.title || 'SchoolConnect'
  const body  = payload.notification?.body  || payload.data?.body  || ''
  const icon  = '/icon-192.png'

  const notificationOptions = {
    body,
    icon,
    badge: '/icon-72.png',
    tag: payload.data?.type || 'general',        // tag groups same-type notifications
    data: payload.data,
    actions: payload.data?.type === 'chat'
      ? [{ action: 'reply', title: 'Reply' }]
      : [],
  }

  self.registration.showNotification(title, notificationOptions)
})

// Handle notification click — open the app to the right page
self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const data = event.notification.data || {}
  let url = '/'

  if (data.type === 'daily_report') url = '/parent'
  else if (data.type === 'absence_alert') url = '/parent/attendance'
  else if (data.type === 'chat') url = '/parent/chat'
  else if (data.type === 'marks') url = '/parent/marks'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
