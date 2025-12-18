const API_BASE_URL = 'https://bsupers.fly.dev';

export type InspectionRoomStatus =
  | 'SIN_INSPECCIONAR'
  | 'INCOMPLETA'
  | 'CON_FALLAS'
  | 'SIN_FALLAS';

export type InspectionAnswer = 'OK' | 'FAIL' | 'NA' | null;

export type IssueStatus = 'PENDIENTE' | 'RESUELTO';

export interface InspectionCycle {
  id: number;
  year: number;
  month: number;
  nombre: string;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  totalRooms?: number;
  roomsSinInspeccionar?: number;
  roomsIncompletas?: number;
  roomsConFallas?: number;
  roomsSinFallas?: number;
  porcentajeInspeccionadas?: number;
  porcentajeSinFallas?: number;
  pendientes?: number;
  resueltas?: number;
}

export interface InspectionQuestion {
  id: number;
  pregunta: string;
  problema: string;
  orden: number;
}

export interface Room {
  id: number;
  numero: number;
  area: string | null;
}

export interface InspectionRoomInCycle {
  roomCycleId: number;
  roomId: number;
  roomNumber: number;
  area: string | null;
  status: InspectionRoomStatus;
  inspectorName: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastAutosaveAt: string | null;
}

export interface InspectionRoomDetail {
  meta: {
    roomCycleId: number;
    status: InspectionRoomStatus;
    inspectorName: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    lastLat: number | null;
    lastLng: number | null;
    roomId: number;
    roomNumber: number;
    area: string | null;
  };
  questions: Array<{
    questionId: number;
    pregunta: string;
    problema: string;
    orden: number;
    answer: InspectionAnswer;
    comment: string | null;
    photoUrls: string[];
  }>;
}

export interface InspectionIssue {
  id: number;
  status: IssueStatus;
  comment: string | null;
  photoMainUrl: string | null;
  cycleId: number;
  year: number;
  month: number;
  roomId: number;
  roomNumber: number;
  area: string | null;
  questionId: number;
  pregunta: string;
  problema: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionComment: string | null;
}

class InspectionsApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getQuestions(): Promise<InspectionQuestion[]> {
    return this.request('/v1/inspections/questions');
  }

  async getRooms(): Promise<Room[]> {
    return this.request('/v1/inspections/rooms');
  }

  async getCycles(): Promise<InspectionCycle[]> {
    return this.request('/v1/inspections/cycles/summary');
  }

  async createCycle(data: {
    nombre: string;
    year: number;
    month: number;
    copyPendingFromCycleId?: number;
  }): Promise<{ id: number; year: number; month: number; nombre: string }> {
    return this.request('/v1/inspections/cycles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCycleRooms(cycleId: number): Promise<InspectionRoomInCycle[]> {
    return this.request(`/v1/inspections/cycles/${cycleId}/rooms`);
  }

  async getRoomDetail(cycleId: number, roomId: number): Promise<InspectionRoomDetail> {
    return this.request(`/v1/inspections/cycles/${cycleId}/rooms/${roomId}`);
  }

  async startInspection(
    cycleId: number,
    roomId: number,
    data: {
      inspectorName?: string;
      startedAt?: string;
      lat?: number;
      lng?: number;
    }
  ): Promise<{ roomCycleId: number }> {
    return this.request(`/v1/inspections/cycles/${cycleId}/rooms/${roomId}/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async autosaveInspection(
    cycleId: number,
    roomId: number,
    data: {
      inspectorName?: string;
      startedAt?: string;
      lat?: number;
      lng?: number;
      answers?: Array<{
        questionId: number;
        answer?: InspectionAnswer;
        comment?: string | null;
        photoUrls?: string[];
      }>;
    }
  ): Promise<{ roomCycleId: number }> {
    return this.request(`/v1/inspections/cycles/${cycleId}/rooms/${roomId}/autosave`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async finishInspection(
    cycleId: number,
    roomId: number,
    data: {
      inspectorName?: string;
      startedAt?: string;
      finishedAt?: string;
      lat?: number;
      lng?: number;
      answers: Array<{
        questionId: number;
        answer?: InspectionAnswer;
        comment?: string | null;
        photoUrls?: string[];
      }>;
    }
  ): Promise<{ roomCycleId: number; status: InspectionRoomStatus }> {
    return this.request(`/v1/inspections/cycles/${cycleId}/rooms/${roomId}/finish`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIssues(params?: {
    status?: IssueStatus;
    cycleId?: number;
    roomNumber?: number;
  }): Promise<InspectionIssue[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.cycleId) searchParams.append('cycleId', params.cycleId.toString());
    if (params?.roomNumber) searchParams.append('roomNumber', params.roomNumber.toString());

    const query = searchParams.toString();
    return this.request(`/v1/inspections/issues${query ? `?${query}` : ''}`);
  }

  async updateIssue(
    issueId: number,
    data: {
      status: IssueStatus;
      resolvedBy?: string;
      resolutionComment?: string;
    }
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/inspections/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const inspectionsApi = new InspectionsApiClient(API_BASE_URL);
