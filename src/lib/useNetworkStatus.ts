import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificación adicional mediante ping a Supabase
    const checkConnection = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }

      setIsChecking(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch('https://www.google.com/favicon.ico', {
          mode: 'no-cors',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      } finally {
        setIsChecking(false);
      }
    };

    // Verificar conexión cada 30 segundos
    const interval = setInterval(checkConnection, 10000);
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isChecking };
}
