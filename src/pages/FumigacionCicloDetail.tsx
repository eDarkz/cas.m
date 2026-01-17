import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  User,
  Building2,
  QrCode,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import {
  fumigationApi,
  FumigationCycle,
  RoomFumigation,
  RoomFumigationStatus,
} from '../lib/fumigationApi';
import FumigationNavigation from '../components/FumigationNavigation';
import RoomFumigationDetailModal from '../components/RoomFumigationDetailModal';

const STATUS_STYLES: Record<RoomFumigationStatus, { bg: string; text: string; border: string }> = {
  PENDIENTE: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  COMPLETADA: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  NO_APLICA: { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-300' },
};

function parseRoomNumber(roomNumber: string | number | null | undefined) {
  const roomStr = String(roomNumber ?? '');
  const num = roomStr.replace(/\D/g, '');
  if (num.length >= 4) {
    return {
      tower: parseInt(num[0], 10),
      floor: parseInt(num[1], 10),
      room: num.slice(2),
    };
  }
  if (num.length === 3) {
    return {
      tower: parseInt(num[0], 10),
      floor: parseInt(num[1], 10),
      room: num.slice(2),
    };
  }
  return { tower: 0, floor: 0, room: roomStr };
}

interface TowerFloorGroup {
  tower: number;
  floors: {
    floor: number;
    rooms: RoomFumigation[];
    completed: number;
    total: number;
  }[];
  completed: number;
  total: number;
}

export default function FumigacionCicloDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cycleId = Number(id);

  const [cycle, setCycle] = useState<FumigationCycle | null>(null);
  const [rooms, setRooms] = useState<RoomFumigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RoomFumigationStatus | ''>('');
  const [filterTower, setFilterTower] = useState<number | ''>('');
  const [selectedRoom, setSelectedRoom] = useState<RoomFumigation | null>(null);
  const [collapsedTowers, setCollapsedTowers] = useState<Set<number>>(new Set());

  const loadData = async () => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const [cycleData, roomsData] = await Promise.all([
        fumigationApi.getCycle(cycleId),
        fumigationApi.getCycleRooms(cycleId, {
          status: filterStatus || undefined,
        }),
      ]);
      setCycle(cycleData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading cycle data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cycleId, filterStatus]);

  const towers = useMemo(() => {
    const towerSet = new Set<number>();
    rooms.forEach((r) => {
      const parsed = parseRoomNumber(r.room_number);
      if (parsed.tower > 0) towerSet.add(parsed.tower);
    });
    return Array.from(towerSet).sort((a, b) => a - b);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!String(room.room_number ?? '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filterTower !== '') {
        const parsed = parseRoomNumber(room.room_number);
        if (parsed.tower !== filterTower) {
          return false;
        }
      }
      return true;
    });
  }, [rooms, searchQuery, filterTower]);

  const groupedByTowerFloor = useMemo((): TowerFloorGroup[] => {
    const towerMap = new Map<number, Map<number, RoomFumigation[]>>();

    filteredRooms.forEach((room) => {
      const parsed = parseRoomNumber(room.room_number);
      const tower = parsed.tower || 0;
      const floor = parsed.floor || 0;

      if (!towerMap.has(tower)) {
        towerMap.set(tower, new Map());
      }
      const floorMap = towerMap.get(tower)!;
      if (!floorMap.has(floor)) {
        floorMap.set(floor, []);
      }
      floorMap.get(floor)!.push(room);
    });

    const result: TowerFloorGroup[] = [];
    const sortedTowers = Array.from(towerMap.keys()).sort((a, b) => a - b);

    for (const tower of sortedTowers) {
      const floorMap = towerMap.get(tower)!;
      const sortedFloors = Array.from(floorMap.keys()).sort((a, b) => a - b);

      let towerCompleted = 0;
      let towerTotal = 0;

      const floors = sortedFloors.map((floor) => {
        const floorRooms = floorMap.get(floor)!;
        floorRooms.sort((a, b) => {
          const aNum = parseRoomNumber(a.room_number).room;
          const bNum = parseRoomNumber(b.room_number).room;
          return aNum.localeCompare(bNum);
        });

        const completed = floorRooms.filter((r) => r.status === 'COMPLETADA').length;
        towerCompleted += completed;
        towerTotal += floorRooms.length;

        return {
          floor,
          rooms: floorRooms,
          completed,
          total: floorRooms.length,
        };
      });

      result.push({
        tower,
        floors,
        completed: towerCompleted,
        total: towerTotal,
      });
    }

    return result;
  }, [filteredRooms]);

  const stats = useMemo(() => {
    const pending = rooms.filter((r) => r.status === 'PENDIENTE').length;
    const completed = rooms.filter((r) => r.status === 'COMPLETADA').length;
    const total = rooms.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { pending, completed, total, progress };
  }, [rooms]);

  const toggleTower = (tower: number) => {
    setCollapsedTowers((prev) => {
      const next = new Set(prev);
      if (next.has(tower)) {
        next.delete(tower);
      } else {
        next.add(tower);
      }
      return next;
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes para imprimir');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Fumigación - ${cycle?.label || ''}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 8mm;
              background: white;
              font-size: 9pt;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              padding-bottom: 6px;
              border-bottom: 2px solid #0d9488;
            }
            .header h1 {
              font-size: 16px;
              color: #0d9488;
              margin: 0;
            }
            .header .period {
              font-size: 9px;
              color: #666;
              text-align: right;
            }
            .stats {
              display: flex;
              gap: 8px;
              margin-bottom: 10px;
              font-size: 8px;
            }
            .stat-item {
              flex: 1;
              text-align: center;
              padding: 4px;
              background: #f9fafb;
              border-radius: 3px;
            }
            .stat-value {
              font-size: 14px;
              font-weight: bold;
              color: #0d9488;
            }
            .stat-label {
              font-size: 7px;
              color: #666;
              margin-top: 2px;
            }
            .tower-section {
              page-break-inside: avoid;
              margin-bottom: 10px;
            }
            .tower-header {
              background: #0d9488;
              color: white;
              padding: 4px 8px;
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 6px;
            }
            .floor-section {
              margin-bottom: 8px;
            }
            .floor-header {
              font-size: 9px;
              font-weight: bold;
              color: #374151;
              margin-bottom: 4px;
              padding: 2px 4px;
              background: #f3f4f6;
              display: inline-block;
            }
            .rooms-grid {
              display: grid;
              grid-template-columns: repeat(15, 1fr);
              gap: 3px;
            }
            .room-card {
              border: 1.5px solid;
              padding: 3px 2px;
              text-align: center;
              min-height: 32px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              font-size: 8px;
            }
            .room-card.completada {
              background: #d1fae5;
              border-color: #10b981;
            }
            .room-card.pendiente {
              background: #fed7aa;
              border-color: #f59e0b;
            }
            .room-card.no_aplica {
              background: #e5e7eb;
              border-color: #9ca3af;
            }
            .room-number {
              font-weight: bold;
              font-size: 9px;
              line-height: 1;
            }
            .room-status {
              font-size: 11px;
              line-height: 1;
              margin-top: 1px;
            }
            .footer {
              margin-top: 8px;
              text-align: center;
              font-size: 7px;
              color: #666;
              padding-top: 4px;
              border-top: 1px solid #e5e7eb;
            }
            .legend {
              display: flex;
              gap: 10px;
              justify-content: center;
              margin-bottom: 8px;
              font-size: 8px;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .legend-box {
              width: 12px;
              height: 12px;
              border: 1.5px solid;
            }
            @media print {
              body {
                padding: 8mm;
              }
              .tower-section {
                page-break-inside: avoid;
              }
              @page {
                margin: 8mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Fumigación - ${cycle?.label || ''}</h1>
            </div>
            <div class="period">
              ${cycle ? `${new Date(cycle.period_start).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - ${new Date(cycle.period_end).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
            </div>
          </div>

          <div class="stats">
            <div class="stat-item">
              <div class="stat-value">${stats.total}</div>
              <div class="stat-label">Total</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.completed}</div>
              <div class="stat-label">Completadas</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.pending}</div>
              <div class="stat-label">Pendientes</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.progress}%</div>
              <div class="stat-label">Progreso</div>
            </div>
          </div>

          <div class="legend">
            <div class="legend-item">
              <div class="legend-box" style="background: #d1fae5; border-color: #10b981;"></div>
              <span>Completada ✓</span>
            </div>
            <div class="legend-item">
              <div class="legend-box" style="background: #fed7aa; border-color: #f59e0b;"></div>
              <span>Pendiente ⏱</span>
            </div>
            <div class="legend-item">
              <div class="legend-box" style="background: #e5e7eb; border-color: #9ca3af;"></div>
              <span>No aplica —</span>
            </div>
          </div>

          ${groupedByTowerFloor.map((towerGroup) => `
            <div class="tower-section">
              <div class="tower-header">
                Torre ${towerGroup.tower} - ${towerGroup.completed}/${towerGroup.total} (${towerGroup.total > 0 ? Math.round((towerGroup.completed / towerGroup.total) * 100) : 0}%)
              </div>
              ${towerGroup.floors.map((floorGroup) => `
                <div class="floor-section">
                  <div class="floor-header">
                    Piso ${floorGroup.floor}: ${floorGroup.completed}/${floorGroup.total} (${floorGroup.total > 0 ? Math.round((floorGroup.completed / floorGroup.total) * 100) : 0}%)
                  </div>
                  <div class="rooms-grid">
                    ${floorGroup.rooms.map((room) => `
                      <div class="room-card ${room.status.toLowerCase()}" title="${room.fumigator_nombre || ''}">
                        <div class="room-number">${room.room_number}</div>
                        <div class="room-status">${room.status === 'COMPLETADA' ? '✓' : room.status === 'PENDIENTE' ? '⏱' : '—'}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}

          <div class="footer">
            Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (!cycleId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">ID de ciclo invalido</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FumigationNavigation />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/fumigacion/habitaciones')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a ciclos
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Home className="w-7 h-7 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {cycle?.label || 'Cargando...'}
                </h1>
                {cycle && (
                  <p className="text-gray-500">
                    {new Date(cycle.period_start).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'long',
                    })}{' '}
                    -{' '}
                    {new Date(cycle.period_end).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <Printer className="w-5 h-5" />
              Imprimir
            </button>
            <Link
              to={`/fumigacion/habitaciones/campo/${cycleId}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              <QrCode className="w-5 h-5" />
              Formulario Campo
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total habitaciones</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completadas</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pendientes</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-teal-600">{stats.progress}%</div>
            <div className="text-sm text-gray-500">Progreso</div>
            <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-teal-600" />
                <h2 className="font-semibold text-gray-900">Habitaciones</h2>
                <span className="text-sm text-gray-500">({filteredRooms.length})</span>
              </div>
              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Recargar"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar habitacion..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as RoomFumigationStatus | '')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="COMPLETADA">Completadas</option>
                  <option value="NO_APLICA">No aplica</option>
                </select>
                {towers.length > 1 && (
                  <select
                    value={filterTower}
                    onChange={(e) => setFilterTower(e.target.value === '' ? '' : Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  >
                    <option value="">Todas las torres</option>
                    {towers.map((tower) => (
                      <option key={tower} value={tower}>
                        Torre {tower}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {loading && rooms.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <HamsterLoader size="small" />
              <span className="text-gray-600">Cargando habitaciones...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron habitaciones</p>
            </div>
          ) : (
            <div className="max-h-[700px] overflow-y-auto">
              {groupedByTowerFloor.map((towerGroup) => {
                const isCollapsed = collapsedTowers.has(towerGroup.tower);
                const towerProgress = towerGroup.total > 0
                  ? Math.round((towerGroup.completed / towerGroup.total) * 100)
                  : 0;

                return (
                  <div key={towerGroup.tower} className="border-b border-gray-200 last:border-b-0">
                    <button
                      onClick={() => toggleTower(towerGroup.tower)}
                      className="w-full px-4 py-3 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-teal-600" />
                        <span className="font-bold text-teal-800">
                          Torre {towerGroup.tower}
                        </span>
                        <span className="text-sm text-teal-600">
                          {towerGroup.completed}/{towerGroup.total} ({towerProgress}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-teal-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full transition-all"
                            style={{ width: `${towerProgress}%` }}
                          />
                        </div>
                        {isCollapsed ? (
                          <ChevronDown className="w-5 h-5 text-teal-600" />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-teal-600" />
                        )}
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="p-4 space-y-4">
                        {towerGroup.floors.map((floorGroup) => {
                          const floorProgress = floorGroup.total > 0
                            ? Math.round((floorGroup.completed / floorGroup.total) * 100)
                            : 0;

                          return (
                            <div key={floorGroup.floor} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">
                                    Piso {floorGroup.floor}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({floorGroup.completed}/{floorGroup.total})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        floorProgress === 100 ? 'bg-green-500' : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${floorProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-500">{floorProgress}%</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {floorGroup.rooms.map((room) => {
                                  const statusStyle = STATUS_STYLES[room.status];
                                  const parsed = parseRoomNumber(room.room_number);

                                  return (
                                    <button
                                      key={room.id}
                                      onClick={() => setSelectedRoom(room)}
                                      className={`relative min-w-14 h-14 px-2 rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-md ${statusStyle.bg} ${statusStyle.border}`}
                                      title={`${room.room_number} - ${room.status}${room.fumigator_nombre ? ` - ${room.fumigator_nombre}` : ''}`}
                                    >
                                      <span className={`text-sm font-bold ${statusStyle.text}`}>
                                        {room.room_number}
                                      </span>
                                      {room.status === 'COMPLETADA' ? (
                                        <CheckCircle2 className={`w-3 h-3 ${statusStyle.text}`} />
                                      ) : room.status === 'PENDIENTE' ? (
                                        <Clock className={`w-3 h-3 ${statusStyle.text}`} />
                                      ) : (
                                        <AlertTriangle className={`w-3 h-3 ${statusStyle.text}`} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedRoom && (
        <RoomFumigationDetailModal
          roomFumigation={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onUpdate={() => {
            setSelectedRoom(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
