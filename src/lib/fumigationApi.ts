const API_BASE_URL = 'https://bsupers.fly.dev/v1/fumigation';

export type StationType = 'ROEDOR' | 'UV' | 'OTRO';
export type PhysicalCondition = 'BUENA' | 'REGULAR' | 'MALA';

export interface BaitStation {
  id: number;
  code: string;
  name: string;
  type: StationType;
  utm_x: number | null;
  utm_y: number | null;
  installed_at: string | null;
  is_active: number;
  created_at: string;
  lastInspection?: StationInspection | null;
}

export interface StationInspection {
  id: number;
  station_id: number;
  station_code?: string;
  station_name?: string;
  inspected_at: string;
  has_bait: number;
  bait_replaced: number;
  location_ok: number;
  lat: number | null;
  lng: number | null;
  physical_condition: PhysicalCondition;
  photo_url: string | null;
  observations: string | null;
  inspector_nombre: string | null;
  inspector_empresa: string | null;
}

export interface CreateStationParams {
  code: string;
  name: string;
  type: StationType;
  utm_x?: number | null;
  utm_y?: number | null;
  installed_at?: string | null;
  is_active?: boolean;
}

export interface UpdateStationParams extends CreateStationParams {}

export interface CreateInspectionParams {
  inspected_at?: string;
  inspector_nombre: string;
  inspector_empresa?: string;
  physical_condition: PhysicalCondition;
  has_bait: boolean;
  bait_replaced: boolean;
  location_ok?: boolean;
  lat?: number | null;
  lng?: number | null;
  photo_url?: string;
  observations?: string;
}

export interface UpdateInspectionParams {
  inspected_at?: string;
  inspector_nombre?: string;
  inspector_empresa?: string;
  physical_condition?: PhysicalCondition;
  has_bait?: boolean;
  bait_replaced?: boolean;
  location_ok?: boolean;
  lat?: number | null;
  lng?: number | null;
  photo_url?: string;
  observations?: string;
}

export type CycleStatus = 'ABIERTO' | 'CERRADO';
export type RoomFumigationStatus = 'PENDIENTE' | 'COMPLETADA' | 'NO_APLICA';
export type ServiceType = 'PREVENTIVO' | 'CORRECTIVO' | 'NEBULIZACION' | 'ASPERSION' | 'GEL' | 'OTRO';

export interface FumigationCycle {
  id: number;
  label: string;
  period_start: string;
  period_end: string;
  hotel_code: string;
  status: CycleStatus;
  created_at: string;
  total_rooms: number;
  pending_rooms: number;
  completed_rooms: number;
}

export interface RoomFumigation {
  id: number;
  cycle_id: number;
  room_id: number;
  room_number: string;
  area: string | null;
  status: RoomFumigationStatus;
  fumigated_at: string | null;
  service_type: ServiceType;
  utm_x: number | null;
  utm_y: number | null;
  fumigator_id: number | null;
  fumigator_nombre: string | null;
  fumigator_empresa: string | null;
  photos: string[];
  observations: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCycleParams {
  period_start?: string;
  period_end?: string;
  label?: string;
  hotel_code?: string;
  year?: number;
  month?: number;
}

export interface UpdateCycleParams {
  label?: string;
  period_start?: string;
  period_end?: string;
  status?: CycleStatus;
}

export interface UpdateRoomFumigationParams {
  status?: RoomFumigationStatus;
  fumigated_at?: string;
  service_type?: ServiceType;
  utm_x?: number | null;
  utm_y?: number | null;
  fumigator_nombre?: string;
  fumigator_empresa?: string;
  photos?: string[];
  observations?: string;
}

class FumigationAPI {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'unknown_error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getStations(params?: {
    type?: StationType;
    active?: boolean;
  }): Promise<BaitStation[]> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.active !== undefined) searchParams.append('active', params.active ? '1' : '0');

    const query = searchParams.toString();
    return this.request(`/stations${query ? '?' + query : ''}`);
  }

  async getStation(id: number): Promise<BaitStation> {
    return this.request(`/stations/${id}`);
  }

  async createStation(data: CreateStationParams): Promise<{ id: number; code: string; name: string; type: string }> {
    return this.request('/stations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStation(id: number, data: UpdateStationParams): Promise<{ ok: boolean }> {
    return this.request(`/stations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStation(id: number): Promise<{ ok: boolean }> {
    return this.request(`/stations/${id}`, {
      method: 'DELETE',
    });
  }

  async getInspections(params?: {
    station_id?: number;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<StationInspection[]> {
    const searchParams = new URLSearchParams();
    if (params?.station_id) searchParams.append('station_id', params.station_id.toString());
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/inspections${query ? '?' + query : ''}`);
  }

  async getInspection(id: number): Promise<StationInspection> {
    return this.request(`/inspections/${id}`);
  }

  async getStationInspections(stationId: number, params?: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<StationInspection[]> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/stations/${stationId}/inspections${query ? '?' + query : ''}`);
  }

  async createInspection(stationId: number, data: CreateInspectionParams): Promise<{ id: number }> {
    return this.request(`/stations/${stationId}/inspections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInspection(id: number, data: UpdateInspectionParams): Promise<{ ok: boolean }> {
    return this.request(`/inspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInspection(id: number): Promise<{ ok: boolean }> {
    return this.request(`/inspections/${id}`, {
      method: 'DELETE',
    });
  }

  async getCycles(params?: {
    status?: CycleStatus;
    year?: number;
    month?: number;
  }): Promise<FumigationCycle[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.month) searchParams.append('month', params.month.toString());

    const query = searchParams.toString();
    return this.request(`/cycles${query ? '?' + query : ''}`);
  }

  async getCycle(id: number): Promise<FumigationCycle> {
    return this.request(`/cycles/${id}`);
  }

  async createCycle(data: CreateCycleParams): Promise<{
    id: number;
    label: string;
    period_start: string;
    period_end: string;
    hotel_code: string;
    total_rooms: number;
  }> {
    return this.request('/cycles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCycle(id: number, data: UpdateCycleParams): Promise<{ ok: boolean }> {
    return this.request(`/cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCycle(id: number): Promise<{ ok: boolean }> {
    return this.request(`/cycles/${id}`, {
      method: 'DELETE',
    });
  }

  async getCycleRooms(cycleId: number, params?: {
    status?: RoomFumigationStatus;
    from?: string;
    to?: string;
  }): Promise<RoomFumigation[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);

    const query = searchParams.toString();
    return this.request(`/cycles/${cycleId}/rooms${query ? '?' + query : ''}`);
  }

  async getRoomFumigation(id: number): Promise<RoomFumigation> {
    return this.request(`/room-fumigations/${id}`);
  }

  async updateRoomFumigation(id: number, data: UpdateRoomFumigationParams): Promise<{ ok: boolean }> {
    return this.request(`/room-fumigations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const fumigationApi = new FumigationAPI();
