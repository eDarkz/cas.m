const VAC_API = 'https://bsupers.fly.dev/v1/vacacionario';

async function apiGet<T = any>(path: string): Promise<T> {
  const response = await fetch(`${VAC_API}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Vacacionario API ${response.status}`);
  return response.json();
}

async function apiSend<T = any>(path: string, method: string, body?: any): Promise<T> {
  const response = await fetch(`${VAC_API}${path}`, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Vacacionario API ${response.status}: ${await response.text()}`);
  return response.json();
}

export interface VacEmployee {
  id: string;
  employee_number: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string;
  position: string | null;
  hire_date: string;
  balance_start_date: string;
  initial_balance_days: number;
  work_monday: boolean;
  work_tuesday: boolean;
  work_wednesday: boolean;
  work_thursday: boolean;
  work_friday: boolean;
  work_saturday: boolean;
  work_sunday: boolean;
  active: boolean;
  notes: string | null;
  metadata: Record<string, any>;
  balance?: VacBalance;
}

export interface VacBalance {
  employee: VacEmployee;
  as_of: string;
  completed_service_years: number;
  next_anniversary_date: string;
  next_anniversary_days: number;
  initial_balance_days: number;
  accrued_after_balance_start_days: number;
  adjustment_days: number;
  earned_days: number;
  used_days: number;
  pending_requested_days: number;
  future_approved_days: number;
  available_days: number;
  projected_available_days: number;
  periods: VacPeriod[];
}

export interface VacPeriod {
  service_year: number;
  anniversary_date: string;
  legal_days: number;
  included_in_balance: boolean;
}

export interface VacRequest {
  id: string;
  employee_id: string;
  full_name?: string;
  department?: string;
  position?: string;
  status: 'DRAFT' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'TAKEN';
  start_date: string;
  end_date: string;
  return_date: string | null;
  requested_days: number;
  include_weekends: boolean;
  include_holidays: boolean;
  reason: string | null;
  notes: string | null;
  color: string | null;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  metadata: Record<string, any>;
}

export interface VacCalendarEvent {
  id: string;
  source: string;
  request_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  position: string | null;
  title: string;
  start: string;
  end: string;
  return_date: string | null;
  status: string;
  requested_days: number;
  color: string | null;
  reason: string | null;
  notes: string | null;
}

export interface VacAdjustment {
  id: string;
  employee_id: string;
  adjustment_date: string;
  days: number;
  type: string;
  description: string;
  created_by: string | null;
  metadata: Record<string, any>;
}

export interface VacHoliday {
  id: string;
  holiday_date: string;
  name: string;
  department: string | null;
  recurring: boolean;
  active: boolean;
  metadata: Record<string, any>;
}

export interface VacDashboard {
  as_of: string;
  employees: { total: number; active: number; inactive: number };
  requests: { requested: number; approved: number; taken: number; rejected: number; cancelled: number };
  upcoming: VacRequest[];
}

export const vacacionarioApi = {
  getDashboard(asOf?: string, department?: string) {
    const params = new URLSearchParams();
    if (asOf) params.set('as_of', asOf);
    if (department) params.set('department', department);
    return apiGet<VacDashboard>(`/dashboard?${params}`);
  },

  getEntitlementTable() {
    return apiGet<{ service_year: number; vacation_days: number }[]>('/entitlement-table');
  },

  getCalendar(from: string, to: string, filters?: { employee_id?: string; department?: string; status?: string }) {
    const params = new URLSearchParams({ from, to });
    if (filters?.employee_id) params.set('employee_id', filters.employee_id);
    if (filters?.department) params.set('department', filters.department);
    if (filters?.status) params.set('status', filters.status);
    return apiGet<VacCalendarEvent[]>(`/calendar?${params}`);
  },

  getEmployees(opts?: { active?: boolean; department?: string; q?: string; include_balance?: boolean; as_of?: string }) {
    const params = new URLSearchParams();
    if (opts?.active !== undefined) params.set('active', String(opts.active));
    if (opts?.department) params.set('department', opts.department);
    if (opts?.q) params.set('q', opts.q);
    if (opts?.include_balance) params.set('include_balance', 'true');
    if (opts?.as_of) params.set('as_of', opts.as_of);
    return apiGet<VacEmployee[]>(`/employees?${params}`);
  },

  getEmployee(id: string, includeBalance = false, asOf?: string) {
    const params = new URLSearchParams();
    if (includeBalance) params.set('include_balance', 'true');
    if (asOf) params.set('as_of', asOf);
    return apiGet<VacEmployee>(`/employees/${id}?${params}`);
  },

  createEmployee(data: any) {
    return apiSend<VacEmployee>('/employees', 'POST', data);
  },

  updateEmployee(id: string, data: any) {
    return apiSend<VacEmployee>(`/employees/${id}`, 'PATCH', data);
  },

  archiveEmployee(id: string, active: boolean) {
    return apiSend(`/employees/${id}/archive`, 'PATCH', { active });
  },

  deleteEmployee(id: string) {
    return apiSend(`/employees/${id}`, 'DELETE');
  },

  getBalance(employeeId: string, asOf?: string) {
    const params = asOf ? `?as_of=${asOf}` : '';
    return apiGet<VacBalance>(`/employees/${employeeId}/balance${params}`);
  },

  getLedger(employeeId: string, from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return apiGet<any>(`/employees/${employeeId}/ledger?${params}`);
  },

  getRequests(opts?: { employee_id?: string; department?: string; status?: string; from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (opts?.employee_id) params.set('employee_id', opts.employee_id);
    if (opts?.department) params.set('department', opts.department);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.from) params.set('from', opts.from);
    if (opts?.to) params.set('to', opts.to);
    return apiGet<VacRequest[]>(`/requests?${params}`);
  },

  createRequest(data: any) {
    return apiSend<VacRequest>('/requests', 'POST', data);
  },

  updateRequest(id: string, data: any) {
    return apiSend<VacRequest>(`/requests/${id}`, 'PATCH', data);
  },

  updateRequestStatus(id: string, data: { status: string; approved_by?: string; rejection_reason?: string; notes?: string }) {
    return apiSend<VacRequest>(`/requests/${id}/status`, 'PATCH', data);
  },

  deleteRequest(id: string) {
    return apiSend(`/requests/${id}`, 'DELETE');
  },

  getAdjustments(opts?: { employee_id?: string; type?: string }) {
    const params = new URLSearchParams();
    if (opts?.employee_id) params.set('employee_id', opts.employee_id);
    if (opts?.type) params.set('type', opts.type);
    return apiGet<VacAdjustment[]>(`/adjustments?${params}`);
  },

  createAdjustment(data: any) {
    return apiSend<VacAdjustment>('/adjustments', 'POST', data);
  },

  updateAdjustment(id: string, data: any) {
    return apiSend<VacAdjustment>(`/adjustments/${id}`, 'PATCH', data);
  },

  deleteAdjustment(id: string) {
    return apiSend(`/adjustments/${id}`, 'DELETE');
  },

  getHolidays(opts?: { from?: string; to?: string; department?: string; active?: boolean }) {
    const params = new URLSearchParams();
    if (opts?.from) params.set('from', opts.from);
    if (opts?.to) params.set('to', opts.to);
    if (opts?.department) params.set('department', opts.department);
    if (opts?.active !== undefined) params.set('active', String(opts.active));
    return apiGet<VacHoliday[]>(`/holidays?${params}`);
  },

  createHoliday(data: any) {
    return apiSend<VacHoliday>('/holidays', 'POST', data);
  },

  updateHoliday(id: string, data: any) {
    return apiSend<VacHoliday>(`/holidays/${id}`, 'PATCH', data);
  },

  deleteHoliday(id: string) {
    return apiSend(`/holidays/${id}`, 'DELETE');
  },
};
