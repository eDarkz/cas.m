import { useState, useEffect, useCallback } from 'react';

interface GPS {
  lat: number;
  lng: number;
}

export function useGPS() {
  const [gps, setGps] = useState<GPS | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS no disponible en este dispositivo');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        console.error('Error getting GPS:', err);
        setError('No se pudo obtener la ubicación');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { gps, loading, error, requestLocation };
}
