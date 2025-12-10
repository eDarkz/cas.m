import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, Keyboard, AlertCircle, X, Bug, Home } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

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

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
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
            handleScannedCode(text);
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

  const handleScannedCode = (qrText: string) => {
    stopScanning();

    if (scanType === 'station') {
      navigate(`/fumigacion/estacion/${qrText}`);
    } else {
      const roomNumber = extractRoomNumber(qrText);
      if (roomNumber) {
        navigate(`/fumigacion/habitacion/${roomNumber}`);
      } else {
        setError('No se pudo leer el número de habitación del código QR');
      }
    }
  };

  const extractRoomNumber = (qrText: string): string | null => {
    const match = qrText.match(/\d{3,4}/);
    return match ? match[0] : null;
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEntry) {
      if (scanType === 'station') {
        navigate(`/fumigacion/estacion/${manualEntry}`);
      } else {
        navigate(`/fumigacion/habitacion/${manualEntry}`);
      }
    }
  };

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
              Escanear Código QR
            </h1>
            <p className="text-emerald-100 text-center mt-2">
              Control de Fumigación y Plagas
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ¿Qué deseas escanear?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setScanType('station');
                    setError('');
                    setManualEntry('');
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scanType === 'station'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Bug className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">Estación</p>
                  <p className="text-xs mt-1">UV, Ratones, etc.</p>
                </button>
                <button
                  onClick={() => {
                    setScanType('room');
                    setError('');
                    setManualEntry('');
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scanType === 'room'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Home className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">Habitación</p>
                  <p className="text-xs mt-1">Fumigación</p>
                </button>
              </div>
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
                      Presiona el botón para activar la cámara y escanear el código QR
                    </p>
                    <button
                      onClick={startScanning}
                      className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-xl transition-all font-bold text-lg"
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
                    Ingresar código manualmente
                  </button>
                ) : (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {scanType === 'station' ? 'Código de Estación' : 'Número de Habitación'}
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
                    Coloca el código QR dentro del recuadro
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
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

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="font-semibold text-emerald-900 mb-2 text-sm">
                Instrucciones:
              </h3>
              <ul className="text-sm text-emerald-800 space-y-1">
                <li>1. Selecciona si vas a escanear una estación o habitación</li>
                <li>2. Escanea el código QR o ingresa el código manualmente</li>
                <li>3. Completa el formulario de registro</li>
                <li>4. Guarda el registro al finalizar</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/fumigacion')}
              className="w-full px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
