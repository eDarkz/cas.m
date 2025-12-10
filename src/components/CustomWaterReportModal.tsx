import { useState, useMemo, useRef, useEffect } from 'react';
import {
  AquaticElement,
  ANALYSIS_PARAMS,
  AnalysisParamKey,
  AmenityLimit,
  api,
} from '../lib/api';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckSquare,
  ImageDown,
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface Props {
  elements: AquaticElement[];
  onClose: () => void;
}

// Helper para asegurar MAYÚSCULAS en todos los datos de la tabla
const toUpper = (v: unknown) =>
  v === null || v === undefined ? '' : v.toString().toUpperCase();

type Severity = 'danger' | 'warning' | null;

export default function CustomWaterReportModal({ elements, onClose }: Props) {
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [selectedParams, setSelectedParams] = useState<Set<AnalysisParamKey>>(
    new Set(['ph', 'cloro_libre', 'temperatura']),
  );
  const [searchElement, setSearchElement] = useState('');

  // Metadatos separados
  const [includeNombre, setIncludeNombre] = useState(true);
  const [includeUbicacion, setIncludeUbicacion] = useState(true);
  const [includeTipo, setIncludeTipo] = useState(true);
  const [includeFecha, setIncludeFecha] = useState(true);

  const [includeComments, setIncludeComments] = useState(true);
  const [dateFilter, setDateFilter] = useState<'all' | 'last30' | 'last7' | 'today'>(
    'all',
  );
  const [sortBy, setSortBy] = useState<'element' | 'date'>('element');

  // Límites por amenidad: amenity_type_id -> AmenityLimit[]
  const [amenityLimitsByType, setAmenityLimitsByType] = useState<
    Record<number, AmenityLimit[]>
  >({});
  const [limitsError, setLimitsError] = useState<string | null>(null);

  // Ref para la tabla visible (preview) y para la tabla completa (export)
  const previewTableRef = useRef<HTMLDivElement | null>(null);
  const exportTableRef = useRef<HTMLDivElement | null>(null);

  const elementsWithAnalysis = elements.filter((el) => el.last);

  const filteredElements = elementsWithAnalysis.filter(
    (el) =>
      el.nombre.toLowerCase().includes(searchElement.toLowerCase()) ||
      el.ubicacion?.toLowerCase().includes(searchElement.toLowerCase()) ||
      el.amenity_nombre?.toLowerCase().includes(searchElement.toLowerCase()),
  );

  // === Helper para clasificar por tipo de amenidad según texto (ALBERCAS / JACUZZIS / FUENTES) ===
  const isOfAmenityType = (el: AquaticElement, keywords: string[]): boolean => {
    const txt = `${el.amenity_nombre ?? ''} ${el.tipo ?? ''}`.toLowerCase();
    return keywords.some((k) => txt.includes(k));
  };

  const addByAmenityGroup = (keywords: string[]) => {
    const newSelected = new Set(selectedElements);
    elementsWithAnalysis.forEach((el) => {
      if (isOfAmenityType(el, keywords)) {
        newSelected.add(el.id);
      }
    });
    setSelectedElements(newSelected);
  };

  const selectAllPools = () => {
    // ALBERCAS / POOLS (se suman a lo ya seleccionado)
    addByAmenityGroup(['alberca', 'pool']);
  };

  const selectAllJacuzzis = () => {
    // JACUZZIS / SPA
    addByAmenityGroup(['jacuzzi', 'spa']);
  };

  const selectAllFountains = () => {
    // FUENTES / FOUNTAIN
    addByAmenityGroup(['fuente', 'fountain']);
  };

  // === Carga de límites por amenidad usando /v1/albercas/amenity-limits?amenity_type_id= ===
  useEffect(() => {
    const typeIds = Array.from(
      new Set(
        elementsWithAnalysis
          .map((el) => el.amenity_type_id)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id)),
      ),
    );

    if (!typeIds.length) return;

    let cancelled = false;
    setLimitsError(null);

    (async () => {
      try {
        const results = await Promise.all(
          typeIds.map(async (id) => {
            const limits = await api.getAmenityLimits({ amenity_type_id: id });
            return [id, limits] as const;
          }),
        );

        if (cancelled) return;

        setAmenityLimitsByType((prev) => {
          const next = { ...prev };
          for (const [id, limits] of results) {
            next[id] = limits;
          }
          return next;
        });
      } catch (err) {
        console.error('Error cargando límites de amenidades', err);
        if (!cancelled) {
          setLimitsError('No se pudieron cargar los límites de parámetros.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [elementsWithAnalysis]);

  const toggleElement = (id: string) => {
    const newSelected = new Set(selectedElements);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedElements(newSelected);
  };

  const toggleParam = (key: AnalysisParamKey) => {
    const newSelected = new Set(selectedParams);
    if (newSelected.has(key)) newSelected.delete(key);
    else newSelected.add(key);
    setSelectedParams(newSelected);
  };

  const selectAllElements = () => {
    setSelectedElements(new Set(filteredElements.map((el) => el.id)));
  };

  const clearAllElements = () => {
    setSelectedElements(new Set());
  };

  const selectAllParams = () => {
    setSelectedParams(new Set(ANALYSIS_PARAMS.map((p) => p.key)));
  };

  const clearAllParams = () => {
    setSelectedParams(new Set());
  };

  // === Helper: severidad de una celda según límites ===
  const getCellSeverity = (
    amenityTypeId: number | null | undefined,
    paramKey: AnalysisParamKey,
    value: number | null | undefined,
  ): Severity => {
    if (amenityTypeId == null || value == null) return null;

    const limits = amenityLimitsByType[amenityTypeId];
    if (!limits || !limits.length) return null;

    const limit = limits.find((l) => l.param_key === paramKey);
    if (!limit) return null;

    const { min_value, max_value } = limit;
    const v = value;

    // Fuera de rango -> ROJO
    if (min_value != null && v < min_value) return 'danger';
    if (max_value != null && v > max_value) return 'danger';

    // Dentro del rango: checar zona de advertencia (15% del límite)
    const margin = 0.025;

    // Cerca del mínimo
    if (min_value != null && v >= min_value && v <= min_value * (1 + margin) && min_value != 0) {
      return 'warning';
    }

    // Cerca del máximo
    if (max_value != null && v <= max_value && v >= max_value * (1 - margin) && max_value != 0) {
      return 'warning';
    }

    return null;
  };

  // GENERADOR DE REPORTE
  const generateReport = () => {
    const selectedElementsArray = elements.filter((el) =>
      selectedElements.has(el.id),
    );

    let reportData = selectedElementsArray
      .filter((el) => el.last)
      .map((el) => {
        const row: any = {};
        const severityByHeader: Record<string, Severity> = {};
        row.__cellSeverity = severityByHeader;

        const rawDate = el.last!.sampled_at ? new Date(el.last!.sampled_at) : null;

        // Metadatos controlados por flags, en MAYÚSCULAS
        if (includeNombre) {
          const header = 'Elemento';
          row[header] = toUpper(el.nombre);
        }
        if (includeUbicacion) {
          const header = 'Ubicación';
          row[header] = toUpper(el.ubicacion || 'N/A');
        }
        if (includeTipo) {
          const header = 'Tipo';
          row[header] = toUpper(el.amenity_nombre || el.tipo || 'N/A');
        }
        if (includeFecha) {
          const header = 'Fecha de Análisis';
          row[header] = rawDate
            ? toUpper(
                rawDate.toLocaleString('es-MX', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              )
            : 'N/A';
        }

        // Parámetros seleccionados, también en MAYÚSCULAS + severidad
        selectedParams.forEach((paramKey) => {
          const param = ANALYSIS_PARAMS.find((p) => p.key === paramKey);
          if (!param) return;

          const value = el.last![paramKey];
          const displayValue =
            value != null ? `${value}${param.unit ? ' ' + param.unit : ''}` : 'N/A';

          const header = param.label;
          row[header] = toUpper(displayValue);

          const sev = getCellSeverity(
            el.amenity_type_id ?? null,
            paramKey,
            typeof value === 'number' ? value : value == null ? null : Number(value),
          );
          severityByHeader[header] = sev;
        });

        // Comentarios en MAYÚSCULAS
        if (includeComments && el.last?.comentario) {
          const header = 'Comentarios';
          row[header] = toUpper(el.last.comentario);
        }

        // Campo oculto para filtros/orden por fecha
        row.__rawDate = rawDate ? rawDate.getTime() : null;

        return row;
      });

    // FILTRO POR FECHA
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'last7') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === 'last30') {
        filterDate.setDate(now.getDate() - 30);
      }

      reportData = reportData.filter((row: any) => {
        if (!row.__rawDate) return false;
        return row.__rawDate >= filterDate.getTime();
      });
    }

    // ORDEN
    if (sortBy === 'element') {
      reportData.sort((a: any, b: any) => {
        const aName = a['Elemento'] || '';
        const bName = b['Elemento'] || '';
        return aName.localeCompare(bName);
      });
    } else {
      reportData.sort((a: any, b: any) => {
        const aTime = a.__rawDate || 0;
        const bTime = b.__rawDate || 0;
        return bTime - aTime;
      });
    }

    return reportData;
  };

  const reportData = useMemo(
    () => generateReport(),
    [
      elements,
      selectedElements,
      selectedParams,
      includeNombre,
      includeUbicacion,
      includeTipo,
      includeFecha,
      includeComments,
      dateFilter,
      sortBy,
      amenityLimitsByType, // si cambian límites, se regeneran severidades
    ],
  );

  const headers = useMemo(
    () =>
      reportData.length > 0
        ? Object.keys(reportData[0]).filter(
            (h) => h !== '__rawDate' && h !== '__cellSeverity',
          )
        : [],
    [reportData],
  );

  const downloadCSV = () => {
    if (reportData.length === 0) {
      alert('NO HAY DATOS PARA EXPORTAR CON LOS FILTROS SELECCIONADOS');
      return;
    }

    const csvHeaders = headers;
    const csvContent = [
      csvHeaders.join(','),
      ...reportData.map((row) =>
        csvHeaders
          .map((header) => {
            const value = row[header] ?? '';
            const str = value.toString(); // ya está en mayúsculas
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `reporte_quimica_agua_${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPNG = async () => {
    if (!exportTableRef.current) return;
    const element = exportTableRef.current;

    // Captura de la tabla completa en alta resolución
    const canvas = await html2canvas(element, {
      scale: 2,
      scrollY: -window.scrollY,
    });
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `reporte_quimica_agua_${new Date()
      .toISOString()
      .split('T')[0]}.png`;
    link.click();
  };

  const cellSeverityClasses = (sev: Severity, variant: 'preview' | 'export') => {
    if (sev === 'danger') {
      return 'bg-red-100 text-red-800';
    }
    if (sev === 'warning') {
      return variant === 'preview'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-yellow-50 text-yellow-800';
    }
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/70 rounded-xl shadow-sm border border-cyan-100">
                <FileSpreadsheet className="text-cyan-600" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Generador de Reportes de Agua
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Elige elementos, parámetros y visualiza los valores contra sus
                  límites. Exporta a CSV o PNG.
                </p>
                {limitsError && (
                  <p className="text-xs text-red-600 mt-1">{limitsError}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-white/60"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SELECCIÓN DE ELEMENTOS */}
            <div className="space-y-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                  <CheckSquare size={18} className="text-cyan-600" />
                  Elementos ({selectedElements.size})
                </h3>

                <div className="flex flex-wrap gap-2 items-center justify-end text-xs">
                  <button
                    onClick={selectAllElements}
                    className="text-cyan-600 hover:text-cyan-700 font-semibold"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={clearAllElements}
                    className="text-slate-600 hover:text-slate-800 font-semibold"
                  >
                    Ninguno
                  </button>

                  <span className="hidden sm:inline text-slate-300">·</span>

                  <button
                    onClick={selectAllPools}
                    className="px-2 py-0.5 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-semibold"
                  >
                    Albercas
                  </button>
                  <button
                    onClick={selectAllJacuzzis}
                    className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold"
                  >
                    Jacuzzis
                  </button>
                  <button
                    onClick={selectAllFountains}
                    className="px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold"
                  >
                    Fuentes
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Buscar elemento por nombre, ubicación o tipo..."
                value={searchElement}
                onChange={(e) => setSearchElement(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm placeholder:text-slate-400"
              />

              <div className="border border-slate-200 rounded-lg max-h-80 overflow-y-auto bg-slate-50/40">
                {filteredElements.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    No se encontraron elementos con análisis.
                  </div>
                ) : (
                  filteredElements.map((element) => (
                    <label
                      key={element.id}
                      className="flex items-start gap-3 p-3 hover:bg-cyan-50/60 cursor-pointer border-b border-slate-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedElements.has(element.id)}
                        onChange={() => toggleElement(element.id)}
                        className="mt-1 w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate text-sm">
                          {element.nombre}
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                          {element.amenity_nombre && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 uppercase tracking-wide text-[10px]">
                              {element.amenity_nombre}
                            </span>
                          )}
                          {element.ubicacion && (
                            <span className="text-[11px] text-slate-500">
                              {element.ubicacion}
                            </span>
                          )}
                        </div>
                        {element.last_sampled_at && (
                          <div className="text-[11px] text-slate-400 mt-1">
                            Último análisis:{' '}
                            {new Date(
                              element.last_sampled_at,
                            ).toLocaleDateString('es-MX')}
                          </div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* SELECCIÓN DE PARÁMETROS */}
            <div className="space-y-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                  <CheckSquare size={18} className="text-cyan-600" />
                  Parámetros ({selectedParams.size})
                </h3>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={selectAllParams}
                    className="text-cyan-600 hover:text-cyan-700 font-semibold"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={clearAllParams}
                    className="text-slate-600 hover:text-slate-800 font-semibold"
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg max-h-80 overflow-y-auto bg-slate-50/40">
                <div className="divide-y divide-slate-100">
                  {ANALYSIS_PARAMS.map((param) => (
                    <label
                      key={param.key}
                      className="flex items-center gap-3 p-3 hover:bg-cyan-50/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParams.has(param.key)}
                        onChange={() => toggleParam(param.key)}
                        className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 text-sm">
                          {param.label}
                        </div>
                        {param.unit && (
                          <div className="text-[11px] text-slate-500">
                            Unidad: {param.unit}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* OPCIONES DE REPORTE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Filtros de Fecha
              </h3>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              >
                <option value="all">Todas las fechas</option>
                <option value="today">Hoy</option>
                <option value="last7">Últimos 7 días</option>
                <option value="last30">Últimos 30 días</option>
              </select>

              <p className="text-[11px] text-slate-500 leading-snug">
                El filtro se aplica usando la fecha de muestreo registrada en el análisis.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Orden del Reporte
              </h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              >
                <option value="element">Nombre del elemento</option>
                <option value="date">Fecha (más reciente primero)</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Columnas del Reporte
              </h3>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNombre}
                    onChange={(e) => setIncludeNombre(e.target.checked)}
                    className="w-3.5 h-3.5 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-slate-700">NOMBRE</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeUbicacion}
                    onChange={(e) => setIncludeUbicacion(e.target.checked)}
                    className="w-3.5 h-3.5 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-slate-700">UBICACIÓN</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTipo}
                    onChange={(e) => setIncludeTipo(e.target.checked)}
                    className="w-3.5 h-3.5 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-slate-700">TIPO</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFecha}
                    onChange={(e) => setIncludeFecha(e.target.checked)}
                    className="w-3.5 h-3.5 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-slate-700">FECHA ANÁLISIS</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                    className="w-3.5 h-3.5 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-slate-700">COMENTARIOS</span>
                </label>
              </div>
            </div>
          </div>

          {/* VISTA PREVIA */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Vista previa del reporte
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  🔴 Fuera de los límites · 🟡 A menos del 2.5% de alcanzar el límite.
                </p>
              </div>
              <span className="text-[11px] text-slate-500">
                {reportData.length} fila(s) generadas
              </span>
            </div>

            {reportData.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-center">
                No hay datos para mostrar. Selecciona al menos un elemento y un
                parámetro con los filtros actuales.
              </div>
            ) : (
              <div
                ref={previewTableRef}
                className="overflow-x-auto max-h-96 rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white"
              >
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur border-b border-slate-200">
                    <tr>
                      {headers.map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((row: any, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                      >
                        {headers.map((header) => {
                          const sev = (row.__cellSeverity?.[header] ??
                            null) as Severity;
                          return (
                            <td
                              key={header}
                              className={[
                                'px-3 py-1.5 text-[11px] whitespace-nowrap font-mono tabular-nums',
                                'border-b border-slate-100/60',
                                cellSeverityClasses(sev, 'preview'),
                              ].join(' ')}
                            >
                              {row[header]}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TABLA PARA EXPORTACIÓN COMPLETA (FUERA DE PANTALLA) */}
          {reportData.length > 0 && (
            <div className="absolute -left-[9999px] top-0">
              <div ref={exportTableRef} className="bg-white p-4">
                <table className="min-w-full text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300">
                    <tr>
                      {headers.map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-[0.08em] whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        {headers.map((header) => {
                          const sev = (row.__cellSeverity?.[header] ??
                            null) as Severity;
                          return (
                            <td
                              key={header}
                              className={[
                                'px-3 py-1.5 text-[11px] text-slate-900 whitespace-nowrap font-mono tabular-nums border-t border-slate-100',
                                cellSeverityClasses(sev, 'export'),
                              ].join(' ')}
                            >
                              {row[header]}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl flex items-center justify-between">
          <div className="text-xs text-slate-600">
            {selectedElements.size} elemento(s) · {selectedParams.size} parámetro(s)
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={downloadPNG}
              disabled={reportData.length === 0}
              className="px-4 py-2 border border-cyan-600 text-cyan-700 rounded-lg hover:bg-cyan-50 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ImageDown size={16} />
              PNG
            </button>
            <button
              onClick={downloadCSV}
              disabled={reportData.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download size={16} />
              CSV / Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
