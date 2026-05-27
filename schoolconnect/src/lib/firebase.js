import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { saveFcmToken } from './supabase.js'

// ─── Firebase config ──────────────────────────────────────────────────────────
// Fill these from Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let app = null
let messaging = null

function getFirebaseApp() {
  if (!app && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
  }
  return { app, messaging }
}

// ─── Request permission + get FCM token ───────────────────────────────────────
export async function requestNotificationPermission(userId) {
  try {
    const { messaging } = getFirebaseApp()
    if (!messaging) {
      console.warn('Firebase not configured — skipping push notification setup')
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return null
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (token) {
      // Save token to Supabase profiles table so Edge Functions can use it
      await saveFcmToken(userId, token)
      console.log('FCM token saved:', token.slice(0, 20) + '...')
      return token
    }
    return null
  } catch (err) {
    console.error('FCM setup error:', err)
    return null
  }
}

// ─── Listen for foreground messages ───────────────────────────────────────────
export function onForegroundMessage(callback) {
  const { messaging } = getFirebaseApp()
  if (!messaging) return () => {}

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload)
    callback({
      title: payload.notification?.title || payload.data?.title,
      body:  payload.notification?.body  || payload.data?.body,
      data:  payload.data,
    })
  })
}

// ─── Show in-app toast notification ──────────────────────────────────────────
export function showInAppNotification(title, body) {
  // Dispatch a custom DOM event that the NotificationToast component listens to
  window.dispatchEvent(new CustomEvent('sc:notification', { detail: { title, body } }))
}
