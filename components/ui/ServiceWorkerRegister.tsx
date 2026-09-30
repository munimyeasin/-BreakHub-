'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // In development mode, unregister any active service worker to prevent stale cached HTML/hydration mismatches
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      }).catch(() => {});
      return;
    }

    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // If there's an updated worker waiting, activate it immediately
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          // Check for periodic updates
          reg.update().catch(() => {});
        })
        .catch((_err) => {
          // Silent fallback for non-supported or restricted contexts
        });
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW, { once: true });
    }
  }, []);

  return null;
}
