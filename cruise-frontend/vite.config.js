import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const DAY = 24 * 60 * 60

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // אפליקציה שמתקינים במסך הבית ועובדת גם בלי אינטרנט (על הספינה האינטרנט בתשלום).
    // קבצי האתר נשמרים מראש; נתונים מהשרת, תמונות ושערי מטבע נשמרים בפעם הראשונה שנטענים
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Odyssey of the Seas · אוגוסט 2027',
        short_name: 'האודיסי',
        description: 'לו״ז, מדריכי יעדים ופרטי החדרים להפלגה המשפחתית',
        lang: 'he',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#021d49',
        background_color: '#021d49',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // נתונים מהשרת (לו״ז, חדר, צ׳ק ליסטים): קודם מהרשת, ואם אין חיבור - העותק האחרון.
            // רק GET נשמר; שמירת שינויים עדיין דורשת חיבור
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // תמונות מ-Wikimedia (נטענות ב-CORS, ראו Gallery.jsx)
            urlPattern: ({ url }) => url.hostname.endsWith('wikimedia.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos',
              expiration: { maxEntries: 150, maxAgeSeconds: 90 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // שערי מטבע (CurrencyRates.jsx): התאריך מוצג ליד השער, כך שעותק ישן מזוהה
            urlPattern: ({ url }) => url.hostname === 'api.frankfurter.dev',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rates',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
