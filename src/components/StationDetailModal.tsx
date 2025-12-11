import { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Edit3,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import {
  fumigationApi,
  BaitStation,
  StationInspection,
  StationType,
  PhysicalCondition,
} from '../lib/fumigationApi';

interface Props {
  station: BaitStation;
  onClose: () => void;
  onEdit: () => void;
  onNewInspection: () => void;
}

const TYPE_LABELS: Record<StationType, string> = {
  ROEDOR: 'Cebadera (Roedor)',
  UV: 'Trampa UV',
  OTRO: 'Otro',
};

const TYPE_COLORS: Record<StationType, string> = {
  ROEDOR: 'bg-amber-100 text-amber-800',
  UV: 'bg-blue-100 text-blue-800',
  OTRO: 'bg-gray-100 text-gray-800',
};

const CONDITION_COLORS: Record<PhysicalCondition, string> = {
  BUENA: 'text-green-600 bg-green-50',
  REGULAR: 'text-amber-600 bg-amber-50',
  MALA: 'text-red-600 bg-red-50',
};

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function StationDetailModal({
  station,
  onClose,
  onEdit,
  onNewInspection,
}: Props) {
  const [inspections, setInspections] = useState<StationInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number | ''>(currentYear);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const params: { limit: number; from?: string; to?: string } = { limit: 100 };
      if (filterYear !== '') {
        params.from = `${filterYear}-01-01`;
        params.to = `${filterYear}-12-31`;
      }
      const data = await fumigationApi.getStationInspections(station.id, params);
      setInspections(data);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [station.id, filterYear]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                TYPE_COLORS[station.type]
              }`}
            >
              <span className="text-xl font-bold">{station.code.slice(0, 2)}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{station.name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-mono">{station.code}</span>
                <span className="text-gray-300">|</span>
                <span>{TYPE_LABELS[station.type]}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Estado</div>
                <div className="flex items-center gap-1 mt-1">
                  {station.is_active ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-600">Activa</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-400">Inactiva</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Tipo</div>
                <div className="font-medium text-gray-900 mt-1">
                  {TYPE_LABELS[station.type]}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Instalada</div>
                <div className="font-medium text-gray-900 mt-1">
                  {station.installed_at
                    ? new Date(station.installed_at).toLocaleDateString('es-MX')
                    : 'Sin fecha'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Inspecciones {filterYear ? filterYear : ''}</div>
                <div className="font-medium text-gray-900 mt-1">
                  {inspections.length} registradas
                </div>
              </div>
            </div>

            {(station.utm_x || station.utm_y) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <MapPin className="w-4 h-4" />
                <span>
                  Coordenadas: {station.utm_x ? Number(station.utm_x).toFixed(6) : '-'}, {station.utm_y ? Number(station.utm_y).toFixed(6) : '-'}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onNewInspection}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                <ClipboardCheck className="w-5 h-5" />
                Nueva Inspeccion
              </button>
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <Edit3 className="w-5 h-5" />
                Editar
              </button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Historial de Inspecciones
                  <span className="text-sm font-normal text-gray-500 ml-2">({inspections.length})</span>
                </h3>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Todos</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : inspections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay inspecciones registradas
                </div>
              ) : (
                <div className="space-y-2">
                  {inspections.map((insp) => (
                    <div
                      key={insp.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          CONDITION_COLORS[insp.physical_condition]
                        }`}
                      >
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {insp.inspector_nombre || 'Sin inspector'}
                          </span>
                          {insp.inspector_empresa && (
                            <span className="text-sm text-gray-500">
                              ({insp.inspector_empresa})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(insp.inspected_at).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${
                            insp.physical_condition === 'BUENA'
                              ? 'text-green-600'
                              : insp.physical_condition === 'REGULAR'
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {insp.physical_condition}
                        </div>
                        <div className="text-xs text-gray-500">
                          {insp.has_bait ? 'Con cebo' : 'Sin cebo'}
                          {insp.bait_replaced ? ' (rep.)' : ''}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
