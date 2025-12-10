import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionsApi, InspectionCycle } from '../lib/inspections-api';
import { QrCode, Camera, Keyboard, AlertCircle, X } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function QRScanner() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<InspectionCycle[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [manualEntry, setManualEntry] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      stopScanning();
    };
  }, []);

  const loadData = async () => {
    try {
      const [cyclesData, roomsData] = await Promise.all([
        inspectionsApi.getCycles(),
        inspectionsApi.getRooms(),
      ]);
      setCycles(cyclesData);
      setRooms(roomsData);
      if (cyclesData.length > 0) {
        setSelectedCycleId(cyclesData[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error al cargar los datos');
    }
  };

  const startScanning = async () => {
    if (!selectedCycleId) {
      setError('Por favor selecciona un ciclo primero');
      return;
    }

    setError('');
    setScanning(true);

    try {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error('No se encontró ninguna cámara');
      }

      const selectedDeviceId = videoInputDevices[0].deviceId;

      codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            const text = result.getText();
            const roomNumber = extractRoomNumber(text);

            if (roomNumber) {
              const room = rooms.find(r => r.numero === roomNumber);
              if (room) {
                stopScanning();
                navigate(`/inspeccion/${selectedCycleId}/${room.id}`);
              } else {
                setError(`Habitación ${roomNumber} no encontrada`);
              }
            }
          }
          if (error && !(error.name === 'NotFoundException')) {
            console.error('QR Scan error:', error);
          }
        }
      );
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setError(err.message || 'Error al iniciar la cámara. Verifica los permisos.');
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

  const extractRoomNumber = (qrText: string): number | null => {
    const match = qrText.match(/\d{3,4}/);
    return match ? parseInt(match[0], 10) : null;
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEntry && selectedCycleId) {
      const roomNumber = parseInt(manualEntry, 10);
      const room = rooms.find(r => r.numero === roomNumber);
      if (room) {
        navigate(`/inspeccion/${selectedCycleId}/${room.id}`);
      } else {
        setError(`Habitación ${roomNumber} no encontrada`);
      }
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[month - 1];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <QrCode className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center">
              Escanear Habitación
            </h1>
            <p className="text-blue-100 text-center mt-2">
              Programa de Inspección 32 Puntos
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Ciclo de Inspección
              </label>
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium"
              >
                {cycles.length === 0 && (
                  <option value="">No hay ciclos disponibles</option>
                )}
                {cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.nombre} ({getMonthName(cycle.month)} {cycle.year})
                  </option>
                ))}
              </select>
            </div>

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
                      Presiona el botón para activar la cámara y escanear el código QR de la puerta
                    </p>
                    <button
                      onClick={startScanning}
                      disabled={!selectedCycleId}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Activar Cámara
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
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    <Keyboard className="w-5 h-5" />
                    Ingresar número manualmente
                  </button>
                ) : (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Número de Habitación
                      </label>
                      <input
                        type="number"
                        value={manualEntry}
                        onChange={(e) => setManualEntry(e.target.value)}
                        placeholder="Ej: 1401"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-center font-bold"
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
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-medium"
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
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-xl pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-64 border-4 border-white/50 rounded-lg"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-blue-900">
                    Coloca el código QR dentro del recuadro
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    La cámara detectará automáticamente el código
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm">
                Instrucciones:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>1. Selecciona el ciclo de inspección</li>
                <li>2. Escanea el código QR de la puerta o ingresa el número</li>
                <li>3. Completa el checklist de 32 puntos</li>
                <li>4. Guarda la inspección al finalizar</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
