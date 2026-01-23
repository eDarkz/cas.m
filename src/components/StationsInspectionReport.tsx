import { X, FileText, Printer, Calendar } from 'lucide-react';
import { BaitStation, StationType } from '../lib/fumigationApi';

interface StationsInspectionReportProps {
  stations: BaitStation[];
  onClose: () => void;
}

const TYPE_LABELS: Record<StationType, string> = {
  ROEDOR: 'Cebadera',
  UV: 'Trampa UV',
  OTRO: 'Otro',
};

export default function StationsInspectionReport({
  stations,
  onClose,
}: StationsInspectionReportProps) {
  const activeStations = stations.filter(s => s.is_active);

  const stationsWithDays = activeStations.map((station) => {
    const lastInsp = station.lastInspection;
    const daysSinceInspection = lastInsp
      ? Math.floor((Date.now() - new Date(lastInsp.inspected_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...station,
      daysSinceInspection,
      lastInspectionDate: lastInsp?.inspected_at || null,
    };
  }).sort((a, b) => {
    if (a.daysSinceInspection === null) return 1;
    if (b.daysSinceInspection === null) return -1;
    return b.daysSinceInspection - a.daysSinceInspection;
  });

  const cebaderas = stationsWithDays.filter(s => s.type === 'ROEDOR');
  const lucesUV = stationsWithDays.filter(s => s.type === 'UV');

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-sky-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Reporte de Estaciones</h2>
              <p className="text-sm text-gray-600">Días desde última inspección</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 print:p-0">
          <div className="print:p-8">
            <div className="text-center mb-6 print:mb-8">
              <h1 className="text-2xl font-bold text-gray-900 print:text-3xl">
                Reporte de Control de Plagas
              </h1>
              <p className="text-gray-600 mt-1">Estaciones de Cebaderas y Luces UV</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-2">
                <Calendar className="w-4 h-4" />
                <span>Fecha de reporte: {today}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 print:mb-8">
              <div className="bg-sky-50 rounded-lg p-4 text-center border border-sky-200">
                <div className="text-3xl font-bold text-sky-700">{activeStations.length}</div>
                <div className="text-sm text-gray-600 mt-1">Total Estaciones Activas</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                <div className="text-3xl font-bold text-orange-700">{cebaderas.length}</div>
                <div className="text-sm text-gray-600 mt-1">Cebaderas</div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-200">
                <div className="text-3xl font-bold text-indigo-700">{lucesUV.length}</div>
                <div className="text-sm text-gray-600 mt-1">Trampas UV</div>
              </div>
            </div>

            {cebaderas.length > 0 && (
              <div className="mb-8 print:break-inside-avoid">
                <div className="bg-orange-100 border-l-4 border-orange-600 p-3 mb-3">
                  <h3 className="text-lg font-bold text-orange-900">
                    Cebaderas ({cebaderas.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">No.</th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Código</th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Ubicación</th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Última Inspección</th>
                        <th className="px-4 py-2 text-center text-sm font-bold text-gray-700">Días</th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cebaderas.map((station, index) => {
                        const needsAttention = station.daysSinceInspection === null || station.daysSinceInspection > 30;
                        const isCritical = station.daysSinceInspection && station.daysSinceInspection > 45;

                        return (
                          <tr
                            key={station.id}
                            className={`border-b border-gray-200 ${
                              isCritical
                                ? 'bg-red-50'
                                : needsAttention
                                ? 'bg-amber-50'
                                : ''
                            }`}
                          >
                            <td className="px-4 py-2 text-sm text-gray-700">{index + 1}</td>
                            <td className="px-4 py-2 text-sm font-mono font-bold text-gray-900">
                              {station.code}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700">{station.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {station.lastInspectionDate
                                ? new Date(station.lastInspectionDate).toLocaleDateString('es-MX', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Sin inspecciones'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {station.daysSinceInspection !== null ? (
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                                    isCritical
                                      ? 'bg-red-600 text-white'
                                      : needsAttention
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-green-600 text-white'
                                  }`}
                                >
                                  {station.daysSinceInspection}
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-gray-600 text-white">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {isCritical ? (
                                <span className="text-red-700 font-bold">⚠️ Crítico</span>
                              ) : needsAttention ? (
                                <span className="text-amber-700 font-medium">⚠ Atención</span>
                              ) : (
                                <span className="text-green-700">✓ OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {lucesUV.length > 0 && (
              <div className="mb-8 print:break-inside-avoid">
                <div className="bg-indigo-100 border-l-4 border-indigo-600 p-3 mb-3">
                  <h3 className="text-lg font-bold text-indigo-900">
                    Trampas UV ({lucesUV.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">No.</th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Código</th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Ubicación</th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Última Inspección</th>
                        <th className="px-4 py-2 text-center text-sm font-bold text-gray-700">Días</th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lucesUV.map((station, index) => {
                        const needsAttention = station.daysSinceInspection === null || station.daysSinceInspection > 30;
                        const isCritical = station.daysSinceInspection && station.daysSinceInspection > 45;

                        return (
                          <tr
                            key={station.id}
                            className={`border-b border-gray-200 ${
                              isCritical
                                ? 'bg-red-50'
                                : needsAttention
                                ? 'bg-amber-50'
                                : ''
                            }`}
                          >
                            <td className="px-4 py-2 text-sm text-gray-700">{index + 1}</td>
                            <td className="px-4 py-2 text-sm font-mono font-bold text-gray-900">
                              {station.code}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700">{station.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {station.lastInspectionDate
                                ? new Date(station.lastInspectionDate).toLocaleDateString('es-MX', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Sin inspecciones'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {station.daysSinceInspection !== null ? (
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                                    isCritical
                                      ? 'bg-red-600 text-white'
                                      : needsAttention
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-green-600 text-white'
                                  }`}
                                >
                                  {station.daysSinceInspection}
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-gray-600 text-white">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {isCritical ? (
                                <span className="text-red-700 font-bold">⚠️ Crítico</span>
                              ) : needsAttention ? (
                                <span className="text-amber-700 font-medium">⚠ Atención</span>
                              ) : (
                                <span className="text-green-700">✓ OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-gray-300 print:mt-12">
              <div className="flex items-start gap-4 text-xs text-gray-600">
                <div className="flex-1">
                  <p className="font-bold mb-2">Leyenda de Estados:</p>
                  <ul className="space-y-1">
                    <li>✓ OK: Inspección realizada en los últimos 30 días</li>
                    <li>⚠ Atención: Inspección con más de 30 días</li>
                    <li>⚠️ Crítico: Inspección con más de 45 días o sin inspecciones</li>
                  </ul>
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold">Control de Plagas</p>
                  <p>Sistema de Gestión de Estaciones</p>
                  <p className="mt-2 text-gray-500">Generado el {today}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-8,
          .print\\:p-8 * {
            visibility: visible;
          }
          .print\\:p-8 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
