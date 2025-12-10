const API_BASE_URL = 'https://bsupers.fly.dev';

export type WorkingOrderStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
export type WorkingOrderSource = 'MEDALLIA' | 'MANUAL';
export type WorkingOrderSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WorkingOrderListItem {
  id: string;
  summary: string;
  status: WorkingOrderStatus;
  severity: WorkingOrderSeverity;
  category: string | null;
  source: WorkingOrderSource;
  stay_from: string;
  stay_to: string;
  created_at: string;
  updated_at: string;
  note_id: string | null;
  assigned_to: number | null;
  assigned_nombre: string | null;
  room_id: number;
  room_number: number;
}

export interface WorkingOrderDetail extends WorkingOrderListItem {
  detail: string | null;
  has_pending_next: number;
  created_by: number | null;
  resolved_at: string | null;
  images: Array<{ id: number; url: string; created_at: string }>;
  comments: Array<{
    id: number;
    author_id: number | null;
    author_nombre: string | null;
    body: string;
    created_at: string;
  }>;
  statusLogs: Array<{
    id: number;
    status: WorkingOrderStatus;
    note: string | null;
    performed_by: number | null;
    performed_nombre: string | null;
    created_at: string;
  }>;
}

export interface WorkingOrderSummary {
  open_cnt: number;
  assigned_cnt: number;
  inprog_cnt: number;
  resolved_cnt: number;
  dismissed_cnt: number;
}

export interface WorkingOrderListResponse {
  page: number;
  pageSize: number;
  total: number;
  data: WorkingOrderListItem[];
  summary?: WorkingOrderSummary;
}

export interface CreateWorkingOrderParams {
  roomNumber?: number;
  roomId?: number;
  stay_from: string;
  stay_to: string;
  summary: string;
  detail?: string;
  source?: WorkingOrderSource;
  category?: string;
  severity?: WorkingOrderSeverity;
  assigned_to?: number;
  created_by?: number;
  images?: string[];
  initial_comment?: string;
  convertToNote?: boolean;
  noteSupervisorId?: number;
  noteFecha?: string;
}

export interface UpdateWorkingOrderParams {
  summary?: string;
  detail?: string;
  category?: string;
  severity?: WorkingOrderSeverity;
  status?: WorkingOrderStatus;
  assigned_to?: number | null;
  has_pending_next?: boolean;
  performed_by?: number;
  status_note?: string;
}

export interface ListWorkingOrdersParams {
  q?: string;
  status?: WorkingOrderStatus;
  roomNumber?: number;
  from?: string;
  to?: string;
  assigned_to?: number;
  severity?: WorkingOrderSeverity;
  source?: WorkingOrderSource;
  page?: number;
  pageSize?: number;
  withSummary?: boolean;
}

export interface HeatmapDataPoint {
  room?: number;
  tower?: number;
  floor?: number;
  total: number;
}

export interface HeatmapResponse {
  by: 'room' | 'tower' | 'floor';
  data: HeatmapDataPoint[];
}

class WorkingOrdersAPI {
  private async request<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
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

  async list(params: ListWorkingOrdersParams = {}): Promise<WorkingOrderListResponse> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append('q', params.q);
    if (params.status) searchParams.append('status', params.status);
    if (params.roomNumber) searchParams.append('roomNumber', params.roomNumber.toString());
    if (params.from) searchParams.append('from', params.from);
    if (params.to) searchParams.append('to', params.to);
    if (params.assigned_to) searchParams.append('assigned_to', params.assigned_to.toString());
    if (params.severity) searchParams.append('severity', params.severity);
    if (params.source) searchParams.append('source', params.source);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params.withSummary) searchParams.append('withSummary', '1');

    return this.request(`/v1/working-orders?${searchParams}`);
  }

  async getById(id: string): Promise<WorkingOrderDetail> {
    return this.request(`/v1/working-orders/${id}`);
  }

  async create(data: CreateWorkingOrderParams): Promise<{ id: string }> {
    return this.request('/v1/working-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(id: string, data: UpdateWorkingOrderParams): Promise<{ ok: boolean }> {
  
    return this.request(`/v1/working-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request(`/v1/working-orders/${id}`, {
      method: 'DELETE',
    });
  }

  async addComment(id: string, body: string, authorId?: number): Promise<{ id: number }> {
    return this.request(`/v1/working-orders/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ authorId, body }),
    });
  }

  async getComments(
    id: string,
    params?: { limit?: number; cursor?: number }
  ): Promise<{ data: WorkingOrderDetail['comments']; nextCursor: number | null }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.cursor) searchParams.append('cursor', params.cursor.toString());

    return this.request(`/v1/working-orders/${id}/comments?${searchParams}`);
  }

  async addImage(id: string, url: string): Promise<{ id: number }> {
    return this.request(`/v1/working-orders/${id}/images`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async convertToNote(id: string, supervisorId: number, fecha?: string): Promise<{ note_id: string }> {
    return this.request(`/v1/working-orders/${id}/convert-to-note`, {
      method: 'POST',
      body: JSON.stringify({ supervisorId, fecha }),
    });
  }

  async getStatusLogs(id: string): Promise<WorkingOrderDetail['statusLogs']> {
    return this.request(`/v1/working-orders/${id}/status-logs`);
  }

  async getHeatmap(params: {
    by: 'room' | 'tower' | 'floor';
    from?: string;
    to?: string;
  }): Promise<HeatmapResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('by', params.by);
    if (params.from) searchParams.append('from', params.from);
    if (params.to) searchParams.append('to', params.to);

    return this.request(`/v1/working-orders/analytics/heatmap?${searchParams}`);
  }

  getExportUrl(format: 'html' | 'csv', params?: { from?: string; to?: string; status?: WorkingOrderStatus }): string {
    const searchParams = new URLSearchParams();
    searchParams.append('format', format);
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.status) searchParams.append('status', params.status);

    return `${API_BASE_URL}/v1/working-orders/export?${searchParams}`;
  }

  async syncNoteStatus(
    woId: string,
    noteEstado: 0 | 1 | 2,
    performedBy?: number,
    comment?: string
  ): Promise<void> {
    await this.request(`/v1/working-orders/${woId}/note-webhook/status`, {
      method: 'POST',
      body: JSON.stringify({
        note_estado: noteEstado,
        performed_by: performedBy ?? null,
        comment: comment ?? null,
      }),
    });
  }

  async getLinkedNote(woId: string): Promise<{ note: any | null }> {
    return this.request(`/v1/working-orders/${woId}/linked-note`);
  }

  async assignWithNote(
    woId: string,
    supervisorId: number,
    note: string,
    fecha: string
  ): Promise<{ note_id: string }> {
    return this.request(`/v1/working-orders/${woId}/convert-to-note`, {
      method: 'POST',
      body: JSON.stringify({
        supervisorId,
        fecha,
        initial_comment: note || undefined
      }),
    });
  }

  async resolveWorkingOrder(
    woId: string,
    performedBy?: number,
    statusNote?: string
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/working-orders/${woId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'RESOLVED',
        performed_by: performedBy,
        status_note: statusNote
      }),
    });
  }

  async dismissWorkingOrder(
    woId: string,
    performedBy?: number,
    statusNote?: string
  ): Promise<{ ok: boolean }> {
    return this.request(`/v1/working-orders/${woId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'DISMISSED',
        performed_by: performedBy,
        status_note: statusNote
      }),
    });
  }
}

export const workingOrdersAPI = new WorkingOrdersAPI();
