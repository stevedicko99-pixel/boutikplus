export function registerServiceWorker(): () => void {
  if (!('serviceWorker' in navigator)) return () => undefined;

  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('[ServiceWorker] Enregistrement impossible :', error);
    });
  };

  if (document.readyState === 'complete') {
    register();
    return () => undefined;
  }

  window.addEventListener('load', register, { once: true });
  return () => window.removeEventListener('load', register);
}
