import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Camera,
  Keyboard,
  AlertCircle,
  X,
  Bug,
  Home,
  Calendar,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { fumigationApi, FumigationCycle } from '../lib/fumigationApi';

type ScanType = 'station' | 'room';

export default function FumigationQRScanner() {
  const navigate = useNavigate();
  const [scanType, setScanType] = useState<ScanType>('station');
  const [manualEntry, setManualEntry] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [loadingCycles, setLoadingCycles] = useState(false);
  const [showCycleSelector, setShowCycleSelector] = useState(false);
  const [pendingRoomNumber, setPendingRoomNumber] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (scanType === 'room') {
      loadCycles();
    }
  }, [scanType]);

  const loadCycles = async () => {
    setLoadingCycles(true);
    try {
      const data = await fumigationApi.getCycles({ status: 'ABIERTO' });
      setCycles(data);
      if (data.length === 1) {
        setSelectedCycleId(data[0].id);
      } else if (data.length > 0) {
        setSelectedCycleId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading cycles:', err);
    } finally {
      setLoadingCycles(false);
    }
  };

  const startScanning = async () => {
    if (scanType === 'room' && !selectedCycleId) {
      setError('Selecciona un ciclo de fumigacion primero');
      return;
    }

    setError('');
    setScanning(true);

    try {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error('No se encontro ninguna camara');
      }

      const selectedDeviceId = videoInputDevices[0].deviceId;

      codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result, err) => {
          if (result) {
            const text = result.getText();
            handleScannedCode(text);
          }
          if (err && !(err.name === 'NotFoundException')) {
            console.error('QR Scan error:', err);
          }
        }
      );
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setError(err.message || 'Error al iniciar la camara. Verifica los permisos.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setScanning(false);
  };

  const handleScannedCode = (qrText: string) => {
    stopScanning();

    if (scanType === 'station') {
      const stationCode = qrText.trim();
      navigate(`/fumigacion/estacion/${encodeURIComponent(stationCode)}`);
    } else {
      const roomNumber = extractRoomNumber(qrText);
      if (roomNumber) {
        if (selectedCycleId) {
          navigateToRoomForm(roomNumber);
        } else {
          setPendingRoomNumber(roomNumber);
          setShowCycleSelector(true);
        }
      } else {
        setError('No se pudo leer el numero de habitacion del codigo QR');
      }
    }
  };

  const extractRoomNumber = (qrText: string): string | null => {
    const match = qrText.match(/\d{3,4}/);
    return match ? match[0] : null;
  };

  const navigateToRoomForm = (roomNumber: string) => {
    if (!selectedCycleId) {
      setError('Selecciona un ciclo de fumigacion');
      return;
    }
    navigate(`/fumigacion/habitacion/${selectedCycleId}/${roomNumber}`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEntry) {
      if (scanType === 'station') {
        navigate(`/fumigacion/estacion/${encodeURIComponent(manualEntry.trim())}`);
      } else {
        if (!selectedCycleId) {
          setError('Selecciona un ciclo de fumigacion');
          return;
        }
        navigateToRoomForm(manualEntry.trim());
      }
    }
  };

  const handleCycleSelect = (cycleId: number) => {
    setSelectedCycleId(cycleId);
    setShowCycleSelector(false);
    if (pendingRoomNumber) {
      navigate(`/fumigacion/habitacion/${cycleId}/${pendingRoomNumber}`);
      setPendingRoomNumber(null);
    }
  };

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <QrCode className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center">
              Escanear Codigo QR
            </h1>
            <p className="text-emerald-100 text-center mt-2">
              Control de Fumigacion y Plagas
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Que deseas escanear?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setScanType('station');
                    setError('');
                    setManualEntry('');
                    setShowManual(false);
                    stopScanning();
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scanType === 'station'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Bug className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">Estacion</p>
                  <p className="text-xs mt-1">Cebaderas, UV</p>
                </button>
                <button
                  onClick={() => {
                    setScanType('room');
                    setError('');
                    setManualEntry('');
                    setShowManual(false);
                    stopScanning();
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scanType === 'room'
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Home className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">Habitacion</p>
                  <p className="text-xs mt-1">Fumigacion mensual</p>
                </button>
              </div>
            </div>

            {scanType === 'room' && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-teal-800 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Ciclo de Fumigacion
                </label>
                {loadingCycles ? (
                  <div className="flex items-center gap-2 text-teal-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Cargando ciclos...</span>
                  </div>
                ) : cycles.length === 0 ? (
                  <div className="text-amber-700 text-sm bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    No hay ciclos abiertos. Crea uno desde el panel de administracion.
                  </div>
                ) : (
                  <select
                    value={selectedCycleId || ''}
                    onChange={(e) => setSelectedCycleId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  >
                    {cycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.label} ({cycle.completed_rooms}/{cycle.total_rooms} completadas)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
              </div>
            )}

            {!scanning ? (
              <>
                <div className="border-4 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Camera className="w-20 h-20 text-slate-400" />
                    <p className="text-sm text-slate-600 text-center max-w-md">
                      Presiona el boton para activar la camara y escanear el codigo QR
                    </p>
                    <button
                      onClick={startScanning}
                      disabled={scanType === 'room' && (!selectedCycleId || cycles.length === 0)}
                      className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Activar Camara
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500">o</span>
                  </div>
                </div>

                {!showManual ? (
                  <button
                    onClick={() => setShowManual(true)}
                    disabled={scanType === 'room' && (!selectedCycleId || cycles.length === 0)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Keyboard className="w-5 h-5" />
                    Ingresar codigo manualmente
                  </button>
                ) : (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {scanType === 'station' ? 'Codigo de Estacion' : 'Numero de Habitacion'}
                      </label>
                      <input
                        type="text"
                        value={manualEntry}
                        onChange={(e) => setManualEntry(e.target.value)}
                        placeholder={scanType === 'station' ? 'Ej: EST-UV-001' : 'Ej: 1401'}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg text-center font-bold"
                        autoFocus
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowManual(false);
                          setManualEntry('');
                          setError('');
                        }}
                        className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-xl transition-all font-medium"
                      >
                        Continuar
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    className="w-full aspect-video object-cover"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute inset-0 border-4 border-emerald-500 rounded-xl pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-64 border-4 border-white/50 rounded-lg"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-emerald-900">
                    Coloca el codigo QR dentro del recuadro
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    La camara detectara automaticamente el codigo
                  </p>
                </div>

                <button
                  onClick={stopScanning}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <X className="w-5 h-5" />
                  Detener Escaneo
                </button>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-2 text-sm">
                Instrucciones:
              </h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>1. Selecciona si vas a escanear una estacion o habitacion</li>
                {scanType === 'room' && (
                  <li>2. Selecciona el ciclo de fumigacion activo</li>
                )}
                <li>{scanType === 'room' ? '3' : '2'}. Escanea el codigo QR o ingresa el codigo manualmente</li>
                <li>{scanType === 'room' ? '4' : '3'}. Completa el formulario de registro</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/fumigacion')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Panel
            </button>
          </div>
        </div>
      </div>

      {showCycleSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-teal-50">
              <h3 className="font-bold text-teal-800 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Seleccionar Ciclo
              </h3>
              <p className="text-sm text-teal-600 mt-1">
                Habitacion: {pendingRoomNumber}
              </p>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  onClick={() => handleCycleSelect(cycle.id)}
                  className="w-full p-4 text-left rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{cycle.label}</p>
                      <p className="text-sm text-gray-500">
                        {cycle.completed_rooms}/{cycle.total_rooms} completadas
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCycleSelector(false);
                  setPendingRoomNumber(null);
                }}
                className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
