import { Router, Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { withConn } from '../config/db.js';
import { getIO } from '../realtime.js';

const router = Router();

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const RequestStatusEnum = z.enum(['DRAFT', 'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'TAKEN']);
const AdjustmentTypeEnum = z.enum(['INITIAL_BALANCE', 'MANUAL_ADJUSTMENT', 'PAYOUT', 'CORRECTION', 'EXPIRATION']);
const WeekdayEnum = z.enum(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']);

const boolish = z.preprocess((v) => {
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'si'].includes(s)) return true;
    if (['false', '0', 'no'].includes(s)) return false;
  }
  return v;
}, z.boolean());

const toNullableString = z.preprocess(
  (v) => (v === '' || v == null ? null : String(v)),
  z.string().nullable()
);

const toNullableNumber = z.preprocess(
  (v) => (v === '' || v == null ? null : Number(v)),
  z.number().nullable()
);

const jsonObject = z.record(z.any()).optional().default({});

const employeeCreateSchema = z.object({
  employee_number: toNullableString.optional(),
  full_name: z.string().min(2).max(180),
  email: z.string().email().nullable().optional(),
  phone: toNullableString.optional(),
  department: z.string().min(1).max(120).optional().default('GENERAL'),
  position: toNullableString.optional(),
  hierarchy_level: z.coerce.number().int().min(0).max(99).optional().default(0),
  manager_employee_number: toNullableString.optional(),
  is_area_executive: boolish.optional().default(false),
  hire_date: ymd,
  balance_start_date: ymd.optional(),
  initial_balance_days: z.coerce.number().min(-365).max(365).optional().default(0),
  work_monday: boolish.optional().default(true),
  work_tuesday: boolish.optional().default(true),
  work_wednesday: boolish.optional().default(true),
  work_thursday: boolish.optional().default(true),
  work_friday: boolish.optional().default(true),
  work_saturday: boolish.optional().default(false),
  work_sunday: boolish.optional().default(false),
  active: boolish.optional().default(true),
  notes: toNullableString.optional(),
  metadata: jsonObject
});

const employeePatchSchema = employeeCreateSchema.partial();

const requestBaseSchema = z.object({
  employee_id: z.string().uuid(),
  start_date: ymd,
  end_date: ymd,
  return_date: ymd.nullable().optional(),
  status: RequestStatusEnum.optional().default('REQUESTED'),
  requested_days: toNullableNumber.optional(),
  calendar_days: toNullableNumber.optional(),
  rest_days_crossed: toNullableNumber.optional(),
  holiday_days_crossed: toNullableNumber.optional(),
  rest_weekdays: z.array(WeekdayEnum).nullable().optional(),
  include_weekends: boolish.optional().default(false),
  include_rest_days: boolish.optional(),
  include_holidays: boolish.optional().default(false),
  reason: toNullableString.optional(),
  notes: toNullableString.optional(),
  color: toNullableString.optional(),
  requested_by: toNullableString.optional(),
  approved_by: toNullableString.optional(),
  approved_at: z.string().min(1).nullable().optional(),
  taken_at: z.string().min(1).nullable().optional(),
  enforce_balance: boolish.optional().default(false),
  metadata: jsonObject
});

const requestCreateSchema = requestBaseSchema.refine((body) => body.end_date >= body.start_date, {
  path: ['end_date'],
  message: 'end_date must be greater than or equal to start_date'
});

const requestPatchSchema = requestBaseSchema
  .omit({ employee_id: true })
  .partial()
  .refine((body) => {
    if (body.start_date && body.end_date) return body.end_date >= body.start_date;
    return true;
  }, {
    path: ['end_date'],
    message: 'end_date must be greater than or equal to start_date'
  });

const requestStatusSchema = z.object({
  status: RequestStatusEnum,
  approved_by: toNullableString.optional(),
  taken_at: z.string().min(1).nullable().optional(),
  rejection_reason: toNullableString.optional(),
  notes: toNullableString.optional(),
  enforce_balance: boolish.optional().default(false)
});

const requestDayCalculationSchema = z.object({
  employee_id: z.string().uuid(),
  start_date: ymd,
  end_date: ymd,
  calendar_days: toNullableNumber.optional(),
  rest_days_crossed: toNullableNumber.optional(),
  holiday_days_crossed: toNullableNumber.optional(),
  rest_weekdays: z.array(WeekdayEnum).nullable().optional(),
  include_weekends: boolish.optional().default(false),
  include_rest_days: boolish.optional(),
  include_holidays: boolish.optional().default(false)
}).refine((body) => body.end_date >= body.start_date, {
  path: ['end_date'],
  message: 'end_date must be greater than or equal to start_date'
});

const adjustmentCreateSchema = z.object({
  employee_id: z.string().uuid(),
  adjustment_date: ymd.optional(),
  days: z.coerce.number().min(-365).max(365),
  type: AdjustmentTypeEnum.optional().default('MANUAL_ADJUSTMENT'),
  description: z.string().min(1).max(500),
  created_by: toNullableString.optional(),
  metadata: jsonObject
});

const adjustmentPatchSchema = adjustmentCreateSchema
  .omit({ employee_id: true })
  .partial();

const holidayCreateSchema = z.object({
  holiday_date: ymd,
  name: z.string().min(1).max(180),
  department: toNullableString.optional(),
  recurring: boolish.optional().default(false),
  active: boolish.optional().default(true),
  metadata: jsonObject
});

const holidayPatchSchema = holidayCreateSchema.partial();

function handleError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'invalid_payload', details: err.flatten() });
  }
  const dbErr = err as { code?: string; sqlMessage?: string; message?: string };
  if (dbErr?.code === 'ER_DUP_ENTRY') {
    const message = dbErr.sqlMessage || dbErr.message || '';
    if (message.includes('uq_vac_employees_area_executive_department') || message.includes('area_executive_department')) {
      return res.status(409).json({ error: 'area_executive_already_exists' });
    }
    if (message.includes('uq_vac_employees_number') || message.includes('employee_number')) {
      return res.status(409).json({ error: 'duplicate_employee_number' });
    }
    return res.status(409).json({ error: 'duplicate_key' });
  }
  if (dbErr?.code === 'ER_NO_SUCH_TABLE' || dbErr?.code === 'ER_BAD_FIELD_ERROR') {
    return res.status(500).json({ error: 'vacacionario_schema_not_applied' });
  }
  return next(err);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toBool(value: unknown) {
  return value === true || value === 1 || value === '1';
}

function asDateString(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toSqlDateTime(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `${input} 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(input)) return input.slice(0, 19);
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function completedServiceYears(hireDate: string, asOf: string) {
  const hire = parseDateOnly(hireDate);
  const current = parseDateOnly(asOf);
  let years = current.getUTCFullYear() - hire.getUTCFullYear();
  const anniversary = new Date(Date.UTC(current.getUTCFullYear(), hire.getUTCMonth(), hire.getUTCDate()));
  if (current < anniversary) years -= 1;
  return Math.max(0, years);
}

function daysBetween(start: string, end: string) {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000));
}

function overlapDays(startA: string, endA: string, startB: string, endB: string) {
  const start = startA > startB ? startA : startB;
  const end = endA < endB ? endA : endB;
  return daysBetween(start, end);
}

function anniversaryDate(hireDate: string, serviceYear: number) {
  const hire = parseDateOnly(hireDate);
  return formatDateOnly(new Date(Date.UTC(
    hire.getUTCFullYear() + serviceYear,
    hire.getUTCMonth(),
    hire.getUTCDate()
  )));
}

function lftVacationDaysForServiceYear(serviceYear: number) {
  if (serviceYear <= 0) return 0;
  if (serviceYear <= 5) return 10 + serviceYear * 2;
  return 20 + Math.ceil((serviceYear - 5) / 5) * 2;
}

function roundVacationDays(value: number) {
  return Math.round(value * 100) / 100;
}

function roundProportionalDays(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function proportionalForPeriod(hireDate: string, from: string, to: string) {
  if (to <= from) return {
    from,
    to,
    proportional_days: 0,
    segments: []
  };

  const fromYears = completedServiceYears(hireDate, from);
  const toYears = completedServiceYears(hireDate, to);
  const segments: any[] = [];
  let total = 0;

  for (let serviceYear = Math.max(1, fromYears + 1); serviceYear <= toYears + 1; serviceYear += 1) {
    const periodStart = anniversaryDate(hireDate, serviceYear - 1);
    const periodEnd = anniversaryDate(hireDate, serviceYear);
    const periodDays = daysBetween(periodStart, periodEnd);
    if (periodDays <= 0) continue;

    const overlap = overlapDays(periodStart, periodEnd, from, to);
    if (overlap <= 0) continue;

    const legalDays = lftVacationDaysForServiceYear(serviceYear);
    const proportional = (legalDays * overlap) / periodDays;
    total += proportional;
    segments.push({
      service_year: serviceYear,
      period_start: periodStart,
      period_end: periodEnd,
      legal_days_at_anniversary: legalDays,
      period_days: periodDays,
      elapsed_days_in_range: overlap,
      proportional_days: roundProportionalDays(proportional)
    });
  }

  return {
    from,
    to,
    proportional_days: roundProportionalDays(total),
    segments
  };
}

function accrualAnchorDate(hireDate: string, balanceStartDate?: string | null) {
  const referenceDate = balanceStartDate || hireDate;
  const completedYearsAtReference = completedServiceYears(hireDate, referenceDate);
  return anniversaryDate(hireDate, completedYearsAtReference);
}

function mapEmployee(row: any) {
  if (!row) return null;
  return {
    ...row,
    hire_date: asDateString(row.hire_date),
    balance_start_date: asDateString(row.balance_start_date),
    initial_balance_days: Number(row.initial_balance_days || 0),
    hierarchy_level: Number(row.hierarchy_level || 0),
    manager_employee_number: row.manager_employee_number ?? null,
    is_area_executive: toBool(row.is_area_executive),
    hierarchy_role: toBool(row.is_area_executive) ? 'EJECUTIVO_DEL_AREA' : 'COLABORADOR',
    manager: row.manager_id || row.manager_full_name || row.manager_department || row.manager_position
      ? {
        id: row.manager_id ?? null,
        employee_number: row.manager_employee_number ?? null,
        full_name: row.manager_full_name ?? null,
        department: row.manager_department ?? null,
        position: row.manager_position ?? null
      }
      : null,
    manager_id: undefined,
    manager_full_name: undefined,
    manager_department: undefined,
    manager_position: undefined,
    area_executive_department: undefined,
    work_monday: toBool(row.work_monday),
    work_tuesday: toBool(row.work_tuesday),
    work_wednesday: toBool(row.work_wednesday),
    work_thursday: toBool(row.work_thursday),
    work_friday: toBool(row.work_friday),
    work_saturday: toBool(row.work_saturday),
    work_sunday: toBool(row.work_sunday),
    active: toBool(row.active),
    metadata: parseJson(row.metadata_json, {}),
    metadata_json: undefined
  };
}

function employeeSelectSql(whereSql = '') {
  return `SELECT e.*,
                 m.id AS manager_id,
                 m.full_name AS manager_full_name,
                 m.department AS manager_department,
                 m.position AS manager_position
            FROM vac_employees e
       LEFT JOIN vac_employees m ON m.employee_number = e.manager_employee_number
          ${whereSql}`;
}

async function validateEmployeeHierarchy(
  conn: any,
  payload: {
    employee_number?: string | null;
    manager_employee_number?: string | null;
    department?: string | null;
    is_area_executive?: boolean;
  },
  excludeEmployeeId?: string | null
) {
  const employeeNumber = payload.employee_number || null;
  const managerEmployeeNumber = payload.manager_employee_number || null;
  const department = payload.department || 'GENERAL';

  if (employeeNumber && managerEmployeeNumber && employeeNumber === managerEmployeeNumber) {
    return { error: 'employee_cannot_manage_self' };
  }

  if (managerEmployeeNumber) {
    const [[manager]]: any = await conn.query(
      `SELECT id, employee_number, full_name, department, position
         FROM vac_employees
        WHERE employee_number=?
        LIMIT 1`,
      [managerEmployeeNumber]
    );
    if (!manager) return { error: 'manager_employee_not_found', manager_employee_number: managerEmployeeNumber };
  }

  if (payload.is_area_executive) {
    const args: any[] = [department];
    let excludeSql = '';
    if (excludeEmployeeId) {
      excludeSql = 'AND id <> ?';
      args.push(excludeEmployeeId);
    }
    const [[existing]]: any = await conn.query(
      `SELECT id, employee_number, full_name, department
         FROM vac_employees
        WHERE department=? AND is_area_executive=1 ${excludeSql}
        LIMIT 1`,
      args
    );
    if (existing) {
      return {
        error: 'area_executive_already_exists',
        department,
        existing_employee: existing
      };
    }
  }

  return null;
}

function mapRequest(row: any) {
  if (!row) return null;
  return {
    ...row,
    start_date: asDateString(row.start_date),
    end_date: asDateString(row.end_date),
    return_date: asDateString(row.return_date),
    requested_days: Number(row.requested_days || 0),
    calendar_days: Number(row.calendar_days || 0),
    rest_days_crossed: Number(row.rest_days_crossed || 0),
    holiday_days_crossed: Number(row.holiday_days_crossed || 0),
    include_weekends: toBool(row.include_weekends),
    include_rest_days: toBool(row.include_weekends),
    include_holidays: toBool(row.include_holidays),
    approved_at: row.approved_at,
    taken_at: row.taken_at,
    rest_weekdays: parseJson(row.rest_weekdays_json, null),
    rest_weekdays_json: undefined,
    metadata: parseJson(row.metadata_json, {}),
    metadata_json: undefined
  };
}

function mapAdjustment(row: any) {
  if (!row) return null;
  return {
    ...row,
    adjustment_date: asDateString(row.adjustment_date),
    days: Number(row.days || 0),
    metadata: parseJson(row.metadata_json, {}),
    metadata_json: undefined
  };
}

function mapHoliday(row: any) {
  if (!row) return null;
  return {
    ...row,
    holiday_date: asDateString(row.holiday_date),
    recurring: toBool(row.recurring),
    active: toBool(row.active),
    metadata: parseJson(row.metadata_json, {}),
    metadata_json: undefined
  };
}

function weekdayWorkMap(employee: any) {
  return [
    toBool(employee.work_sunday),
    toBool(employee.work_monday),
    toBool(employee.work_tuesday),
    toBool(employee.work_wednesday),
    toBool(employee.work_thursday),
    toBool(employee.work_friday),
    toBool(employee.work_saturday)
  ];
}

const weekdayIndexByName: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

function requestWorkMap(employee: any, restWeekdays?: string[] | null) {
  if (!restWeekdays || restWeekdays.length === 0) return weekdayWorkMap(employee);
  const workDays = [true, true, true, true, true, true, true];
  for (const day of restWeekdays) {
    const index = weekdayIndexByName[day];
    if (index !== undefined) workDays[index] = false;
  }
  return workDays;
}

async function holidaySet(conn: any, from: string, to: string, department?: string | null) {
  const [rows]: any = await conn.query(
    `SELECT holiday_date, recurring
       FROM vac_holidays
      WHERE active=1
        AND (department IS NULL OR department='' OR department=?)
        AND (
          recurring=1
          OR (holiday_date >= ? AND holiday_date <= ?)
        )`,
    [department ?? null, from, to]
  );

  const days = new Set<string>();
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  for (const row of rows) {
    const date = asDateString(row.holiday_date);
    if (!date) continue;
    if (!toBool(row.recurring)) {
      days.add(date);
      continue;
    }
    for (let year = fromDate.getUTCFullYear(); year <= toDate.getUTCFullYear(); year += 1) {
      const recurring = `${year}-${date.slice(5)}`;
      if (recurring >= from && recurring <= to) days.add(recurring);
    }
  }
  return days;
}

function chargeableVacationDays(
  calendarDays: number,
  restDaysCrossed: number,
  holidayDaysCrossed: number,
  includeRestDays = false,
  includeHolidays = false
) {
  const restDaysToDiscount = includeRestDays ? 0 : restDaysCrossed;
  const holidayDaysToDiscount = includeHolidays ? 0 : holidayDaysCrossed;
  return roundVacationDays(Math.max(0, calendarDays - restDaysToDiscount - holidayDaysToDiscount));
}

async function vacationDayBreakdown(
  conn: any,
  employee: any,
  startDate: string,
  endDate: string,
  includeRestDays = false,
  includeHolidays = false,
  restWeekdays?: string[] | null
) {
  const workDays = requestWorkMap(employee, restWeekdays);
  const holidays = includeHolidays ? new Set<string>() : await holidaySet(conn, startDate, endDate, employee.department);
  let current = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  let calendarDays = 0;
  let restDaysCrossed = 0;
  let holidayDaysCrossed = 0;

  while (current <= end) {
    const date = formatDateOnly(current);
    const isRestDay = !includeRestDays && !workDays[current.getUTCDay()];
    const isHoliday = !includeHolidays && holidays.has(date);
    calendarDays += 1;
    if (isRestDay) {
      restDaysCrossed += 1;
    } else if (isHoliday) {
      holidayDaysCrossed += 1;
    }
    current = addDays(current, 1);
  }

  return {
    calendar_days: calendarDays,
    rest_days_crossed: restDaysCrossed,
    holiday_days_crossed: holidayDaysCrossed,
    vacation_days: chargeableVacationDays(calendarDays, restDaysCrossed, holidayDaysCrossed, includeRestDays, includeHolidays)
  };
}

async function countVacationDays(
  conn: any,
  employee: any,
  startDate: string,
  endDate: string,
  includeWeekends = false,
  includeHolidays = false
) {
  const breakdown = await vacationDayBreakdown(conn, employee, startDate, endDate, includeWeekends, includeHolidays);
  return breakdown.vacation_days;
}

async function calculateBalance(conn: any, employeeId: string, asOf = todayYmd()) {
  const [[employeeRow]]: any = await conn.query('SELECT * FROM vac_employees WHERE id=?', [employeeId]);
  if (!employeeRow) return null;
  const employee = mapEmployee(employeeRow) as any;
  const hireDate = employee.hire_date;
  const balanceStartDate = employee.balance_start_date || hireDate;
  const anchorDate = accrualAnchorDate(hireDate, balanceStartDate);
  const completedYears = completedServiceYears(hireDate, asOf);

  const periods: any[] = [];
  let legalAnniversaryDaysAfterAnchor = 0;
  for (let year = 1; year <= completedYears; year += 1) {
    const anniversary = anniversaryDate(hireDate, year);
    const days = lftVacationDaysForServiceYear(year);
    const included = anniversary > anchorDate && anniversary <= asOf;
    if (included) legalAnniversaryDaysAfterAnchor += days;
    periods.push({
      service_year: year,
      anniversary_date: anniversary,
      legal_days: days,
      included_in_balance: included
    });
  }

  const proportionalAccrual = proportionalForPeriod(hireDate, anchorDate, asOf);

  const [[adjustments]]: any = await conn.query(
    `SELECT COALESCE(SUM(days),0) AS days
       FROM vac_adjustments
      WHERE employee_id=? AND adjustment_date <= ?`,
    [employeeId, asOf]
  );
  const [[taken]]: any = await conn.query(
    `SELECT COALESCE(SUM(requested_days),0) AS days
       FROM vac_requests
      WHERE employee_id=?
        AND (
          status='TAKEN'
          OR (status='APPROVED' AND start_date <= ?)
        )
        AND start_date <= ?`,
    [employeeId, asOf, asOf]
  );
  const [[pending]]: any = await conn.query(
    `SELECT COALESCE(SUM(requested_days),0) AS days
       FROM vac_requests
      WHERE employee_id=?
        AND status IN ('DRAFT','REQUESTED')
        AND start_date <= ?`,
    [employeeId, asOf]
  );
  const [[futureApproved]]: any = await conn.query(
    `SELECT COALESCE(SUM(requested_days),0) AS days
       FROM vac_requests
      WHERE employee_id=?
        AND status='APPROVED'
        AND start_date > ?`,
    [employeeId, asOf]
  );

  const initial = Number(employee.initial_balance_days || 0);
  const manualAdjustments = Number(adjustments.days || 0);
  const accruedProportionalDays = Number(proportionalAccrual.proportional_days || 0);
  const takenDays = Number(taken.days || 0);
  const pendingDays = Number(pending.days || 0);
  const futureApprovedDays = Number(futureApproved.days || 0);
  const earned = roundVacationDays(initial + accruedProportionalDays + manualAdjustments);

  return {
    employee,
    as_of: asOf,
    legal_basis: {
      country: 'MX',
      law: 'Ley Federal del Trabajo',
      articles: ['76', '78', '79', '80', '81'],
      vacation_premium_min_percent: 25
    },
    completed_service_years: completedYears,
    next_anniversary_date: anniversaryDate(hireDate, completedYears + 1),
    next_anniversary_days: lftVacationDaysForServiceYear(completedYears + 1),
    policy: {
      accrual_mode: 'PROPORTIONAL_FROM_LAST_ANNIVERSARY_AFTER_INITIAL_BALANCE',
      can_take_proportional_days_before_anniversary: true,
      formula: 'initial_balance_days + proportional_days_from_accrual_anchor + adjustment_days - taken_days'
    },
    balance_start_date: balanceStartDate,
    accrual_anchor_date: anchorDate,
    initial_balance_cutoff_date: anchorDate,
    initial_balance_days: initial,
    accrued_after_balance_start_days: accruedProportionalDays,
    accrued_proportional_days: accruedProportionalDays,
    accrued_after_accrual_anchor_days: accruedProportionalDays,
    legal_anniversary_days_after_balance_start: legalAnniversaryDaysAfterAnchor,
    legal_anniversary_days_after_accrual_anchor: legalAnniversaryDaysAfterAnchor,
    adjustment_days: manualAdjustments,
    earned_days: earned,
    used_days: takenDays,
    taken_days: takenDays,
    pending_requested_days: pendingDays,
    future_approved_days: futureApprovedDays,
    available_days: roundVacationDays(earned - takenDays),
    projected_available_days: roundVacationDays(earned - takenDays - futureApprovedDays),
    proportional_accrual: proportionalAccrual,
    periods
  };
}

async function validateRequestAgainstBalance(
  conn: any,
  employeeId: string,
  requestedDays: number,
  asOf: string,
  excludeRequestId?: string | null
) {
  const balance = await calculateBalance(conn, employeeId, asOf);
  if (!balance) return null;

  const [[reserved]]: any = await conn.query(
    `SELECT COALESCE(SUM(requested_days),0) AS days
       FROM vac_requests
      WHERE employee_id=?
        AND status='APPROVED'
        AND start_date > ?
        ${excludeRequestId ? 'AND id <> ?' : ''}`,
    excludeRequestId ? [employeeId, asOf, excludeRequestId] : [employeeId, asOf]
  );
  const reservedDays = Number(reserved.days || 0);
  const availableForApproval = roundVacationDays(Number(balance.available_days || 0) - reservedDays);
  return {
    balance,
    reserved_future_days: reservedDays,
    available_for_approval_days: availableForApproval,
    requested_days: requestedDays,
    allowed: availableForApproval >= requestedDays
  };
}

/* ===========================
   Dashboard / legal table
   =========================== */

router.get('/entitlement-table', (_req: Request, res: Response) => {
  const years = Array.from({ length: 35 }, (_, i) => i + 1);
  res.json(years.map((year) => ({
    service_year: year,
    vacation_days: lftVacationDaysForServiceYear(year)
  })));
});

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      as_of: ymd.optional().default(todayYmd()),
      department: z.string().optional()
    }).parse(req.query);

    const data = await withConn(async (conn) => {
      const whereDepartment = q.department ? 'AND department=?' : '';
      const args = q.department ? [q.department] : [];
      const [[employees]]: any = await conn.query(
        `SELECT COUNT(*) AS total,
                SUM(active=1) AS active,
                SUM(active=0) AS inactive
           FROM vac_employees
          WHERE 1=1 ${whereDepartment}`,
        args
      );
      const [[requests]]: any = await conn.query(
        `SELECT
           SUM(status='REQUESTED') AS requested,
           SUM(status='APPROVED') AS approved,
           SUM(status='TAKEN') AS taken,
           SUM(status='REJECTED') AS rejected,
           SUM(status='CANCELLED') AS cancelled
         FROM vac_requests r
         JOIN vac_employees e ON e.id = r.employee_id
        WHERE 1=1 ${q.department ? 'AND e.department=?' : ''}`,
        args
      );
      const [upcoming]: any = await conn.query(
        `SELECT r.*, e.full_name, e.department
           FROM vac_requests r
           JOIN vac_employees e ON e.id = r.employee_id
          WHERE r.status IN ('APPROVED','REQUESTED')
            AND r.start_date >= ?
            ${q.department ? 'AND e.department=?' : ''}
          ORDER BY r.start_date ASC
          LIMIT 20`,
        q.department ? [q.as_of, q.department] : [q.as_of]
      );
      return {
        as_of: q.as_of,
        employees,
        requests,
        upcoming: upcoming.map(mapRequest)
      };
    });
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
});

/* ===========================
   Calendar
   =========================== */

router.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      from: ymd.optional().default(todayYmd()),
      to: ymd.optional().default(formatDateOnly(addDays(new Date(), 60))),
      employee_id: z.string().uuid().optional(),
      department: z.string().optional(),
      status: RequestStatusEnum.optional(),
      include_inactive_employees: boolish.optional().default(false),
      limit: z.coerce.number().int().min(1).max(1000).optional().default(500)
    }).parse(req.query);

    const rows = await withConn(async (conn) => {
      const where: string[] = ['r.start_date <= ?', 'r.end_date >= ?'];
      const args: any[] = [q.to, q.from];
      if (q.employee_id) { where.push('r.employee_id=?'); args.push(q.employee_id); }
      if (q.department) { where.push('e.department=?'); args.push(q.department); }
      if (q.status) { where.push('r.status=?'); args.push(q.status); }
      if (!q.include_inactive_employees) where.push('e.active=1');

      const [data]: any = await conn.query(
        `SELECT r.*, e.full_name, e.department, e.position
           FROM vac_requests r
           JOIN vac_employees e ON e.id = r.employee_id
          WHERE ${where.join(' AND ')}
          ORDER BY r.start_date ASC, e.full_name ASC
          LIMIT ?`,
        [...args, q.limit]
      );
      return data;
    });

    res.json(rows.map((row: any) => ({
      id: `vacation:${row.id}`,
      source: 'VACATION_REQUEST',
      request_id: row.id,
      employee_id: row.employee_id,
      employee_name: row.full_name,
      department: row.department,
      position: row.position,
      title: `${row.full_name} - Vacaciones`,
      start: asDateString(row.start_date),
      end: asDateString(row.end_date),
      return_date: asDateString(row.return_date),
      status: row.status,
      requested_days: Number(row.requested_days || 0),
      color: row.color,
      reason: row.reason,
      notes: row.notes
    })));
  } catch (err) {
    handleError(err, res, next);
  }
});

/* ===========================
   Employees
   =========================== */

router.get('/employees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      active: boolish.optional(),
      department: z.string().optional(),
      manager_employee_number: z.string().optional(),
      is_area_executive: boolish.optional(),
      q: z.string().optional(),
      include_balance: boolish.optional().default(false),
      as_of: ymd.optional().default(todayYmd()),
      limit: z.coerce.number().int().min(1).max(500).optional().default(100)
    }).parse(req.query);

    const employees = await withConn(async (conn) => {
      const where: string[] = [];
      const args: any[] = [];
      if (q.active !== undefined) { where.push('e.active=?'); args.push(q.active ? 1 : 0); }
      if (q.department) { where.push('e.department=?'); args.push(q.department); }
      if (q.manager_employee_number) { where.push('e.manager_employee_number=?'); args.push(q.manager_employee_number); }
      if (q.is_area_executive !== undefined) { where.push('e.is_area_executive=?'); args.push(q.is_area_executive ? 1 : 0); }
      if (q.q) {
        where.push('(e.full_name LIKE ? OR e.employee_number LIKE ? OR e.email LIKE ? OR e.position LIKE ? OR m.full_name LIKE ? OR e.manager_employee_number LIKE ?)');
        args.push(`%${q.q}%`, `%${q.q}%`, `%${q.q}%`, `%${q.q}%`, `%${q.q}%`, `%${q.q}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [rows]: any = await conn.query(
        `${employeeSelectSql(whereSql)} ORDER BY e.department ASC, e.hierarchy_level ASC, e.active DESC, e.full_name ASC LIMIT ?`,
        [...args, q.limit]
      );
      const mapped = rows.map(mapEmployee);
      if (!q.include_balance) return mapped;
      const withBalance = [];
      for (const employee of mapped) {
        withBalance.push({
          ...employee,
          balance: await calculateBalance(conn, employee.id, q.as_of)
        });
      }
      return withBalance;
    });

    res.json(employees);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/employees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = employeeCreateSchema.parse(req.body);
    const id = uuidv4();
    const balanceStartDate = body.balance_start_date || todayYmd();
    const employee = await withConn(async (conn) => {
      const hierarchyError = await validateEmployeeHierarchy(conn, body);
      if (hierarchyError) return { hierarchyError };
      await conn.query(
        `INSERT INTO vac_employees
          (id, employee_number, full_name, email, phone, department, position, hire_date,
           hierarchy_level, manager_employee_number, is_area_executive,
           balance_start_date, initial_balance_days, work_monday, work_tuesday, work_wednesday,
           work_thursday, work_friday, work_saturday, work_sunday, active, notes, metadata_json)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          body.employee_number ?? null,
          body.full_name,
          body.email ?? null,
          body.phone ?? null,
          body.department,
          body.position ?? null,
          body.hire_date,
          body.hierarchy_level,
          body.manager_employee_number ?? null,
          body.is_area_executive ? 1 : 0,
          balanceStartDate,
          body.initial_balance_days,
          body.work_monday ? 1 : 0,
          body.work_tuesday ? 1 : 0,
          body.work_wednesday ? 1 : 0,
          body.work_thursday ? 1 : 0,
          body.work_friday ? 1 : 0,
          body.work_saturday ? 1 : 0,
          body.work_sunday ? 1 : 0,
          body.active ? 1 : 0,
          body.notes ?? null,
          JSON.stringify(body.metadata || {})
        ]
      );
      const [[created]]: any = await conn.query(`${employeeSelectSql('WHERE e.id=?')}`, [id]);
      return mapEmployee(created);
    });
    if ((employee as any).hierarchyError) {
      return res.status(409).json((employee as any).hierarchyError);
    }
    getIO()?.emit('vacacionario:employeeCreated', { id });
    res.status(201).json(employee);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/employees/directory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      active: boolish.optional(),
      department: z.string().optional(),
      manager_employee_number: z.string().optional(),
      is_area_executive: boolish.optional(),
      q: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(2000).optional().default(2000)
    }).parse(req.query);

    const employees = await withConn(async (conn) => {
      const where: string[] = [];
      const args: any[] = [];
      if (q.active !== undefined) { where.push('e.active=?'); args.push(q.active ? 1 : 0); }
      if (q.department) { where.push('e.department=?'); args.push(q.department); }
      if (q.manager_employee_number) { where.push('e.manager_employee_number=?'); args.push(q.manager_employee_number); }
      if (q.is_area_executive !== undefined) { where.push('e.is_area_executive=?'); args.push(q.is_area_executive ? 1 : 0); }
      if (q.q) {
        where.push('(e.full_name LIKE ? OR e.employee_number LIKE ? OR e.email LIKE ? OR e.position LIKE ? OR m.full_name LIKE ? OR e.manager_employee_number LIKE ?)');
        args.push(`%${q.q}%`, `%${q.q}%`, `%${q.q}%`, `%${q.q}%`, `%${q.q}%`, `%${q.q}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [rows]: any = await conn.query(
        `${employeeSelectSql(whereSql)} ORDER BY e.department ASC, e.hierarchy_level ASC, e.active DESC, e.full_name ASC LIMIT ?`,
        [...args, q.limit]
      );
      return rows.map(mapEmployee);
    });
    res.json(employees);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/employees/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const includeBalance = String(req.query.include_balance || '').toLowerCase() === 'true';
    const asOf = typeof req.query.as_of === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.as_of)
      ? req.query.as_of
      : todayYmd();

    const employee = await withConn(async (conn) => {
      const [[row]]: any = await conn.query(`${employeeSelectSql('WHERE e.id=?')}`, [id]);
      if (!row) return null;
      const mapped = mapEmployee(row);
      if (!includeBalance) return mapped;
      return {
        ...mapped,
        balance: await calculateBalance(conn, id, asOf)
      };
    });
    if (!employee) return res.status(404).json({ error: 'not_found' });
    res.json(employee);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/employees/:id/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { as_of } = z.object({ as_of: ymd.optional().default(todayYmd()) }).parse(req.query);
    const balance = await withConn((conn) => calculateBalance(conn, id, as_of));
    if (!balance) return res.status(404).json({ error: 'not_found' });
    res.json(balance);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/employees/:id/accrual', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const q = z.object({
      as_of: ymd.optional().default(todayYmd()),
      year: z.coerce.number().int().min(1900).max(3000).optional()
    }).parse(req.query);

    const accrual = await withConn(async (conn) => {
      const [[row]]: any = await conn.query('SELECT * FROM vac_employees WHERE id=?', [id]);
      if (!row) return null;

      const employee = mapEmployee(row) as any;
      const asOf = q.as_of;
      const calendarYear = q.year || Number(asOf.slice(0, 4));
      const yearStart = `${calendarYear}-01-01`;
      const yearEndExclusive = `${calendarYear + 1}-01-01`;
      const calendarTo = asOf < yearEndExclusive ? asOf : yearEndExclusive;

      const completedYears = completedServiceYears(employee.hire_date, asOf);
      const balanceStartDate = employee.balance_start_date || employee.hire_date;
      const anchorDate = accrualAnchorDate(employee.hire_date, balanceStartDate);
      const sinceInitialBalanceAnchor = proportionalForPeriod(employee.hire_date, anchorDate, asOf);
      const currentServiceYear = completedYears + 1;
      const currentPeriodStart = anniversaryDate(employee.hire_date, completedYears);
      const currentPeriodEnd = anniversaryDate(employee.hire_date, currentServiceYear);
      const currentPeriodDays = daysBetween(currentPeriodStart, currentPeriodEnd);
      const elapsedCurrentDays = overlapDays(currentPeriodStart, currentPeriodEnd, currentPeriodStart, asOf);
      const currentLegalDays = lftVacationDaysForServiceYear(currentServiceYear);
      const currentProportional = currentPeriodDays > 0
        ? (currentLegalDays * elapsedCurrentDays) / currentPeriodDays
        : 0;

      return {
        employee,
        as_of: asOf,
        policy_note: 'La empresa permite tomar dias proporcionales conforme se van generando. El saldo disponible se calcula con saldo inicial + proporcional generado desde el aniversario laboral de corte - dias tomados.',
        completed_service_years: completedYears,
        balance_start_date: balanceStartDate,
        accrual_anchor_date: anchorDate,
        initial_balance_cutoff_date: anchorDate,
        since_initial_balance_anchor: sinceInitialBalanceAnchor,
        since_balance_start: sinceInitialBalanceAnchor,
        current_service_year: currentServiceYear,
        current_service_period: {
          start_date: currentPeriodStart,
          end_date: currentPeriodEnd,
          legal_days_at_next_anniversary: currentLegalDays,
          period_days: currentPeriodDays,
          elapsed_days: elapsedCurrentDays,
          proportional_days_generated: roundProportionalDays(currentProportional),
          remaining_proportional_days: roundProportionalDays(currentLegalDays - currentProportional)
        },
        calendar_year: {
          year: calendarYear,
          ...proportionalForPeriod(employee.hire_date, yearStart, calendarTo)
        }
      };
    });

    if (!accrual) return res.status(404).json({ error: 'not_found' });
    res.json(accrual);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/employees/:id/taken-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const currentYear = todayYmd().slice(0, 4);
    const q = z.object({
      from: ymd.optional().default(`${currentYear}-01-01`),
      to: ymd.optional().default(todayYmd())
    }).parse(req.query);

    const summary = await withConn(async (conn) => {
      const [[employee]]: any = await conn.query('SELECT * FROM vac_employees WHERE id=?', [id]);
      if (!employee) return null;
      const [requests]: any = await conn.query(
        `SELECT *
           FROM vac_requests
          WHERE employee_id=?
            AND status IN ('APPROVED','TAKEN')
            AND start_date <= ?
            AND end_date >= ?
          ORDER BY start_date ASC`,
        [id, q.to, q.from]
      );
      const takenRequests = requests.filter((request: any) =>
        request.status === 'TAKEN' || (request.status === 'APPROVED' && asDateString(request.start_date)! <= q.to)
      );
      const totalTakenDays = takenRequests.reduce((sum: number, request: any) => sum + Number(request.requested_days || 0), 0);
      return {
        employee: mapEmployee(employee),
        from: q.from,
        to: q.to,
        taken_days: roundVacationDays(totalTakenDays),
        requests: takenRequests.map(mapRequest)
      };
    });

    if (!summary) return res.status(404).json({ error: 'not_found' });
    res.json(summary);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/employees/:id/ledger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const q = z.object({
      from: ymd.optional(),
      to: ymd.optional().default(todayYmd())
    }).parse(req.query);
    const ledger = await withConn(async (conn) => {
      const balance = await calculateBalance(conn, id, q.to);
      if (!balance) return null;
      const [requests]: any = await conn.query(
        `SELECT 'REQUEST' AS entry_type, id, start_date AS entry_date, requested_days * -1 AS days,
                status, reason AS description
           FROM vac_requests
          WHERE employee_id=? AND status IN ('APPROVED','TAKEN')
            ${q.from ? 'AND start_date >= ?' : ''}
            AND start_date <= ?`,
        q.from ? [id, q.from, q.to] : [id, q.to]
      );
      const [adjustments]: any = await conn.query(
        `SELECT 'ADJUSTMENT' AS entry_type, id, adjustment_date AS entry_date, days,
                type AS status, description
           FROM vac_adjustments
          WHERE employee_id=?
            ${q.from ? 'AND adjustment_date >= ?' : ''}
            AND adjustment_date <= ?`,
        q.from ? [id, q.from, q.to] : [id, q.to]
      );
      return {
        balance,
        entries: [...requests, ...adjustments].sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)))
      };
    });
    if (!ledger) return res.status(404).json({ error: 'not_found' });
    res.json(ledger);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/employees/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = employeePatchSchema.parse(req.body || {});
    const employee = await withConn(async (conn) => {
      const [[current]]: any = await conn.query('SELECT * FROM vac_employees WHERE id=?', [id]);
      if (!current) return null;
      const hierarchyError = await validateEmployeeHierarchy(conn, {
        employee_number: body.employee_number !== undefined ? body.employee_number : current.employee_number,
        manager_employee_number: body.manager_employee_number !== undefined ? body.manager_employee_number : current.manager_employee_number,
        department: body.department !== undefined ? body.department : current.department,
        is_area_executive: body.is_area_executive !== undefined ? body.is_area_executive : toBool(current.is_area_executive)
      }, id);
      if (hierarchyError) return { hierarchyError };

      const sets: string[] = [];
      const args: any[] = [];
      const add = (sql: string, value: any) => { sets.push(sql); args.push(value); };
      if (body.employee_number !== undefined) add('employee_number=?', body.employee_number);
      if (body.full_name !== undefined) add('full_name=?', body.full_name);
      if (body.email !== undefined) add('email=?', body.email);
      if (body.phone !== undefined) add('phone=?', body.phone);
      if (body.department !== undefined) add('department=?', body.department);
      if (body.position !== undefined) add('position=?', body.position);
      if (body.hierarchy_level !== undefined) add('hierarchy_level=?', body.hierarchy_level);
      if (body.manager_employee_number !== undefined) add('manager_employee_number=?', body.manager_employee_number);
      if (body.is_area_executive !== undefined) add('is_area_executive=?', body.is_area_executive ? 1 : 0);
      if (body.hire_date !== undefined) add('hire_date=?', body.hire_date);
      if (body.balance_start_date !== undefined) add('balance_start_date=?', body.balance_start_date);
      if (body.initial_balance_days !== undefined) add('initial_balance_days=?', body.initial_balance_days);
      if (body.work_monday !== undefined) add('work_monday=?', body.work_monday ? 1 : 0);
      if (body.work_tuesday !== undefined) add('work_tuesday=?', body.work_tuesday ? 1 : 0);
      if (body.work_wednesday !== undefined) add('work_wednesday=?', body.work_wednesday ? 1 : 0);
      if (body.work_thursday !== undefined) add('work_thursday=?', body.work_thursday ? 1 : 0);
      if (body.work_friday !== undefined) add('work_friday=?', body.work_friday ? 1 : 0);
      if (body.work_saturday !== undefined) add('work_saturday=?', body.work_saturday ? 1 : 0);
      if (body.work_sunday !== undefined) add('work_sunday=?', body.work_sunday ? 1 : 0);
      if (body.active !== undefined) add('active=?', body.active ? 1 : 0);
      if (body.notes !== undefined) add('notes=?', body.notes);
      if (body.metadata !== undefined) add('metadata_json=?', JSON.stringify(body.metadata || {}));
      if (sets.length) {
        args.push(id);
        const [r]: any = await conn.query(`UPDATE vac_employees SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`, args);
        if (!r.affectedRows) return null;
      }
      const [[row]]: any = await conn.query(`${employeeSelectSql('WHERE e.id=?')}`, [id]);
      return mapEmployee(row);
    });
    if (!employee) return res.status(404).json({ error: 'not_found' });
    if ((employee as any).hierarchyError) {
      return res.status(409).json((employee as any).hierarchyError);
    }
    getIO()?.emit('vacacionario:employeeUpdated', { id, changes: req.body });
    res.json(employee);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/employees/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { active } = z.object({ active: boolish.optional().default(false) }).parse(req.body || {});
    await withConn(async (conn) => {
      const [r]: any = await conn.query('UPDATE vac_employees SET active=?, updated_at=NOW() WHERE id=?', [active ? 1 : 0, id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ id, active });
    });
    getIO()?.emit('vacacionario:employeeArchived', { id, active });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/employees/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [r]: any = await conn.query('DELETE FROM vac_employees WHERE id=?', [id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: r.affectedRows || 0 });
    });
    getIO()?.emit('vacacionario:employeeDeleted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

/* ===========================
   Requests
   =========================== */

router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      employee_id: z.string().uuid().optional(),
      department: z.string().optional(),
      status: RequestStatusEnum.optional(),
      from: ymd.optional(),
      to: ymd.optional(),
      limit: z.coerce.number().int().min(1).max(500).optional().default(100)
    }).parse(req.query);

    const rows = await withConn(async (conn) => {
      const where: string[] = [];
      const args: any[] = [];
      if (q.employee_id) { where.push('r.employee_id=?'); args.push(q.employee_id); }
      if (q.department) { where.push('e.department=?'); args.push(q.department); }
      if (q.status) { where.push('r.status=?'); args.push(q.status); }
      if (q.from) { where.push('r.end_date >= ?'); args.push(q.from); }
      if (q.to) { where.push('r.start_date <= ?'); args.push(q.to); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [data]: any = await conn.query(
        `SELECT r.*, e.full_name, e.department, e.position
           FROM vac_requests r
           JOIN vac_employees e ON e.id = r.employee_id
          ${whereSql}
          ORDER BY r.start_date DESC, e.full_name ASC
          LIMIT ?`,
        [...args, q.limit]
      );
      return data.map(mapRequest);
    });
    res.json(rows);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = requestCreateSchema.parse(req.body);
    const id = uuidv4();
    const request = await withConn(async (conn) => {
      const [[employeeRow]]: any = await conn.query('SELECT * FROM vac_employees WHERE id=? AND active=1', [body.employee_id]);
      if (!employeeRow) return null;
      const employee = mapEmployee(employeeRow);
      const includeRestDays = body.include_rest_days ?? body.include_weekends;
      const calculatedBreakdown = await vacationDayBreakdown(
        conn,
        employee,
        body.start_date,
        body.end_date,
        includeRestDays,
        body.include_holidays,
        body.rest_weekdays ?? null
      );
      const calendarDays = body.calendar_days ?? calculatedBreakdown.calendar_days;
      const restDaysCrossed = body.rest_days_crossed ?? calculatedBreakdown.rest_days_crossed;
      const holidayDaysCrossed = body.holiday_days_crossed ?? calculatedBreakdown.holiday_days_crossed;
      const requestedDays = body.requested_days == null
        ? chargeableVacationDays(calendarDays, restDaysCrossed, holidayDaysCrossed, includeRestDays, body.include_holidays)
        : body.requested_days;
      if (body.enforce_balance && ['APPROVED', 'TAKEN'].includes(body.status)) {
        const validation = await validateRequestAgainstBalance(conn, body.employee_id, Number(requestedDays || 0), body.start_date);
        if (validation && !validation.allowed) {
          return { insufficientBalance: validation };
        }
      }
      await conn.query(
        `INSERT INTO vac_requests
          (id, employee_id, status, start_date, end_date, return_date, requested_days,
           calendar_days, rest_days_crossed, holiday_days_crossed, rest_weekdays_json,
           include_weekends, include_holidays, reason, notes, color, requested_by,
           approved_by, approved_at, taken_at, metadata_json)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          body.employee_id,
          body.status,
          body.start_date,
          body.end_date,
          body.return_date ?? null,
          requestedDays,
          calendarDays,
          restDaysCrossed,
          holidayDaysCrossed,
          body.rest_weekdays === undefined ? null : JSON.stringify(body.rest_weekdays || []),
          includeRestDays ? 1 : 0,
          body.include_holidays ? 1 : 0,
          body.reason ?? null,
          body.notes ?? null,
          body.color ?? null,
          body.requested_by ?? null,
          body.approved_by ?? null,
          toSqlDateTime(body.approved_at ?? null),
          toSqlDateTime(body.taken_at ?? null),
          JSON.stringify(body.metadata || {})
        ]
      );
      const [[created]]: any = await conn.query('SELECT * FROM vac_requests WHERE id=?', [id]);
      return mapRequest(created);
    });
    if (!request) return res.status(404).json({ error: 'employee_not_found_or_inactive' });
    if ((request as any).insufficientBalance) {
      return res.status(409).json({ error: 'insufficient_vacation_balance', details: (request as any).insufficientBalance });
    }
    getIO()?.emit('vacacionario:requestCreated', { id, employee_id: body.employee_id });
    res.status(201).json(request);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/requests/calculate-days', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = requestDayCalculationSchema.parse(req.body || {});
    const result = await withConn(async (conn) => {
      const [[employeeRow]]: any = await conn.query('SELECT * FROM vac_employees WHERE id=?', [body.employee_id]);
      if (!employeeRow) return null;
      const employee = mapEmployee(employeeRow);
      const includeRestDays = body.include_rest_days ?? body.include_weekends;
      const calculatedBreakdown = await vacationDayBreakdown(
        conn,
        employee,
        body.start_date,
        body.end_date,
        includeRestDays,
        body.include_holidays,
        body.rest_weekdays ?? null
      );
      const calendarDays = body.calendar_days ?? calculatedBreakdown.calendar_days;
      const restDaysCrossed = body.rest_days_crossed ?? calculatedBreakdown.rest_days_crossed;
      const holidayDaysCrossed = body.holiday_days_crossed ?? calculatedBreakdown.holiday_days_crossed;
      return {
        employee,
        start_date: body.start_date,
        end_date: body.end_date,
        include_rest_days: includeRestDays,
        include_weekends: includeRestDays,
        include_holidays: body.include_holidays,
        rest_weekdays: body.rest_weekdays ?? null,
        calendar_days: calendarDays,
        rest_days_crossed: restDaysCrossed,
        holiday_days_crossed: holidayDaysCrossed,
        requested_days: chargeableVacationDays(calendarDays, restDaysCrossed, holidayDaysCrossed, includeRestDays, body.include_holidays),
        calculated_breakdown: calculatedBreakdown
      };
    });
    if (!result) return res.status(404).json({ error: 'employee_not_found' });
    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/requests/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = requestStatusSchema.parse(req.body || {});
    const request = await withConn(async (conn) => {
      const [[current]]: any = await conn.query('SELECT * FROM vac_requests WHERE id=?', [id]);
      if (!current) return null;
      if (body.enforce_balance && ['APPROVED', 'TAKEN'].includes(body.status)) {
        const validation = await validateRequestAgainstBalance(
          conn,
          current.employee_id,
          Number(current.requested_days || 0),
          asDateString(current.start_date)!,
          id
        );
        if (validation && !validation.allowed) return { insufficientBalance: validation };
      }

      const sets = ['status=?'];
      const args: any[] = [body.status];
      if (body.approved_by !== undefined) { sets.push('approved_by=?'); args.push(body.approved_by); }
      if (body.status === 'APPROVED') { sets.push('approved_at=NOW()'); }
      if (body.status === 'TAKEN') {
        if (body.taken_at !== undefined) {
          sets.push('taken_at=?');
          args.push(toSqlDateTime(body.taken_at));
        } else {
          sets.push('taken_at=COALESCE(taken_at, NOW())');
        }
      } else if (body.taken_at !== undefined) {
        sets.push('taken_at=?');
        args.push(toSqlDateTime(body.taken_at));
      }
      if (body.rejection_reason !== undefined) { sets.push('rejection_reason=?'); args.push(body.rejection_reason); }
      if (body.notes !== undefined) { sets.push('notes=COALESCE(?, notes)'); args.push(body.notes); }
      args.push(id);
      const [r]: any = await conn.query(`UPDATE vac_requests SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`, args);
      if (!r.affectedRows) return null;
      const [[row]]: any = await conn.query('SELECT * FROM vac_requests WHERE id=?', [id]);
      return mapRequest(row);
    });
    if (!request) return res.status(404).json({ error: 'not_found' });
    if ((request as any).insufficientBalance) {
      return res.status(409).json({ error: 'insufficient_vacation_balance', details: (request as any).insufficientBalance });
    }
    getIO()?.emit('vacacionario:requestStatusChanged', { id, status: body.status });
    res.json(request);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const request = await withConn(async (conn) => {
      const [[row]]: any = await conn.query(
        `SELECT r.*, e.full_name, e.department, e.position
           FROM vac_requests r
           JOIN vac_employees e ON e.id = r.employee_id
          WHERE r.id=?`,
        [id]
      );
      return row ? mapRequest(row) : null;
    });
    if (!request) return res.status(404).json({ error: 'not_found' });
    res.json(request);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = requestPatchSchema.parse(req.body || {});
    const request = await withConn(async (conn) => {
      const [[current]]: any = await conn.query(
        `SELECT r.*, e.department, e.work_sunday, e.work_monday, e.work_tuesday, e.work_wednesday,
                e.work_thursday, e.work_friday, e.work_saturday
           FROM vac_requests r
           JOIN vac_employees e ON e.id = r.employee_id
          WHERE r.id=?`,
        [id]
      );
      if (!current) return null;

      const startDate = body.start_date ?? asDateString(current.start_date)!;
      const endDate = body.end_date ?? asDateString(current.end_date)!;
      const includeRestDays = body.include_rest_days ?? body.include_weekends ?? toBool(current.include_weekends);
      const includeHolidays = body.include_holidays ?? toBool(current.include_holidays);
      const restWeekdays = body.rest_weekdays !== undefined
        ? body.rest_weekdays
        : parseJson(current.rest_weekdays_json, null);
      const calculatedBreakdown = await vacationDayBreakdown(
        conn,
        current,
        startDate,
        endDate,
        includeRestDays,
        includeHolidays,
        restWeekdays
      );
      const calendarDays = body.calendar_days ?? calculatedBreakdown.calendar_days;
      const restDaysCrossed = body.rest_days_crossed ?? calculatedBreakdown.rest_days_crossed;
      const holidayDaysCrossed = body.holiday_days_crossed ?? calculatedBreakdown.holiday_days_crossed;
      const requestedDays = body.requested_days === undefined
        ? chargeableVacationDays(calendarDays, restDaysCrossed, holidayDaysCrossed, includeRestDays, includeHolidays)
        : body.requested_days;
      if (body.enforce_balance && body.status && ['APPROVED', 'TAKEN'].includes(body.status)) {
        const validation = await validateRequestAgainstBalance(
          conn,
          current.employee_id,
          Number(requestedDays || 0),
          startDate,
          id
        );
        if (validation && !validation.allowed) return { insufficientBalance: validation };
      }

      const sets: string[] = [];
      const args: any[] = [];
      const add = (sql: string, value: any) => { sets.push(sql); args.push(value); };
      if (body.status !== undefined) add('status=?', body.status);
      if (body.start_date !== undefined) add('start_date=?', body.start_date);
      if (body.end_date !== undefined) add('end_date=?', body.end_date);
      if (body.return_date !== undefined) add('return_date=?', body.return_date);
      add('requested_days=?', requestedDays);
      add('calendar_days=?', calendarDays);
      add('rest_days_crossed=?', restDaysCrossed);
      add('holiday_days_crossed=?', holidayDaysCrossed);
      if (body.rest_weekdays !== undefined) add('rest_weekdays_json=?', body.rest_weekdays == null ? null : JSON.stringify(body.rest_weekdays || []));
      if (body.include_weekends !== undefined || body.include_rest_days !== undefined) add('include_weekends=?', includeRestDays ? 1 : 0);
      if (body.include_holidays !== undefined) add('include_holidays=?', body.include_holidays ? 1 : 0);
      if (body.reason !== undefined) add('reason=?', body.reason);
      if (body.notes !== undefined) add('notes=?', body.notes);
      if (body.color !== undefined) add('color=?', body.color);
      if (body.requested_by !== undefined) add('requested_by=?', body.requested_by);
      if (body.approved_by !== undefined) add('approved_by=?', body.approved_by);
      if (body.approved_at !== undefined) add('approved_at=?', toSqlDateTime(body.approved_at));
      if (body.taken_at !== undefined) add('taken_at=?', toSqlDateTime(body.taken_at));
      if (body.status === 'TAKEN' && body.taken_at === undefined) sets.push('taken_at=COALESCE(taken_at, NOW())');
      if (body.metadata !== undefined) add('metadata_json=?', JSON.stringify(body.metadata || {}));
      args.push(id);
      const [r]: any = await conn.query(`UPDATE vac_requests SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`, args);
      if (!r.affectedRows) return null;
      const [[row]]: any = await conn.query('SELECT * FROM vac_requests WHERE id=?', [id]);
      return mapRequest(row);
    });
    if (!request) return res.status(404).json({ error: 'not_found' });
    if ((request as any).insufficientBalance) {
      return res.status(409).json({ error: 'insufficient_vacation_balance', details: (request as any).insufficientBalance });
    }
    getIO()?.emit('vacacionario:requestUpdated', { id, changes: req.body });
    res.json(request);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [r]: any = await conn.query('DELETE FROM vac_requests WHERE id=?', [id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: r.affectedRows || 0 });
    });
    getIO()?.emit('vacacionario:requestDeleted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

/* ===========================
   Adjustments
   =========================== */

router.get('/adjustments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      employee_id: z.string().uuid().optional(),
      type: AdjustmentTypeEnum.optional(),
      limit: z.coerce.number().int().min(1).max(500).optional().default(100)
    }).parse(req.query);
    const rows = await withConn(async (conn) => {
      const where: string[] = [];
      const args: any[] = [];
      if (q.employee_id) { where.push('employee_id=?'); args.push(q.employee_id); }
      if (q.type) { where.push('type=?'); args.push(q.type); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [data]: any = await conn.query(
        `SELECT * FROM vac_adjustments ${whereSql} ORDER BY adjustment_date DESC, created_at DESC LIMIT ?`,
        [...args, q.limit]
      );
      return data.map(mapAdjustment);
    });
    res.json(rows);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/adjustments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = adjustmentCreateSchema.parse(req.body);
    const id = uuidv4();
    const adjustment = await withConn(async (conn) => {
      const [[employee]]: any = await conn.query('SELECT id FROM vac_employees WHERE id=?', [body.employee_id]);
      if (!employee) return null;
      await conn.query(
        `INSERT INTO vac_adjustments
          (id, employee_id, adjustment_date, days, type, description, created_by, metadata_json)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          id,
          body.employee_id,
          body.adjustment_date || todayYmd(),
          body.days,
          body.type,
          body.description,
          body.created_by ?? null,
          JSON.stringify(body.metadata || {})
        ]
      );
      const [[created]]: any = await conn.query('SELECT * FROM vac_adjustments WHERE id=?', [id]);
      return mapAdjustment(created);
    });
    if (!adjustment) return res.status(404).json({ error: 'employee_not_found' });
    getIO()?.emit('vacacionario:adjustmentCreated', { id, employee_id: body.employee_id });
    res.status(201).json(adjustment);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/adjustments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [[row]]: any = await conn.query('SELECT * FROM vac_adjustments WHERE id=?', [id]);
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json(mapAdjustment(row));
    });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/adjustments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = adjustmentPatchSchema.parse(req.body || {});
    const adjustment = await withConn(async (conn) => {
      const sets: string[] = [];
      const args: any[] = [];
      const add = (sql: string, value: any) => { sets.push(sql); args.push(value); };
      if (body.adjustment_date !== undefined) add('adjustment_date=?', body.adjustment_date);
      if (body.days !== undefined) add('days=?', body.days);
      if (body.type !== undefined) add('type=?', body.type);
      if (body.description !== undefined) add('description=?', body.description);
      if (body.created_by !== undefined) add('created_by=?', body.created_by);
      if (body.metadata !== undefined) add('metadata_json=?', JSON.stringify(body.metadata || {}));
      if (sets.length) {
        args.push(id);
        const [r]: any = await conn.query(`UPDATE vac_adjustments SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`, args);
        if (!r.affectedRows) return null;
      }
      const [[row]]: any = await conn.query('SELECT * FROM vac_adjustments WHERE id=?', [id]);
      return mapAdjustment(row);
    });
    if (!adjustment) return res.status(404).json({ error: 'not_found' });
    getIO()?.emit('vacacionario:adjustmentUpdated', { id });
    res.json(adjustment);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/adjustments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [r]: any = await conn.query('DELETE FROM vac_adjustments WHERE id=?', [id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: r.affectedRows || 0 });
    });
    getIO()?.emit('vacacionario:adjustmentDeleted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

/* ===========================
   Holidays
   =========================== */

router.get('/holidays', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      from: ymd.optional(),
      to: ymd.optional(),
      department: z.string().optional(),
      active: boolish.optional()
    }).parse(req.query);
    const rows = await withConn(async (conn) => {
      const where: string[] = [];
      const args: any[] = [];
      if (q.from) { where.push('(holiday_date >= ? OR recurring=1)'); args.push(q.from); }
      if (q.to) { where.push('(holiday_date <= ? OR recurring=1)'); args.push(q.to); }
      if (q.department) { where.push('(department IS NULL OR department="" OR department=?)'); args.push(q.department); }
      if (q.active !== undefined) { where.push('active=?'); args.push(q.active ? 1 : 0); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [data]: any = await conn.query(`SELECT * FROM vac_holidays ${whereSql} ORDER BY holiday_date ASC`, args);
      return data.map(mapHoliday);
    });
    res.json(rows);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/holidays', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = holidayCreateSchema.parse(req.body);
    const id = uuidv4();
    const holiday = await withConn(async (conn) => {
      await conn.query(
        `INSERT INTO vac_holidays
          (id, holiday_date, name, department, recurring, active, metadata_json)
         VALUES (?,?,?,?,?,?,?)`,
        [
          id,
          body.holiday_date,
          body.name,
          body.department ?? null,
          body.recurring ? 1 : 0,
          body.active ? 1 : 0,
          JSON.stringify(body.metadata || {})
        ]
      );
      const [[created]]: any = await conn.query('SELECT * FROM vac_holidays WHERE id=?', [id]);
      return mapHoliday(created);
    });
    getIO()?.emit('vacacionario:holidayCreated', { id });
    res.status(201).json(holiday);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/holidays/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [[row]]: any = await conn.query('SELECT * FROM vac_holidays WHERE id=?', [id]);
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json(mapHoliday(row));
    });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/holidays/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = holidayPatchSchema.parse(req.body || {});
    const holiday = await withConn(async (conn) => {
      const sets: string[] = [];
      const args: any[] = [];
      const add = (sql: string, value: any) => { sets.push(sql); args.push(value); };
      if (body.holiday_date !== undefined) add('holiday_date=?', body.holiday_date);
      if (body.name !== undefined) add('name=?', body.name);
      if (body.department !== undefined) add('department=?', body.department);
      if (body.recurring !== undefined) add('recurring=?', body.recurring ? 1 : 0);
      if (body.active !== undefined) add('active=?', body.active ? 1 : 0);
      if (body.metadata !== undefined) add('metadata_json=?', JSON.stringify(body.metadata || {}));
      if (sets.length) {
        args.push(id);
        const [r]: any = await conn.query(`UPDATE vac_holidays SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`, args);
        if (!r.affectedRows) return null;
      }
      const [[row]]: any = await conn.query('SELECT * FROM vac_holidays WHERE id=?', [id]);
      return mapHoliday(row);
    });
    if (!holiday) return res.status(404).json({ error: 'not_found' });
    getIO()?.emit('vacacionario:holidayUpdated', { id });
    res.json(holiday);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/holidays/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [r]: any = await conn.query('DELETE FROM vac_holidays WHERE id=?', [id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: r.affectedRows || 0 });
    });
    getIO()?.emit('vacacionario:holidayDeleted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

export default router;
