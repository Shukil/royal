import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// האתר עובד גם בלי אינטרנט (vite.config.js). כשעולה גרסה חדשה הדף מתרענן לבד,
// ובודקים עדכונים גם כשחוזרים לאתר (מעבר בין אפליקציות או לשוניות), לא רק בטעינה הראשונה
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) registration.update().catch(() => {})
    })
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
