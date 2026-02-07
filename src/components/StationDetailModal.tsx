import { useState, useEffect, useMemo } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Edit3,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Image,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import HamsterLoader from './HamsterLoader';
import StationPhotoModal from './StationPhotoModal';
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

const CONDITION_LABELS: Record<PhysicalCondition, string> = {
  BUENA: 'Buena',
  REGULAR: 'Regular',
  MALA: 'Mala',
};

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i + 1);

export default function StationDetailModal({
  station,
  onClose,
  onEdit,
  onNewInspection,
}: Props) {
  const [inspections, setInspections] = useState<StationInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number | ''>(currentYear);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const params: { limit: number; from?: string; to?: string } = { limit: 500 };
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

  const stats = useMemo(() => {
    const total = inspections.length;
    const withBait = inspections.filter((i) => i.has_bait).length;
    const baitReplaced = inspections.filter((i) => i.bait_replaced).length;
    const displaced = inspections.filter((i) => !i.location_ok).length;
    const bad = inspections.filter((i) => i.physical_condition === 'MALA').length;
    const withPhoto = inspections.filter((i) => i.photo_url).length;

    let avgDaysBetween = 0;
    if (inspections.length > 1) {
      const sorted = [...inspections].sort(
        (a, b) => new Date(a.inspected_at).getTime() - new Date(b.inspected_at).getTime(),
      );
      const totalDays =
        (new Date(sorted[sorted.length - 1].inspected_at).getTime() -
          new Date(sorted[0].inspected_at).getTime()) /
        (1000 * 60 * 60 * 24);
      avgDaysBetween = Math.round(totalDays / (inspections.length - 1));
    }

    const lastInsp = inspections.length > 0
      ? inspections.reduce((best, cur) =>
          new Date(cur.inspected_at) > new Date(best.inspected_at) ? cur : best,
        )
      : null;

    const daysSinceLast = lastInsp
      ? Math.round((Date.now() - new Date(lastInsp.inspected_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return { total, withBait, baitReplaced, displaced, bad, withPhoto, avgDaysBetween, daysSinceLast };
  }, [inspections]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${TYPE_COLORS[station.type]}`}>
              <span className="text-xl font-bold">{station.code.slice(0, 2)}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{station.name}</h2>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <span className="font-mono">{station.code}</span>
                <span className="text-stone-300">|</span>
                <span>{TYPE_LABELS[station.type]}</span>
                <span className="text-stone-300">|</span>
                {station.is_active ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activa
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-stone-400">
                    <XCircle className="w-3.5 h-3.5" /> Inactiva
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Instalada</div>
                <div className="font-medium text-stone-800 text-sm mt-1">
                  {station.installed_at ? formatDate(station.installed_at) : 'No registrada'}
                </div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Inspecciones</div>
                <div className="font-medium text-stone-800 text-sm mt-1">{stats.total} registradas</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Ultima inspeccion</div>
                <div className={`font-medium text-sm mt-1 ${
                  stats.daysSinceLast === null ? 'text-stone-400' :
                  stats.daysSinceLast > 30 ? 'text-red-600' :
                  stats.daysSinceLast > 15 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {stats.daysSinceLast !== null ? `Hace ${stats.daysSinceLast} dias` : 'Nunca'}
                </div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Frecuencia</div>
                <div className="font-medium text-stone-800 text-sm mt-1">
                  {stats.avgDaysBetween > 0 ? `~${stats.avgDaysBetween} dias` : '-'}
                </div>
              </div>
            </div>

            {stats.total > 0 && (
              <div className="flex flex-wrap gap-2">
                {stats.withBait > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.withBait} con consumo ({Math.round((stats.withBait / stats.total) * 100)}%)
                  </span>
                )}
                {stats.baitReplaced > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <RefreshCw className="w-3 h-3" />
                    {stats.baitReplaced} cebo repuesto
                  </span>
                )}
                {stats.displaced > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    <MapPin className="w-3 h-3" />
                    {stats.displaced} desplazada(s)
                  </span>
                )}
                {stats.bad > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    <XCircle className="w-3 h-3" />
                    {stats.bad} en mala condicion
                  </span>
                )}
                {stats.withPhoto > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                    <Image className="w-3 h-3" />
                    {stats.withPhoto} con foto
                  </span>
                )}
              </div>
            )}

            {(station.utm_x || station.utm_y) && (
              <a
                href={`https://maps.google.com/?q=${station.utm_y},${station.utm_x}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-800 bg-sky-50 rounded-lg p-3 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>Ver ubicacion en Google Maps</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="flex gap-2">
              <button
                onClick={onNewInspection}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
              >
                <ClipboardCheck className="w-4 h-4" />
                Nueva Inspeccion
              </button>
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors font-medium text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-stone-900">
                  Historial de Inspecciones
                  <span className="text-sm font-normal text-stone-500 ml-2">({inspections.length})</span>
                </h3>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
                >
                  <option value="">Todos los anos</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <HamsterLoader size="small" />
                </div>
              ) : inspections.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                  <p className="text-sm">No hay inspecciones {filterYear ? `en ${filterYear}` : 'registradas'}</p>
                  <p className="text-xs mt-1">Seleccione otro ano o realice una inspeccion</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inspections.map((insp) => {
                    const isExpanded = expandedId === insp.id;
                    const condColor = CONDITION_COLORS[insp.physical_condition];

                    return (
                      <div key={insp.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : insp.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                            isExpanded ? 'bg-sky-50 border border-sky-200' : 'bg-stone-50 hover:bg-stone-100 border border-transparent'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${condColor}`}>
                            <ClipboardCheck className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-stone-900 text-sm">
                                {insp.inspector_nombre || 'Sin inspector'}
                              </span>
                              {insp.inspector_empresa && (
                                <span className="text-xs text-stone-500">({insp.inspector_empresa})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {formatDateTime(insp.inspected_at)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${condColor}`}>
                              {CONDITION_LABELS[insp.physical_condition]}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 justify-end">
                              {insp.has_bait ? (
                                <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full font-medium">Consumo</span>
                              ) : null}
                              {insp.bait_replaced ? (
                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">Repuesto</span>
                              ) : null}
                              {!insp.location_ok ? (
                                <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full font-medium">Desplazada</span>
                              ) : null}
                              {insp.photo_url && <Image className="w-3 h-3 text-sky-500" />}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="ml-4 mr-2 mt-1 mb-2 p-3 bg-white border border-stone-200 rounded-lg space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-stone-400 uppercase tracking-wider font-medium">Consumo cebo</span>
                                <div className={`mt-0.5 font-semibold ${insp.has_bait ? 'text-orange-700' : 'text-emerald-700'}`}>
                                  {insp.has_bait ? 'Si - Se detecto consumo' : 'No - Sin consumo'}
                                </div>
                              </div>
                              <div>
                                <span className="text-stone-400 uppercase tracking-wider font-medium">Cebo repuesto</span>
                                <div className={`mt-0.5 font-semibold ${insp.bait_replaced ? 'text-amber-700' : 'text-stone-600'}`}>
                                  {insp.bait_replaced ? 'Si - Se repuso cebo' : 'No'}
                                </div>
                              </div>
                              <div>
                                <span className="text-stone-400 uppercase tracking-wider font-medium">Posicion</span>
                                <div className={`mt-0.5 font-semibold ${insp.location_ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {insp.location_ok ? 'Correcta' : 'Desplazada'}
                                </div>
                              </div>
                            </div>
                            {insp.observations && (
                              <div>
                                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">Observaciones</span>
                                <p className="text-xs text-stone-700 mt-0.5 bg-stone-50 rounded p-2">{insp.observations}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              {insp.lat && insp.lng && (
                                <a
                                  href={`https://maps.google.com/?q=${insp.lat},${insp.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800"
                                >
                                  <MapPin className="w-3 h-3" />
                                  GPS: {Number(insp.lat).toFixed(5)}, {Number(insp.lng).toFixed(5)}
                                </a>
                              )}
                              {insp.photo_url && (
                                <button
                                  onClick={() => {
                                    setSelectedPhotoUrl(insp.photo_url!);
                                    setPhotoModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800"
                                >
                                  <Image className="w-3 h-3" />
                                  Ver foto
                                </button>
                              )}
                            </div>
                            {insp.photo_url && (
                              <button
                                onClick={() => {
                                  setSelectedPhotoUrl(insp.photo_url!);
                                  setPhotoModalOpen(true);
                                }}
                                className="block"
                              >
                                <img
                                  src={insp.photo_url}
                                  alt="Foto de inspeccion"
                                  className="w-20 h-20 object-cover rounded-lg border border-stone-200 hover:opacity-80 transition-opacity"
                                />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>

      {photoModalOpen && selectedPhotoUrl && (
        <StationPhotoModal
          photoUrl={selectedPhotoUrl}
          stationName={station.name}
          onClose={() => {
            setPhotoModalOpen(false);
            setSelectedPhotoUrl('');
          }}
        />
      )}
    </div>
  );
}
