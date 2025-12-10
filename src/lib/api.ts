const API_BASE_URL = 'https://bsupers.fly.dev';

export interface Supervisor {
  id: number;
  nombre: string;
  alias?: string;
  correo: string;
  role?: string;
  kind?: 'SUPERVISOR' | 'PROYECTO';
  is_active: boolean;
}

export interface NoteComment {
  id: number;
  note_id: string;
  author_id?: number;
  body: string;
  mentions?: string[];
  created_at: string;
}

export interface Note {
  id: string;
  supervisor_id: number;
  titulo: string;
  actividades: string;
  fecha: string;
  estado: 0 | 1 | 2;
  cristal: boolean;
  imagen?: string;
  comment?: string;
  supervisor_nombre?: string;
  supervisor_correo?: string;
  imgs?: string[];
  images?: Array<{ id: number; url: string; created_at: string }>;
}

export type RequisitionStatus =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'EN_COMPRAS'
  | 'PARCIAL'
  | 'CERRADA'
  | 'CANCELADA';

export type ItemStatus =
  | 'PENDIENTE'
  | 'PARCIAL'
  | 'SURTIDO'
  | 'CANCELADO';

export type Priority = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface Requisition {
  id: string;
  folio: number;
  requested_by_id: number;
  requested_for_area: string;
  priority: Priority;
  status: RequisitionStatus;
  comentario: string | null;
  responsible_id: number | null;
  external_req_number: string | null;
  external_system: string | null;
  needed_date: string | null;
  total_items: number;
  pending_items: number;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  requested_by_nombre?: string;
  requested_by_correo?: string;
  responsible_nombre?: string | null;
  responsible_correo?: string | null;
}

export interface RequisitionItem {
  id: number;
  requisition_id: string;
  line_number: number;
  descripcion: string;
  modelo: string;
  cantidad: number;
  unidad: string;
  destino: string;
  imagen_url: string | null;
  nota: string | null;
  status: ItemStatus;
  delivered_qty: number;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequisitionStatusLog {
  id: number;
  requisition_id: string;
  status: RequisitionStatus | null;
  comment: string | null;
  performed_by: number | null;
  created_at: string;
  performed_by_nombre?: string | null;
}

export interface RequisitionDetail extends Requisition {
  items?: RequisitionItem[];
  history?: RequisitionStatusLog[];
}

export interface Room {
  id: number;
  numero: number;
  area?: string;
}

export interface RoomStatus {
  habitacion: number;
  fecha?: string;
  inicio?: string;
  fin?: string;
  operador?: string;
  inspeccionando: boolean;
  checks: string[];
}

export interface Sabana {
  id: string;
  titulo: string;
  date?: string;
  created_by?: number;
  responsible_id?: number;
  responsible_nombre?: string;
  created_at: string;
  is_archived?: number;
  rooms_total?: number;
  rooms_completed?: number;
  avance_pct?: number;
}

export interface SabanaItem {
  habitacion: number;
  status: 'PENDIENTE' | 'PROCESO' | 'TERMINADA';
  comentario?: string;
  fecha?: string;
}

export interface SabanaItemDetail {
  habitacion: number;
  status: string;
  comentario?: string;
  updated_at?: string;
  comments: Array<{
    id: number;
    body: string;
    author_id?: number;
    created_at: string;
  }>;
  images: Array<{
    id: number;
    url: string;
    created_at: string;
  }>;
}

export interface SabanaSummary {
  total: number;
  pendientes: number;
  en_proceso: number;
  terminadas: number;
  avance_pct: number;
  refreshed?: boolean;
}

export type InspectionRoomStatus =
  | 'SIN_INSPECCIONAR'
  | 'EN_PROCESO'
  | 'INSPECCIONADA_CON_DETALLES'
  | 'INSPECCIONADA_SIN_DETALLES'
  | 'EN_REPARACION_DE_DETALLES'
  | 'INSPECCIONADA_CONCLUIDA';

export type InspectionClosingSummary =
  | 'SIN_DETALLES'
  | 'CON_DETALLES_PENDIENTES'
  | 'DETALLES_CORREGIDOS';

export interface InspectionCycle {
  id: number;
  year: number;
  month: number;
  nombre: string;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface InspectionQuestion {
  id: number;
  pregunta: string;
  problema: string;
  orden: number;
}

export interface InspectionRoom {
  habitacion: number;
  room_id: number;
  status: InspectionRoomStatus;
  comentario?: string;
  has_pending_next: number;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
  closing_summary?: InspectionClosingSummary | null;
  last_lat?: number;
  last_lng?: number;
}

export interface InspectionIssue {
  question_id: number;
  state: 'OPEN' | 'CORRECTED' | 'WONT_FIX';
  first_seen_at: string;
  resolved_at?: string;
  reopen_count?: number;
  notes?: string;
  pregunta: string;
  problema: string;
}

export interface InspectionRoomDetail extends InspectionRoom {
  comments: Array<{
    id: number;
    author_id?: number;
    body: string;
    created_at: string;
  }>;
  images: Array<{
    id: number;
    url: string;
    created_at: string;
  }>;
  answers: Array<{
    question_id: number;
    pregunta: string;
    problema: string;
    ok: boolean;
    note?: string;
    updated_at: string;
  }>;
  issues: InspectionIssue[];
}

export interface AquaticElement {
  id: string;
  nombre: string;
  ubicacion?: string;
  amenity_type_id?: number | null;
  tipo?: string | null;
  lon?: number | null;
  lat?: number | null;
  is_archived: number;
  created_by?: number;
  created_at: string;
  updated_at?: string;
  amenity_code?: string | null;
  amenity_nombre?: string | null;
  amenity_descripcion?: string | null;
  analyses_count?: number;
  last_sampled_at?: string;
  last?: WaterAnalysis;
}

export interface WaterAnalysis {
  id: string;
  element_id: string;
  sampled_at: string;
  cloro_libre?: number | null;
  cloro_total?: number | null;
  cloraminas?: number | null;
  acidoiso?: number | null;
  alcalinidad?: number | null;
  ph?: number | null;
  fe?: number | null;
  cu?: number | null;
  turbidez?: number | null;
  temperatura?: number | null;
  sdt?: number | null;
  conductividad?: number | null;
  dureza_calcio?: number | null;
  lsi?: number | null;
  rsi?: number | null;
  nitritos?: number | null;
  zinc?: number | null;
  t3dt22?: number | null;
  oxigeno_disuelto?: number | null;
  ivl?: number | null;
  comentario?: string | null;
  created_by?: number;
  created_at: string;
  updated_at?: string;
  elemento_nombre?: string;
  images?: Array<{
    id: number;
    url: string;
    created_at: string;
  }>;
}

export interface WaterAnalysisDetail extends WaterAnalysis {
  images: Array<{
    id: number;
    url: string;
    created_at: string;
  }>;
}

export type AnalysisParamKey =
  | 'ph'
  | 'cloro_libre'
  | 'cloro_total'
  | 'cloraminas'
  | 'acidoiso'
  | 'alcalinidad'
  | 'fe'
  | 'cu'
  | 'turbidez'
  | 'temperatura'
  | 'sdt'
  | 'conductividad'
  | 'dureza_calcio'
  | 'lsi'
  | 'rsi'
  | 'nitritos'
  | 'zinc'
  | 't3dt22'
  | 'oxigeno_disuelto'
  | 'ivl';

export type WaterParameter = AnalysisParamKey;

export interface AnalysisParamDef {
  key: AnalysisParamKey;
  label: string;
  unit: string | null;
}

export const ANALYSIS_PARAMS: AnalysisParamDef[] = [
  { key: 'ph', label: 'pH', unit: null },
  { key: 'cloro_libre', label: 'Cloro libre', unit: 'mg/L' },
  { key: 'cloro_total', label: 'Cloro total', unit: 'mg/L' },
  { key: 'cloraminas', label: 'Cloraminas', unit: 'mg/L' },
  { key: 'acidoiso', label: 'Ácido isocianúrico', unit: 'mg/L' },
  { key: 'alcalinidad', label: 'Alcalinidad (como CaCO₃)', unit: 'mg/L' },
  { key: 'fe', label: 'Hierro (Fe)', unit: 'mg/L' },
  { key: 'cu', label: 'Cobre (Cu)', unit: 'mg/L' },
  { key: 'turbidez', label: 'Turbidez', unit: 'NTU' },
  { key: 'temperatura', label: 'Temperatura', unit: '°C' },
  { key: 'sdt', label: 'Sólidos disueltos totales (TDS)', unit: 'mg/L' },
  { key: 'conductividad', label: 'Conductividad', unit: 'µS/cm' },
  { key: 'dureza_calcio', label: 'Dureza calcio (como CaCO₃)', unit: 'mg/L' },
  { key: 'lsi', label: 'Índice de saturación de Langelier (LSI)', unit: null },
  { key: 'rsi', label: 'Índice de estabilidad de Ryznar (RSI)', unit: null },
  { key: 'nitritos', label: 'Nitritos', unit: 'mg/L' },
  { key: 'zinc', label: 'Zinc', unit: 'mg/L' },
  { key: 't3dt22', label: '3DT22', unit: 'UFC/100ml' },
  { key: 'oxigeno_disuelto', label: 'Oxígeno disuelto', unit: 'mg/L' },
  { key: 'ivl', label: 'IVL', unit: null },
];

export interface AmenityType {
  id: number;
  code: string;
  nombre: string;
  descripcion: string | null;
}

export interface AmenityLimit {
  id: number;
  amenity_type_id: number;
  amenity_code: string;
  amenity_nombre: string;
  param_key: AnalysisParamKey;
  min_value: number | null;
  max_value: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionProgress {
  total: number;
  sin_inspeccionar: number;
  con_detalles: number;
  sin_detalles: number;
  en_reparacion: number;
  concluidas: number;
  avance_pct: number;
}

export interface FumigationCycle {
  id: number;
  year: number;
  month: number;
  status?: string;
  notes?: string;
  created_at: string;
  created_by?: number;
}

export interface FumigationRoomByCycle {
  room_id: number;
  room_number?: number;
  status: string;
  last_visit?: string | null;
}

export interface FumigationStation {
  id: number;
  name: string;
  area?: string | null;
  description?: string | null;
  active: boolean;
  utm_x?: number | null;
  utm_y?: number | null;
  location?: string | null;
  installed_at?: string | null;
}

export interface FumigationStationLog {
  id?: number;
  station_id: number;
  inspector_id?: number | null;
  visited_at: string;
  utm_x?: number | null;
  utm_y?: number | null;
  photo_url?: string | null;
  notes?: string | null;
  station_name?: string;
  inspector_nombre?: string;
}

export interface FumigationRoomLog {
  id?: number;
  cycle_id: number;
  room_id: number;
  fumigator_id?: number | null;
  visited_at: string;
  utm_x?: number | null;
  utm_y?: number | null;
  photo_url?: string | null;
  notes?: string | null;
  room_number?: number;
  fumigator_nombre?: string;
}

export interface MonthlyPlanItem {
  id: number;
  plan_id: number;
  day: number;
  start_time: string;
  activity?: string | null;
  areas: string[];
}

export interface MonthlyPlan {
  id: number;
  year: number;
  month: number;
  created_by?: number | null;
  created_at: string;
  items: MonthlyPlanItem[];
}

export interface FumigationExecutiveReport {
  summary: {
    month: number;
    year: number;
    rooms: {
      total: number;
      visited: number;
      pending: number;
      progress: number;
    };
    stations: {
      total: number;
      visited: number;
      pending: number;
      progress: number;
    };
  };
  unvisited_rooms: Array<{ room_id: number; room_number: number }>;
  unvisited_stations: FumigationStation[];
  last_visits: {
    rooms: Array<{ room_number: number; last_visit: string | null }>;
    stations: Array<{ station_name: string; last_visit: string | null }>;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    console.group(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
    console.log('📍 Full URL:', url);
    console.log('⚙️ Options:', {
      method: options.method || 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (options.body) {
      console.log('📦 Request Body:', options.body);
      try {
        console.log('📦 Parsed Body:', JSON.parse(options.body as string));
      } catch (e) {
        console.log('⚠️ Body is not JSON');
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log('📥 Response Status:', response.status, response.statusText);
      console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.text();
          console.error('❌ Error Response Body:', errorBody);
          try {
            const parsedError = JSON.parse(errorBody);
            console.error('❌ Parsed Error:', parsedError);
          } catch (e) {
            console.error('❌ Error body is not JSON');
          }
        } catch (e) {
          console.error('❌ Could not read error body');
        }
        console.groupEnd();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody || 'No error details'}`);
      }

      const data = await response.json();
      console.log('✅ Response Data:', data);
      console.groupEnd();
      return data;
    } catch (error) {
      console.error('🔥 Request Failed:', error);
      console.groupEnd();
      throw error;
    }
  }

  async getNotes(params?: {
    estado?: 0 | 1 | 2;
    supervisorId?: number;
    from?: string;
    to?: string;
    q?: string;
  }): Promise<Note[]> {
    const searchParams = new URLSearchParams();
    if (params?.estado !== undefined) searchParams.append('estado', params.estado.toString());
    if (params?.supervisorId) searchParams.append('supervisorId', params.supervisorId.toString());
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.q) searchParams.append('q', params.q);

    return this.request<Note[]>(`/v1/notes?${searchParams}`);
  }

  async getNoteById(id: string): Promise<Note & { images: any[]; comments: NoteComment[] }> {
    return this.request(`/v1/notes/${id}`);
  }

  async createNote(data: {
    supervisorId: number;
    titulo: string;
    actividades: string;
    fecha: string;
    cristal?: boolean;
    imagen?: string;
  }): Promise<{ id: string }> {
    return this.request('/v1/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNote(id: string, data: Partial<Note>): Promise<void> {
    await this.request(`/v1/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changeNoteState(id: string, estado: 0 | 1 | 2): Promise<void> {
    await this.request(`/v1/notes/${id}/state`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.request(`/v1/notes/${id}`, { method: 'DELETE' });
  }

  async addNoteComment(id: string, body: string, authorId?: number): Promise<{ id: number }> {
    return this.request(`/v1/notes/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, authorId }),
    });
  }

  async addNoteImage(id: string, url: string): Promise<void> {
    await this.request(`/v1/notes/${id}/images`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getRequisitions(params?: {
    q?: string;
    status?: RequisitionStatus;
    requestedById?: number;
    responsibleId?: number;
    pendingOnly?: boolean;
    limit?: number;
  }): Promise<Requisition[]> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.append('q', params.q);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.requestedById) searchParams.append('requestedById', params.requestedById.toString());
    if (params?.responsibleId) searchParams.append('responsibleId', params.responsibleId.toString());
    if (params?.pendingOnly) searchParams.append('pendingOnly', '1');
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return this.request<Requisition[]>(`/v1/requis?${searchParams}`);
  }

  async createRequisition(data: {
    requestedById: number;
    requestedForArea: string;
    priority?: Priority;
    comentario?: string;
    responsibleId?: number;
    neededDate?: string;
    initialStatus?: RequisitionStatus;
    items: Array<{
      descripcion: string;
      modelo?: string;
      cantidad: number;
      unidad: string;
      destino: string;
      imagenUrl?: string | null;
      nota?: string | null;
    }>;
  }): Promise<{ id: string; folio: number }> {
    return this.request('/v1/requis', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRequisition(id: string, data: {
    requestedForArea?: string;
    priority?: Priority;
    comentario?: string | null;
    responsibleId?: number;
    neededDate?: string;
  }): Promise<{ updated: number }> {
    return this.request(`/v1/requis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addRequisitionStatus(
    id: string,
    data: {
      status?: RequisitionStatus;
      comment?: string;
      performedBy?: number;
      externalReqNumber?: string;
      markClosed?: boolean;
    }
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/requis/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRequisitionById(id: string, include?: string[]): Promise<RequisitionDetail> {
    const params = new URLSearchParams();
    if (include && include.length > 0) {
      params.append('include', include.join(','));
    }
    const query = params.toString();
    return this.request(`/v1/requis/${id}${query ? '?' + query : ''}`);
  }

  async getRequisitionItems(id: string): Promise<RequisitionItem[]> {
    return this.request(`/v1/requis/${id}/items`);
  }

  async addRequisitionItems(
    id: string,
    items: Array<{
      descripcion: string;
      modelo?: string;
      cantidad: number;
      unidad: string;
      destino: string;
      imagenUrl?: string | null;
      nota?: string | null;
    }>
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/requis/${id}/items`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async updateRequisitionItem(
    itemId: number,
    data: {
      descripcion?: string;
      modelo?: string;
      cantidad?: number;
      unidad?: string;
      destino?: string;
      imagenUrl?: string | null;
      nota?: string | null;
      status?: ItemStatus;
      deliveredQty?: number;
    }
  ): Promise<{ updated: number }> {
    return this.request(`/v1/requis/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async markItemReceived(
    itemId: number,
    deliveredQty?: number
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/requis/items/${itemId}/received`, {
      method: 'PATCH',
      body: JSON.stringify({ deliveredQty }),
    });
  }

  async getRequisitionStatusLogs(id: string): Promise<RequisitionStatusLog[]> {
    return this.request(`/v1/requis/${id}/status`);
  }

  async deleteRequisition(id: string): Promise<{ deleted: number }> {
    return this.request(`/v1/requis/${id}`, { method: 'DELETE' });
  }

  async getRequisitionsSummary(): Promise<{
    requisitions: {
      total_requisitions: number;
      open_requisitions: number;
      closed_requisitions: number;
    };
    items: {
      total_items: number;
      pending_items: number;
      received_items: number;
    };
  }> {
    return this.request('/v1/requis/reports/summary');
  }

  async getRequisitionsAging(params?: {
    onlyPending?: boolean;
    limit?: number;
  }): Promise<Array<Requisition & { days_open: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.onlyPending) searchParams.append('onlyPending', '1');
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return this.request(`/v1/requis/reports/aging?${searchParams}`);
  }

  async getPendingItems(params?: {
    supervisorId?: number;
    limit?: number;
  }): Promise<Array<RequisitionItem & {
    requisition_status: RequisitionStatus;
    folio: number;
    external_req_number: string | null;
    requested_by_nombre: string;
    days_open: number;
  }>> {
    const searchParams = new URLSearchParams();
    if (params?.supervisorId) searchParams.append('supervisorId', params.supervisorId.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return this.request(`/v1/requis/reports/pending-items?${searchParams}`);
  }

  async getSupervisors(params?: { q?: string; sectionId?: number; kind?: 'SUPERVISOR' | 'PROYECTO' }): Promise<Supervisor[]> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.append('q', params.q);
    if (params?.sectionId) searchParams.append('sectionId', params.sectionId.toString());
    if (params?.kind) searchParams.append('kind', params.kind);

    return this.request<Supervisor[]>(`/v1/supervisors?${searchParams}`);
  }

  async createSupervisor(data: {
    nombre: string;
    alias?: string;
    correo: string;
    role?: string;
    kind?: 'SUPERVISOR' | 'PROYECTO';
    is_active?: boolean;
  }): Promise<{ id: number }> {
    return this.request('/v1/supervisors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupervisor(id: number, data: Partial<Supervisor>): Promise<void> {
    await this.request(`/v1/supervisors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupervisor(id: number): Promise<void> {
    await this.request(`/v1/supervisors/${id}`, { method: 'DELETE' });
  }

  async getArrivals(date: string): Promise<{ date: string; rooms: number[] }> {
    return this.request(`/v1/arrivals/${date}`);
  }

  async updateArrivals(date: string, roomNumbers: number[], responsibleId?: number): Promise<void> {
    await this.request(`/v1/arrivals/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ roomNumbers, responsibleId }),
    });
  }

  async getRooms(): Promise<Room[]> {
    return this.request<Room[]>('/v1/rooms');
  }

  async getRoomStatus(date: string, onlyArrivals?: boolean): Promise<{
    date: string;
    onlyArrivals: boolean;
    data: RoomStatus[];
  }> {
    const params = new URLSearchParams({ date });
    if (onlyArrivals) params.append('onlyArrivals', 'true');
    return this.request(`/v1/rooms/status?${params}`);
  }

  async updateRoomStatus(
    roomNumber: number,
    date: string,
    data: {
      checks: string[];
      inicio?: string;
      fin?: string;
      operador?: string;
      inspeccionando?: boolean;
      responsibleId?: number;
    }
  ): Promise<void> {
    await this.request(`/v1/rooms/${roomNumber}/status?date=${date}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createSabana(data: {
    titulo: string;
    createdBy: number;
    responsibleId: number;
    date: string;
  }): Promise<{ id: string }> {
    return this.request('/v1/sabanas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSabanas(params?: {
    archived?: 0 | 1;
    fields?: 'mini' | 'basic' | 'summary';
    page?: number;
    pageSize?: number;
  }): Promise<Sabana[]> {
    const searchParams = new URLSearchParams();
    if (params?.archived !== undefined) searchParams.append('archived', params.archived.toString());
    if (params?.fields) searchParams.append('fields', params.fields);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const url = searchParams.toString() ? `/v1/sabanas?${searchParams}` : '/v1/sabanas';
    const response = await this.request<{
      page: number;
      pageSize: number;
      total: number;
      data: Sabana[];
    }>(url);
    return response.data;
  }

  async getSabana(id: string): Promise<Sabana> {
    return this.request(`/v1/sabanas/${id}`);
  }

  async getSabanaItems(
    id: string,
    params?: {
      status?: 'PENDIENTE' | 'PROCESO' | 'TERMINADA';
      page?: number;
      pageSize?: number;
    }
  ): Promise<SabanaItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const response = await this.request<{
      page: number;
      pageSize: number;
      total: number;
      data: SabanaItem[];
    }>(`/v1/sabanas/${id}/items?${searchParams}`);
    return response.data || [];
  }

  async getSabanaItemDetail(id: string, roomNumber: number): Promise<SabanaItemDetail> {
    return this.request(`/v1/sabanas/${id}/items/${roomNumber}`);
  }

  async updateSabanaItem(
    sabanaId: string,
    roomNumber: number,
    data: {
      status: 'PENDIENTE' | 'PROCESO' | 'TERMINADA';
      comentario?: string;
      performedBy?: number;
    }
  ): Promise<void> {
    await this.request(`/v1/sabanas/${sabanaId}/items/${roomNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addSabanaItemComment(
    sabanaId: string,
    roomNumber: number,
    data: {
      authorId: number;
      body: string;
    }
  ): Promise<void> {
    await this.request(`/v1/sabanas/${sabanaId}/items/${roomNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addSabanaItemImage(
    sabanaId: string,
    roomNumber: number,
    url: string
  ): Promise<void> {
    await this.request(`/v1/sabanas/${sabanaId}/items/${roomNumber}/images`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getSabanaSummary(id: string, refresh?: boolean): Promise<SabanaSummary> {
    const url = refresh ? `/v1/sabanas/${id}/summary?refresh=1` : `/v1/sabanas/${id}/summary`;
    return this.request(url);
  }

  async archiveSabana(id: string): Promise<{ ok: boolean }> {
    return this.request(`/v1/sabanas/${id}/archive`, { method: 'PATCH' });
  }

  async unarchiveSabana(id: string): Promise<{ ok: boolean }> {
    return this.request(`/v1/sabanas/${id}/unarchive`, { method: 'PATCH' });
  }

  async recalcSabanaCounters(id: string): Promise<{
    rooms_total: number;
    rooms_completed: number;
    avance_pct: number;
  }> {
    return this.request(`/v1/sabanas/${id}/recalc-counters`, { method: 'POST' });
  }

  async deleteSabana(id: string): Promise<void> {
    await this.request(`/v1/sabanas/${id}`, { method: 'DELETE' });
  }

  exportSabanaUrl(id: string): string {
    return `${this.baseUrl}/v1/sabanas/${id}/export`;
  }


  async createInspectionCycle(data: {
    period_year: number;
    period_month: number;
    titulo?: string;
    responsibleId?: number;
    preloadRooms?: boolean;
    startFromPreviousOpen?: boolean;
  }): Promise<{ id: string }> {
    return this.request('/v1/inspections/cycles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInspectionCycles(params?: {
    year?: number;
    month?: number;
    q?: string;
    withSummary?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{
    page: number;
    pageSize: number;
    total: number;
    data: InspectionCycle[];
  }> {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.month) searchParams.append('month', params.month.toString());
    if (params?.q) searchParams.append('q', params.q);
    if (params?.withSummary) searchParams.append('withSummary', '1');
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    return this.request(`/v1/inspections?${searchParams}`);
  }

  async getInspectionCycle(id: string): Promise<InspectionCycle> {
    return this.request(`/v1/inspections/${id}`);
  }

  async getInspectionProgress(id: string): Promise<InspectionProgress> {
    return this.request(`/v1/inspections/${id}/progress`);
  }

  async getInspectionPreviousPending(id: string): Promise<{
    previousId: string | null;
    rooms: number[];
  }> {
    return this.request(`/v1/inspections/${id}/previous-pending`);
  }

  async getInspectionQuestions(): Promise<InspectionQuestion[]> {
    return this.request('/v1/inspections/questions/all');
  }

  async getInspectionRooms(
    id: string,
    params?: {
      status?: InspectionRoomStatus;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    page: number;
    pageSize: number;
    total: number;
    data: InspectionRoom[];
  }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    return this.request(`/v1/inspections/${id}/rooms?${searchParams}`);
  }

  async getInspectionRoomDetail(id: string, roomNumber: number): Promise<InspectionRoomDetail> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}`);
  }

  async updateInspectionRoom(
    id: string,
    roomNumber: number,
    data: {
      status?: InspectionRoomStatus;
      comentario?: string | null;
      hasPendingNext?: boolean;
      performedBy?: number;
    }
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addInspectionComment(
    id: string,
    roomNumber: number,
    data: { authorId?: number; body: string }
  ): Promise<{ id: number }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInspectionComments(
    id: string,
    roomNumber: number,
    params?: { limit?: number; cursor?: number }
  ): Promise<{
    data: Array<{
      id: number;
      author_id?: number;
      body: string;
      created_at: string;
    }>;
    nextCursor: number | null;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.cursor) searchParams.append('cursor', params.cursor.toString());

    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/comments?${searchParams}`);
  }

  async addInspectionImage(
    id: string,
    roomNumber: number,
    url: string
  ): Promise<{ id: number }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/images`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async saveInspectionAnswers(
    id: string,
    roomNumber: number,
    data: {
      answers: Array<{
        questionId: number;
        ok: boolean;
        note?: string;
      }>;
      performedBy?: number;
      lat?: number;
      lng?: number;
      sessionId?: string;
      finalize?: boolean;
    }
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/answers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startInspectionSession(
    id: string,
    roomNumber: number,
    data?: {
      actorId?: number;
      actorName?: string;
      sessionId?: string;
      lat?: number;
      lng?: number;
    }
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/start`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async exitInspectionSession(
    id: string,
    roomNumber: number,
    data?: {
      actorId?: number;
      sessionId?: string;
      lat?: number;
      lng?: number;
    }
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/exit`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async saveDraftInspection(
    id: string,
    roomNumber: number,
    data?: {
      actorId?: number;
      sessionId?: string;
      lat?: number;
      lng?: number;
    }
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/save-draft`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async completeInspection(
    id: string,
    roomNumber: number,
    data: {
      withDetails: boolean;
      actorId?: number;
      sessionId?: string;
      lat?: number;
      lng?: number;
    }
  ): Promise<{ ok: boolean; closingSummary: string }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markIssueAsCorrected(
    id: string,
    roomNumber: number,
    data: {
      questionId: number;
      actorId?: number;
      sessionId?: string;
      lat?: number;
      lng?: number;
      note?: string;
    }
  ): Promise<{ ok: boolean; summary: any }> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/issues/mark-corrected`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInspectionIssues(
    id: string,
    roomNumber: number,
    state?: 'OPEN' | 'CORRECTED' | 'WONT_FIX'
  ): Promise<InspectionIssue[]> {
    const params = state ? `?state=${state}` : '';
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/issues${params}`);
  }

  async getInspectionAnswers(
    id: string,
    roomNumber: number
  ): Promise<Array<{
    question_id: number;
    pregunta: string;
    problema: string;
    ok: boolean;
    note?: string;
    updated_at: string;
  }>> {
    return this.request(`/v1/inspections/${id}/rooms/${roomNumber}/answers`);
  }

  exportInspectionUrl(id: string, format: 'html' | 'csv' = 'html'): string {
    return `${this.baseUrl}/v1/inspections/${id}/export${format === 'csv' ? '?format=csv' : ''}`;
  }

  async getInspectionTopFailures(
    id: string,
    limit: number = 10
  ): Promise<Array<{
    question_id: number;
    pregunta: string;
    problema: string;
    fails: number;
    oks: number;
    total_respuestas: number;
    fail_rate: number;
  }>> {
    return this.request(`/v1/inspections/${id}/analytics/top-failures?limit=${limit}`);
  }

  async getInspectionResolutionTimes(id: string): Promise<{
    avg_hours_to_conclude: number | null;
    items: Array<{
      habitacion: number;
      first_fail_at: string | null;
      concluded_at: string | null;
      hours_to_conclude: number | null;
    }>;
  }> {
    return this.request(`/v1/inspections/${id}/analytics/resolution-times`);
  }

  async getInspectionHeatmap(
    id: string,
    by: 'tower' | 'floor' = 'tower'
  ): Promise<{
    by: string;
    data: Array<{
      bucket: number;
      rooms: number;
      fails: number;
      fails_per_room: number;
    }>;
  }> {
    return this.request(`/v1/inspections/${id}/analytics/heatmap?by=${by}`);
  }

  async createAquaticElement(data: {
    nombre: string;
    ubicacion?: string;
    amenity_type_id?: number | null;
    tipo?: string | null;
    lon?: number | null;
    lat?: number | null;
    is_archived?: number;
    created_by?: number;
  }): Promise<{ id: string }> {
    return this.request('/v1/albercas/elements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAmenityTypes(): Promise<AmenityType[]> {
    return this.request('/v1/albercas/amenity-types');
  }

  async getAmenityType(id: number): Promise<AmenityType> {
    return this.request(`/v1/albercas/amenity-types/${id}`);
  }

  async getAmenityLimits(params?: {
    amenity_type_id?: number;
    param_key?: AnalysisParamKey;
  }): Promise<AmenityLimit[]> {
    const query = new URLSearchParams();
    if (params?.amenity_type_id) query.set('amenity_type_id', String(params.amenity_type_id));
    if (params?.param_key) query.set('param_key', params.param_key);
    return this.request(`/v1/albercas/amenity-limits?${query}`);
  }

  async createAmenityLimit(data: {
    amenity_type_id: number;
    param_key: AnalysisParamKey;
    min_value?: number | null;
    max_value?: number | null;
    comment?: string | null;
  }): Promise<{ id: number }> {
    return this.request('/v1/albercas/amenity-limits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAmenityLimit(id: number, data: {
    min_value?: number | null;
    max_value?: number | null;
    comment?: string | null;
  }): Promise<{ updated: number }> {
    return this.request(`/v1/albercas/amenity-limits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAmenityLimit(id: number): Promise<{ deleted: number }> {
    return this.request(`/v1/albercas/amenity-limits/${id}`, {
      method: 'DELETE',
    });
  }

  async getElementRequiredParams(elementId: string): Promise<{
    element_id: string;
    params: AnalysisParamKey[];
  }> {
    return this.request(`/v1/albercas/elements/${elementId}/params`);
  }

  async updateElementRequiredParams(elementId: string, params: AnalysisParamKey[]): Promise<{
    element_id: string;
    count: number;
  }> {
    return this.request(`/v1/albercas/elements/${elementId}/params`, {
      method: 'PUT',
      body: JSON.stringify({ params }),
    });
  }

  async getAquaticElements(params?: {
    q?: string;
    archived?: number;
    page?: number;
    pageSize?: number;
    withLast?: number;
  }): Promise<{
    page: number;
    pageSize: number;
    total: number;
    data: AquaticElement[];
  }> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.archived !== undefined) query.set('archived', String(params.archived));
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.withLast) query.set('withLast', String(params.withLast));
    return this.request(`/v1/albercas/elements?${query}`);
  }

  async getAquaticElement(id: string): Promise<AquaticElement> {
    return this.request(`/v1/albercas/elements/${id}`);
  }

  async updateAquaticElement(id: string, data: {
    nombre?: string;
    ubicacion?: string;
    amenity_type_id?: number | null;
    tipo?: string | null;
    lon?: number | null;
    lat?: number | null;
    is_archived?: number;
    updated_by?: number;
  }): Promise<{ updated: number }> {
    return this.request(`/v1/albercas/elements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAquaticElement(id: string): Promise<{ deleted: number }> {
    return this.request(`/v1/albercas/elements/${id}`, {
      method: 'DELETE',
    });
  }

  async createWaterAnalysis(data: {
    element_id: string;
    sampled_at?: string;
    cloro_libre?: number | null;
    cloro_total?: number | null;
    cloraminas?: number | null;
    acidoiso?: number | null;
    alcalinidad?: number | null;
    ph?: number | null;
    fe?: number | null;
    cu?: number | null;
    turbidez?: number | null;
    temperatura?: number | null;
    sdt?: number | null;
    conductividad?: number | null;
    dureza_calcio?: number | null;
    lsi?: number | null;
    rsi?: number | null;
    nitritos?: number | null;
    zinc?: number | null;
    t3dt22?: number | null;
    oxigeno_disuelto?: number | null;
    ivl?: number | null;
    comentario?: string | null;
    created_by?: number;
    images?: string[];
  }): Promise<{ id: string }> {
    return this.request('/v1/albercas/analyses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWaterAnalyses(params?: {
    element_id?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
    orderDir?: 'asc' | 'desc';
    withImages?: number;
  }): Promise<{
    page: number;
    pageSize: number;
    total: number;
    data: WaterAnalysis[];
  }> {
    const query = new URLSearchParams();
    if (params?.element_id) query.set('element_id', params.element_id);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.orderDir) query.set('orderDir', params.orderDir);
    if (params?.withImages !== undefined) query.set('withImages', String(params.withImages));
    return this.request(`/v1/albercas/analyses?${query}`);
  }

  async getWaterAnalysis(id: string): Promise<WaterAnalysisDetail> {
    return this.request(`/v1/albercas/analyses/${id}`);
  }

  async updateWaterAnalysis(id: string, data: Partial<{
    sampled_at: string;
    cloro_libre: number | null;
    cloro_total: number | null;
    cloraminas: number | null;
    acidoiso: number | null;
    alcalinidad: number | null;
    ph: number | null;
    fe: number | null;
    cu: number | null;
    turbidez: number | null;
    temperatura: number | null;
    sdt: number | null;
    conductividad: number | null;
    dureza_calcio: number | null;
    lsi: number | null;
    rsi: number | null;
    nitritos: number | null;
    zinc: number | null;
    t3dt22: number | null;
    oxigeno_disuelto: number | null;
    ivl: number | null;
    comentario: string | null;
  }>): Promise<{ updated: number }> {
    return this.request(`/v1/albercas/analyses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addWaterAnalysisImage(analysisId: string, url: string): Promise<{ id: number }> {
    return this.request(`/v1/albercas/analyses/${analysisId}/images`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async deleteWaterAnalysis(id: string): Promise<void> {
    return this.request(`/v1/albercas/analyses/${id}`, {
      method: 'DELETE',
    });
  }

  async getLastWaterAnalysis(elementId: string): Promise<WaterAnalysis | null> {
    return this.request(`/v1/albercas/elements/${elementId}/last`);
  }

  async getWaterTimeseries(params: {
    element_id: string;
    param: WaterParameter;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<{
    element_id: string;
    param: string;
    data: Array<{ sampled_at: string; value: number | null }>;
  }> {
    const query = new URLSearchParams();
    query.set('element_id', params.element_id);
    query.set('param', params.param);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.limit) query.set('limit', String(params.limit));
    return this.request(`/v1/albercas/analytics/timeseries?${query}`);
  }

  getWaterAnalysesExportUrl(params?: {
    format?: 'csv' | 'html';
    element_id?: string;
    from?: string;
    to?: string;
  }): string {
    const query = new URLSearchParams();
    if (params?.format) query.set('format', params.format);
    if (params?.element_id) query.set('id', params.element_id);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return `${this.baseUrl}/v1/albercas/analyses/export?${query}`;
  }





}

export const api = new ApiClient(API_BASE_URL);
