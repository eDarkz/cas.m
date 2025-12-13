import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { useNetworkStatus } from '../lib/useNetworkStatus';

export function NetworkStatusIndicator() {
  const { isOnline, isChecking } = useNetworkStatus();

  if (isOnline && !isChecking) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
        <Wifi className="w-5 h-5" />
        <span className="font-medium text-sm">Conectado</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-pulse">
        <div className="flex items-center gap-2">
          <WifiOff className="w-6 h-6" />
          <div>
            <p className="font-bold text-sm">Sin conexión a Internet</p>
            <p className="text-xs opacity-90">Las inspecciones NO se guardarán</p>
          </div>
        </div>
        <AlertTriangle className="w-6 h-6" />
      </div>
    );
  }

  return null;
}
