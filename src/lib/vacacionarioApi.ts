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
  photo_url: string | null;
  birthday: string | null;
  department: string;
  position: string | null;
  hierarchy_level: number;
  manager_employee_number: string | null;
  is_area_executive: boolean;
  hierarchy_role: string;
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
  manager?: { id: string; employee_number: string; full_name: string; department: string; position: string } | null;
}

export interface VacBalance {
  employee: VacEmployee;
  as_of: string;
  legal_basis: { country: string; law: string; articles: string[]; vacation_premium_min_percent: number };
  completed_service_years: number;
  next_anniversary_date: string;
  next_anniversary_days: number;
  policy: { accrual_mode: string; can_take_proportional_days_before_anniversary: boolean; formula: string };
  balance_start_date: string;
  accrual_anchor_date: string;
  initial_balance_cutoff_date: string;
  initial_balance_days: number;
  accrued_after_balance_start_days: number;
  accrued_proportional_days: number;
  accrued_after_accrual_anchor_days: number;
  legal_anniversary_days_after_balance_start: number;
  legal_anniversary_days_after_accrual_anchor: number;
  adjustment_days: number;
  earned_days: number;
  used_days: number;
  taken_days: number;
  pending_requested_days: number;
  future_approved_days: number;
  available_days: number;
  projected_available_days: number;
  proportional_accrual: VacProportionalAccrual;
  periods: VacPeriod[];
}

export interface VacProportionalAccrual {
  from: string;
  to: string;
  proportional_days: number;
  segments: VacAccrualSegment[];
}

export interface VacAccrualSegment {
  service_year: number;
  period_start: string;
  period_end: string;
  legal_days_at_anniversary: number;
  period_days: number;
  elapsed_days_in_range: number;
  proportional_days: number;
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
  calendar_days: number;
  rest_days_crossed: number;
  holiday_days_crossed: number;
  rest_weekdays: string[] | null;
  include_weekends: boolean;
  include_rest_days: boolean;
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

export interface VacAccrualInfo {
  employee: VacEmployee;
  as_of: string;
  policy_note: string;
  completed_service_years: number;
  balance_start_date: string;
  accrual_anchor_date: string;
  initial_balance_cutoff_date: string;
  since_initial_balance_anchor: VacProportionalAccrual;
  current_service_year: number;
  current_service_period: {
    start_date: string;
    end_date: string;
    legal_days_at_next_anniversary: number;
    period_days: number;
    elapsed_days: number;
    proportional_days_generated: number;
    remaining_proportional_days: number;
  };
  calendar_year: {
    year: number;
    from: string;
    to: string;
    proportional_days: number;
    segments: VacAccrualSegment[];
  };
}

export interface VacDayCalculation {
  start_date: string;
  end_date: string;
  include_rest_days: boolean;
  include_weekends: boolean;
  include_holidays: boolean;
  rest_weekdays: string[] | null;
  calendar_days: number;
  rest_days_crossed: number;
  holiday_days_crossed: number;
  requested_days: number;
}

export interface VacTakenSummary {
  employee: VacEmployee;
  from: string;
  to: string;
  taken_days: number;
  requests: VacRequest[];
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

  getDirectory(opts?: { active?: boolean; department?: string }) {
    const params = new URLSearchParams();
    if (opts?.active !== undefined) params.set('active', String(opts.active));
    if (opts?.department) params.set('department', opts.department);
    return apiGet<VacEmployee[]>(`/employees/directory?${params}`);
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

  getAccrual(employeeId: string, asOf?: string, year?: number) {
    const params = new URLSearchParams();
    if (asOf) params.set('as_of', asOf);
    if (year) params.set('year', String(year));
    return apiGet<VacAccrualInfo>(`/employees/${employeeId}/accrual?${params}`);
  },

  getTakenSummary(employeeId: string, from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return apiGet<VacTakenSummary>(`/employees/${employeeId}/taken-summary?${params}`);
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

  calculateDays(data: { employee_id: string; start_date: string; end_date: string; include_rest_days?: boolean; include_holidays?: boolean; rest_weekdays?: string[] | null }) {
    return apiSend<VacDayCalculation>('/requests/calculate-days', 'POST', data);
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
