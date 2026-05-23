const API_BASE_URL = 'https://bsupers.fly.dev';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlsCategory = 'FIRE' | 'LIFE_SAFETY' | 'ELECTRICAL' | 'STRUCTURAL' | 'GENERAL';
export type RecurrenceType = 'ON_DEMAND' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'CUSTOM_DAYS';
export type ScoringMethod = 'PERCENT' | 'POINTS' | 'CRITICAL_FAIL';
export type ResponseType = 'PASS_FAIL_NA' | 'YES_NO_NA' | 'OK_FAIL' | 'NUMBER' | 'TEXT' | 'SELECT' | 'MULTI_SELECT' | 'RATING' | 'DATE' | 'TIME';
export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RequirePhoto = 'NEVER' | 'ALWAYS' | 'ON_FAIL' | 'ON_PASS' | 'ON_NA';
export type RunStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AnswerStatus = 'PASS' | 'FAIL' | 'NA' | 'INFO';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FlsRecurrence {
  type: RecurrenceType;
  interval_days: number | null;
  grace_days: number;
  start_date: string;
  due_time: string | null;
}

export interface FlsScoring {
  method: ScoringMethod;
  passing_score: number;
}

export interface FlsQuestionOption {
  value: string;
  label: string;
}

export interface FlsQuestion {
  id?: string;
  checklist_id?: string;
  section: string;
  text: string;
  help_text?: string;
  response_type: ResponseType;
  required: boolean;
  weight: number;
  criticality: Criticality;
  expected_answer?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  options?: FlsQuestionOption[] | null;
  require_photo: RequirePhoto;
  order: number;
}

export interface FlsTemplate {
  id: string;
  code: string;
  title: string;
  description?: string;
  category: FlsCategory;
  location_scope?: string;
  asset_type?: string;
  recurrence: FlsRecurrence;
  estimated_minutes?: number;
  scoring: FlsScoring;
  requires_signature: boolean;
  active: boolean;
  created_by: number;
  metadata?: Record<string, unknown>;
  questions?: FlsQuestion[];
  questions_count?: number;
  next_due_at?: string | null;
  last_run_at?: string | null;
  last_inspector_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FlsRunAnswer {
  question_id: string;
  answer_value: string;
  numeric_value?: number | null;
  answer_status: AnswerStatus;
  comment?: string;
  photo_urls?: string[];
  answered_by: number;
}

export interface FlsRun {
  id: string;
  checklist_id: string;
  checklist_title?: string;
  checklist_code?: string;
  scheduled_for?: string;
  started_at?: string;
  completed_at?: string;
  status: RunStatus;
  inspector_id: number;
  inspector_name: string;
  target_area?: string;
  target_room_id?: number | null;
  target_room_number?: string | null;
  target_asset_code?: string;
  notes?: string;
  score?: number | null;
  passed?: boolean | null;
  signature_url?: string | null;
  answers?: FlsRunAnswer[];
  questions?: FlsQuestion[];
  created_by: number;
  created_at?: string;
}

export interface FlsIssue {
  id: string;
  run_id: string;
  question_id?: string;
  checklist_id?: string;
  checklist_title?: string;
  question_text?: string;
  description?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  due_at?: string | null;
  closed_by?: number | null;
  close_comment?: string | null;
  photo_urls?: string[];
  target_area?: string;
  target_asset_code?: string;
  created_at?: string;
  updated_at?: string;
}

export type ScheduleType = 'ONE_TIME' | 'RECURRING';
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
export type ScheduleExceptionAction = 'SKIP' | 'RESCHEDULE' | 'NOTE';

export interface FlsScheduleRecurrence {
  type: RecurrenceType;
  interval_days?: number | null;
  weekly_days?: Weekday[];
  day_of_month?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  grace_days?: number;
  due_time?: string | null;
}

export interface FlsSchedule {
  id: string;
  checklist_id: string;
  checklist_title?: string;
  checklist_code?: string;
  title?: string | null;
  description?: string | null;
  schedule_type: ScheduleType;
  scheduled_for?: string | null;
  recurrence: FlsScheduleRecurrence;
  timezone: string;
  inspector_id?: number | null;
  inspector_name?: string | null;
  inspector_nombre?: string | null;
  target_area?: string | null;
  target_room_id?: number | null;
  room_number?: string | null;
  target_asset_code?: string | null;
  auto_generate: boolean;
  generate_days_ahead: number;
  color?: string | null;
  active: boolean;
  next_run_at?: string | null;
  last_run_id?: string | null;
  last_generated_at?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface FlsCalendarEvent {
  id: string;
  source: 'RUN' | 'SCHEDULE';
  run_id?: string | null;
  schedule_id?: string | null;
  checklist_id: string;
  checklist_title?: string;
  checklist_code?: string;
  title?: string;
  start: string;
  end?: string;
  status: string;
  color?: string | null;
  inspector_id?: number | null;
  inspector_name?: string | null;
  target_area?: string | null;
  target_room_id?: number | null;
  room_number?: string | null;
  target_asset_code?: string | null;
  score?: number | null;
  passed?: boolean | null;
  schedule_type?: string;
  recurrence_type?: string;
  original_start?: string | null;
  exception?: unknown | null;
}

export interface FlsScheduleException {
  id: string;
  schedule_id: string;
  occurrence_at: string;
  action: ScheduleExceptionAction;
  new_scheduled_for?: string | null;
  reason?: string | null;
  run_id?: string | null;
  created_by?: number | null;
  created_at?: string;
}

export interface FlsDashboard {
  checklists_overdue: number;
  checklists_due_soon: number;
  checklists_active: number;
  runs_scheduled: number;
  runs_in_progress: number;
  runs_completed: number;
  issues_open: number;
  issues_critical: number;
  recent_runs: FlsRun[];
}

// ─── API Client ──────────────────────────────────────────────────────────────

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {};
  const options: RequestInit = { method, mode: 'cors', headers };

  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errBody}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

function buildQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

// ─── Exported API ────────────────────────────────────────────────────────────

export const flsApi = {
  // Dashboard - backend returns { due, runs, issues, recentRuns }
  getDashboard: async (): Promise<FlsDashboard> => {
    const raw = await request<{
      due: { overdue: number; due_soon: number; active_templates: number };
      runs: { scheduled: number; in_progress: number; completed: number };
      issues: { open_issues: number; critical_open: number };
      recentRuns: FlsRun[];
    }>('GET', '/v1/fls/dashboard');
    return {
      checklists_overdue: Number(raw.due?.overdue || 0),
      checklists_due_soon: Number(raw.due?.due_soon || 0),
      checklists_active: Number(raw.due?.active_templates || 0),
      runs_scheduled: Number(raw.runs?.scheduled || 0),
      runs_in_progress: Number(raw.runs?.in_progress || 0),
      runs_completed: Number(raw.runs?.completed || 0),
      issues_open: Number(raw.issues?.open_issues || 0),
      issues_critical: Number(raw.issues?.critical_open || 0),
      recent_runs: raw.recentRuns || [],
    };
  },

  // Templates
  listTemplates: (params?: { active?: boolean; category?: string; q?: string; includeQuestions?: boolean }) =>
    request<FlsTemplate[]>('GET', `/v1/fls/templates${buildQuery(params || {})}`),

  getTemplate: (id: string) =>
    request<FlsTemplate>('GET', `/v1/fls/templates/${id}`),

  createTemplate: (payload: Partial<FlsTemplate> & { questions?: FlsQuestion[] }) =>
    request<FlsTemplate>('POST', '/v1/fls/templates', payload),

  updateTemplate: (id: string, payload: Partial<FlsTemplate>) =>
    request<FlsTemplate>('PATCH', `/v1/fls/templates/${id}`, payload),

  deleteTemplate: (id: string) =>
    request<void>('DELETE', `/v1/fls/templates/${id}`),

  archiveTemplate: (id: string, active: boolean) =>
    request<void>('PATCH', `/v1/fls/templates/${id}/archive`, { active }),

  replaceQuestions: (id: string, questions: FlsQuestion[]) =>
    request<FlsQuestion[]>('PUT', `/v1/fls/templates/${id}/questions`, { questions }),

  addQuestion: (id: string, question: Partial<FlsQuestion>) =>
    request<FlsQuestion>('POST', `/v1/fls/templates/${id}/questions`, question),

  updateQuestion: (questionId: string, payload: Partial<FlsQuestion>) =>
    request<FlsQuestion>('PATCH', `/v1/fls/questions/${questionId}`, payload),

  deleteQuestion: (questionId: string) =>
    request<void>('DELETE', `/v1/fls/questions/${questionId}`),

  // Runs - backend returns plain array, frontend expects paginated shape
  listRuns: async (params?: { checklist_id?: string; status?: string; from?: string; to?: string; inspector_id?: number; page?: number; pageSize?: number }): Promise<{ data: FlsRun[]; total: number; page: number; pageSize: number }> => {
    const { page = 1, pageSize = 100, ...rest } = params || {};
    const allRuns = await request<FlsRun[]>('GET', `/v1/fls/runs${buildQuery({ ...rest, limit: 500 })}`);
    const total = allRuns.length;
    const start = (page - 1) * pageSize;
    const data = allRuns.slice(start, start + pageSize);
    return { data, total, page, pageSize };
  },

  getRun: (id: string) =>
    request<FlsRun>('GET', `/v1/fls/runs/${id}`),

  createRun: (payload: {
    checklist_id: string;
    scheduled_for?: string;
    start_now?: boolean;
    inspector_id: number;
    inspector_name: string;
    target_area?: string;
    target_room_id?: number | null;
    target_asset_code?: string;
    notes?: string;
    created_by: number;
  }) => request<FlsRun>('POST', '/v1/fls/runs', payload),

  startRun: (id: string, payload?: { started_at?: string; inspector_id?: number }) =>
    request<FlsRun>('PATCH', `/v1/fls/runs/${id}/start`, payload || {}),

  saveAnswers: (id: string, answers: FlsRunAnswer[]) =>
    request<void>('POST', `/v1/fls/runs/${id}/answers`, { answers }),

  completeRun: (id: string, payload: {
    completed_at?: string;
    inspector_id: number;
    inspector_name: string;
    notes?: string;
    signature_url?: string;
    create_issues?: boolean;
  }) => request<FlsRun>('POST', `/v1/fls/runs/${id}/complete`, payload),

  updateRun: (id: string, payload: Partial<FlsRun>) =>
    request<FlsRun>('PATCH', `/v1/fls/runs/${id}`, payload),

  deleteRun: (id: string) =>
    request<void>('DELETE', `/v1/fls/runs/${id}`),

  cancelRun: (id: string, notes?: string) =>
    request<void>('PATCH', `/v1/fls/runs/${id}/cancel`, { notes }),

  getRunAnswers: (runId: string) =>
    request<FlsRunAnswer[]>('GET', `/v1/fls/runs/${runId}/answers`),

  getAnswer: (answerId: string) =>
    request<FlsRunAnswer>('GET', `/v1/fls/answers/${answerId}`),

  updateAnswer: (answerId: string, payload: Partial<FlsRunAnswer>) =>
    request<FlsRunAnswer>('PATCH', `/v1/fls/answers/${answerId}`, payload),

  deleteAnswer: (answerId: string) =>
    request<void>('DELETE', `/v1/fls/answers/${answerId}`),

  // Issues - backend returns plain array, frontend expects paginated shape
  listIssues: async (params?: { status?: string; severity?: string; assigned_to?: number; checklist_id?: string; page?: number; pageSize?: number }): Promise<{ data: FlsIssue[]; total: number; page: number; pageSize: number }> => {
    const { page = 1, pageSize = 100, ...rest } = params || {};
    const allIssues = await request<FlsIssue[]>('GET', `/v1/fls/issues${buildQuery({ ...rest, limit: 500 })}`);
    const total = allIssues.length;
    const start = (page - 1) * pageSize;
    const data = allIssues.slice(start, start + pageSize);
    return { data, total, page, pageSize };
  },

  getIssue: (id: string) =>
    request<FlsIssue>('GET', `/v1/fls/issues/${id}`),

  createIssue: (payload: Partial<FlsIssue>) =>
    request<FlsIssue>('POST', '/v1/fls/issues', payload),

  updateIssue: (id: string, payload: Partial<FlsIssue>) =>
    request<FlsIssue>('PATCH', `/v1/fls/issues/${id}`, payload),

  deleteIssue: (id: string) =>
    request<void>('DELETE', `/v1/fls/issues/${id}`),

  // Calendar
  getCalendar: (params?: { from?: string; to?: string; include_runs?: boolean; include_planned?: boolean; checklist_id?: string; schedule_id?: string; inspector_id?: number; status?: string; limit?: number }) =>
    request<FlsCalendarEvent[]>('GET', `/v1/fls/calendar${buildQuery(params || {})}`),

  // Schedules
  listSchedules: (params?: { active?: boolean; checklist_id?: string; inspector_id?: number; q?: string; include_occurrences?: boolean; from?: string; to?: string; limit?: number }) =>
    request<FlsSchedule[]>('GET', `/v1/fls/schedules${buildQuery(params || {})}`),

  getSchedule: (id: string, params?: { include_occurrences?: boolean; from?: string; to?: string }) =>
    request<FlsSchedule>('GET', `/v1/fls/schedules/${id}${buildQuery(params || {})}`),

  createSchedule: (payload: {
    checklist_id: string;
    title?: string;
    description?: string;
    schedule_type?: ScheduleType;
    scheduled_for?: string;
    recurrence?: Partial<FlsScheduleRecurrence>;
    timezone?: string;
    inspector_id?: number | null;
    inspector_name?: string | null;
    target_area?: string | null;
    auto_generate?: boolean;
    generate_days_ahead?: number;
    color?: string | null;
    active?: boolean;
    created_by?: number | null;
  }) => request<FlsSchedule>('POST', '/v1/fls/schedules', payload),

  updateSchedule: (id: string, payload: Partial<FlsSchedule>) =>
    request<FlsSchedule>('PATCH', `/v1/fls/schedules/${id}`, payload),

  archiveSchedule: (id: string, active: boolean) =>
    request<FlsSchedule>('PATCH', `/v1/fls/schedules/${id}/archive`, { active }),

  deleteSchedule: (id: string) =>
    request<void>('DELETE', `/v1/fls/schedules/${id}`),

  generateScheduleRuns: (id: string, payload?: { from?: string; to?: string; dry_run?: boolean; limit?: number }) =>
    request<{ created: FlsRun[]; skipped: number }>('POST', `/v1/fls/schedules/${id}/generate-runs`, payload || {}),

  generateAllScheduleRuns: (payload?: { from?: string; to?: string; dry_run?: boolean; schedule_ids?: string[]; auto_generate_only?: boolean; limit?: number }) =>
    request<{ generated: FlsRun[]; skipped: number; dry_run: boolean }>('POST', '/v1/fls/schedules/generate-runs', payload || {}),

  // Schedule Exceptions
  listScheduleExceptions: (scheduleId: string, params?: { from?: string; to?: string }) =>
    request<FlsScheduleException[]>('GET', `/v1/fls/schedules/${scheduleId}/exceptions${buildQuery(params || {})}`),

  createScheduleException: (scheduleId: string, payload: { occurrence_at: string; action?: ScheduleExceptionAction; new_scheduled_for?: string; reason?: string }) =>
    request<FlsScheduleException>('POST', `/v1/fls/schedules/${scheduleId}/exceptions`, payload),

  updateScheduleException: (id: string, payload: Partial<FlsScheduleException>) =>
    request<FlsScheduleException>('PATCH', `/v1/fls/schedule-exceptions/${id}`, payload),

  deleteScheduleException: (id: string) =>
    request<void>('DELETE', `/v1/fls/schedule-exceptions/${id}`),
};
