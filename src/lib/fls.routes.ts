import { Router, Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { withConn } from '../config/db.js';
import { getIO } from '../realtime.js';

const router = Router();

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const timeOnly = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:mm or HH:mm:ss');

const RecurrenceEnum = z.enum([
  'ON_DEMAND',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUAL',
  'ANNUAL',
  'CUSTOM_DAYS'
]);
const ScoringMethodEnum = z.enum(['PERCENT', 'POINTS', 'CRITICAL_FAIL']);
const ResponseTypeEnum = z.enum([
  'PASS_FAIL_NA',
  'YES_NO_NA',
  'OK_FAIL',
  'NUMBER',
  'TEXT',
  'SELECT',
  'MULTI_SELECT',
  'RATING',
  'DATE',
  'TIME'
]);
const CriticalityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const PhotoRequirementEnum = z.enum(['NEVER', 'ALWAYS', 'ON_FAIL', 'ON_PASS', 'ON_NA']);
const RunStatusEnum = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const AnswerStatusEnum = z.enum(['PASS', 'FAIL', 'NA', 'INFO']);
const IssueStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED']);

const toNullableString = z.preprocess(
  (v) => (v === '' || v == null ? null : String(v)),
  z.string().nullable()
);

const toNullableNumber = z.preprocess(
  (v) => (v === '' || v == null ? null : Number(v)),
  z.number().nullable()
);

const boolish = z.preprocess((v) => {
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'si'].includes(s)) return true;
    if (['false', '0', 'no'].includes(s)) return false;
  }
  return v;
}, z.boolean());

const jsonObject = z.record(z.any()).optional().default({});
const jsonArray = z.array(z.any()).optional().default([]);

const questionInputSchema = z.object({
  id: z.string().uuid().optional(),
  section: toNullableString.optional(),
  text: z.string().min(1).max(1000),
  help_text: toNullableString.optional(),
  response_type: ResponseTypeEnum.optional().default('PASS_FAIL_NA'),
  required: boolish.optional().default(true),
  weight: z.coerce.number().min(0).max(100).optional().default(1),
  criticality: CriticalityEnum.optional().default('MEDIUM'),
  expected_answer: toNullableString.optional(),
  min_value: toNullableNumber.optional(),
  max_value: toNullableNumber.optional(),
  options: jsonArray,
  require_photo: PhotoRequirementEnum.optional().default('NEVER'),
  order: z.coerce.number().int().min(0).optional()
});

const recurrenceSchema = z.object({
  type: RecurrenceEnum.optional().default('MONTHLY'),
  interval_days: z.coerce.number().int().min(1).max(3660).nullable().optional(),
  grace_days: z.coerce.number().int().min(0).max(365).optional().default(0),
  start_date: ymd.nullable().optional(),
  due_time: timeOnly.nullable().optional()
});

const scoringSchema = z.object({
  method: ScoringMethodEnum.optional().default('PERCENT'),
  passing_score: z.coerce.number().min(0).max(100000).optional().default(80)
});

const templateCreateSchema = z.object({
  code: z.string().min(2).max(80).optional(),
  title: z.string().min(2).max(255),
  description: toNullableString.optional(),
  category: z.string().min(1).max(100).optional().default('GENERAL'),
  location_scope: toNullableString.optional(),
  asset_type: toNullableString.optional(),
  recurrence: recurrenceSchema.optional().default({ type: 'MONTHLY' }),
  estimated_minutes: z.coerce.number().int().min(1).max(1440).nullable().optional(),
  scoring: scoringSchema.optional().default({ method: 'PERCENT', passing_score: 80 }),
  requires_signature: boolish.optional().default(false),
  active: boolish.optional().default(true),
  metadata: jsonObject,
  created_by: z.coerce.number().int().positive().nullable().optional(),
  questions: z.array(questionInputSchema).min(1).optional().default([])
});

const templatePatchSchema = templateCreateSchema
  .omit({ questions: true, created_by: true })
  .partial()
  .extend({
    updated_by: z.coerce.number().int().positive().nullable().optional()
  });

const runCreateSchema = z.object({
  checklist_id: z.string().uuid(),
  scheduled_for: z.string().min(1).nullable().optional(),
  start_now: boolish.optional().default(false),
  inspector_id: z.coerce.number().int().positive().nullable().optional(),
  inspector_name: toNullableString.optional(),
  target_area: toNullableString.optional(),
  target_room_id: z.coerce.number().int().positive().nullable().optional(),
  target_asset_code: toNullableString.optional(),
  notes: toNullableString.optional(),
  created_by: z.coerce.number().int().positive().nullable().optional()
});

const runPatchSchema = z.object({
  status: RunStatusEnum.optional(),
  scheduled_for: z.string().min(1).nullable().optional(),
  started_at: z.string().min(1).nullable().optional(),
  completed_at: z.string().min(1).nullable().optional(),
  inspector_id: z.coerce.number().int().positive().nullable().optional(),
  inspector_name: toNullableString.optional(),
  target_area: toNullableString.optional(),
  target_room_id: z.coerce.number().int().positive().nullable().optional(),
  target_asset_code: toNullableString.optional(),
  score: toNullableNumber.optional(),
  max_score: toNullableNumber.optional(),
  passed: boolish.nullable().optional(),
  notes: toNullableString.optional(),
  signature_url: z.string().url().nullable().optional()
});

const answerInputSchema = z.object({
  question_id: z.string().uuid(),
  answer_value: toNullableString.optional(),
  numeric_value: toNullableNumber.optional(),
  answer_status: AnswerStatusEnum.nullable().optional(),
  score_awarded: toNullableNumber.optional(),
  comment: toNullableString.optional(),
  photo_urls: z.array(z.string().url()).optional().default([]),
  answered_by: z.coerce.number().int().positive().nullable().optional()
});

const answerCreateSchema = answerInputSchema.extend({
  run_id: z.string().uuid()
});

const answerPatchSchema = answerInputSchema.partial();

const answersBodySchema = z.object({
  answers: z.array(answerInputSchema).min(1)
});

const completeRunSchema = z.object({
  answers: z.array(answerInputSchema).optional(),
  completed_at: z.string().min(1).nullable().optional(),
  inspector_id: z.coerce.number().int().positive().nullable().optional(),
  inspector_name: toNullableString.optional(),
  notes: toNullableString.optional(),
  signature_url: z.string().url().nullable().optional(),
  create_issues: boolish.optional().default(true)
});

const issuePatchSchema = z.object({
  status: IssueStatusEnum.optional(),
  severity: CriticalityEnum.optional(),
  title: z.string().min(1).max(255).optional(),
  description: toNullableString.optional(),
  assigned_to: z.coerce.number().int().positive().nullable().optional(),
  due_at: z.string().min(1).nullable().optional(),
  closed_by: z.coerce.number().int().positive().nullable().optional(),
  close_comment: toNullableString.optional()
});

const issueCreateSchema = z.object({
  run_id: z.string().uuid(),
  question_id: z.string().uuid().nullable().optional(),
  severity: CriticalityEnum.optional().default('MEDIUM'),
  status: IssueStatusEnum.optional().default('OPEN'),
  title: z.string().min(1).max(255),
  description: toNullableString.optional(),
  photo_urls: z.array(z.string().url()).optional().default([]),
  assigned_to: z.coerce.number().int().positive().nullable().optional(),
  due_at: z.string().min(1).nullable().optional()
});

function handleError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'invalid_payload', details: err.flatten() });
  }
  return next(err);
}

function toSqlDateTime(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `${input} 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(input)) return input.slice(0, 19);
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function sqlNow() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
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

function normalizeCode(input?: string, title?: string) {
  const raw = input || title || `FLS-${Date.now().toString(36)}`;
  const code = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return code || `FLS-${Date.now().toString(36).toUpperCase()}`;
}

async function existingSupervisorId(conn: any, id?: number | null) {
  if (id == null) return null;
  const [[row]]: any = await conn.query('SELECT id FROM supervisors WHERE id=? LIMIT 1', [id]);
  return row?.id ?? null;
}

function recurrenceDays(type: z.infer<typeof RecurrenceEnum>, customDays?: number | null) {
  switch (type) {
    case 'DAILY': return 1;
    case 'WEEKLY': return 7;
    case 'MONTHLY': return 30;
    case 'QUARTERLY': return 90;
    case 'SEMIANNUAL': return 182;
    case 'ANNUAL': return 365;
    case 'CUSTOM_DAYS': return customDays || null;
    default: return null;
  }
}

function computeNextDue({
  recurrenceType,
  intervalDays,
  completedAt,
  startDate,
  dueTime
}: {
  recurrenceType: z.infer<typeof RecurrenceEnum>;
  intervalDays?: number | null;
  completedAt?: string | null;
  startDate?: string | null;
  dueTime?: string | null;
}) {
  const days = recurrenceDays(recurrenceType, intervalDays);
  if (!days) return null;

  const baseSql = toSqlDateTime(completedAt) || (startDate ? `${startDate} 00:00:00` : sqlNow());
  const base = new Date(baseSql.replace(' ', 'T') + 'Z');
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + days);
  const date = base.toISOString().slice(0, 10);
  const time = dueTime ? dueTime.slice(0, 8).padEnd(8, ':00') : base.toISOString().slice(11, 19);
  return `${date} ${time}`;
}

function mapTemplate(row: any) {
  if (!row) return null;
  return {
    ...row,
    active: toBool(row.active),
    requires_signature: toBool(row.requires_signature),
    metadata: parseJson(row.metadata_json, {}),
    recurrence: {
      type: row.recurrence_type,
      interval_days: row.recurrence_interval_days,
      grace_days: row.grace_days,
      start_date: row.start_date,
      due_time: row.due_time
    },
    scoring: {
      method: row.scoring_method,
      passing_score: row.passing_score == null ? null : Number(row.passing_score)
    },
    metadata_json: undefined
  };
}

function mapQuestion(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    checklist_id: row.checklist_id,
    section: row.section_title,
    text: row.question_text,
    help_text: row.help_text,
    response_type: row.response_type,
    required: toBool(row.is_required),
    weight: row.weight == null ? 0 : Number(row.weight),
    criticality: row.criticality,
    expected_answer: row.expected_answer,
    min_value: row.min_value == null ? null : Number(row.min_value),
    max_value: row.max_value == null ? null : Number(row.max_value),
    options: parseJson(row.options_json, []),
    require_photo: row.require_photo,
    order: row.sort_order,
    active: toBool(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapRun(row: any) {
  if (!row) return null;
  return {
    ...row,
    score: row.score == null ? null : Number(row.score),
    max_score: row.max_score == null ? null : Number(row.max_score),
    passed: row.passed == null ? null : toBool(row.passed)
  };
}

function mapAnswer(row: any) {
  if (!row) return null;
  return {
    ...row,
    numeric_value: row.numeric_value == null ? null : Number(row.numeric_value),
    score_awarded: row.score_awarded == null ? null : Number(row.score_awarded),
    photo_urls: parseJson(row.photo_urls_json, []),
    photo_urls_json: undefined
  };
}

function mapIssue(row: any) {
  if (!row) return null;
  return {
    ...row,
    photo_urls: parseJson(row.photo_urls_json, []),
    photo_urls_json: undefined
  };
}

async function fetchTemplate(conn: any, id: string, includeInactiveQuestions = false) {
  const [[template]]: any = await conn.query(
    `SELECT c.*,
            s.nombre AS last_completed_by_name,
            cb.nombre AS created_by_name
       FROM fls_checklists c
       LEFT JOIN supervisors s ON s.id = c.last_completed_by
       LEFT JOIN supervisors cb ON cb.id = c.created_by
      WHERE c.id = ?`,
    [id]
  );
  if (!template) return null;

  const [questions]: any = await conn.query(
    `SELECT *
       FROM fls_checklist_questions
      WHERE checklist_id = ?
        ${includeInactiveQuestions ? '' : 'AND is_active = 1'}
      ORDER BY sort_order ASC, id ASC`,
    [id]
  );

  return {
    ...mapTemplate(template),
    questions: questions.map(mapQuestion)
  };
}

async function insertQuestion(conn: any, checklistId: string, input: z.infer<typeof questionInputSchema>, index: number) {
  const id = input.id || uuidv4();
  await conn.query(
    `INSERT INTO fls_checklist_questions
      (id, checklist_id, section_title, question_text, help_text, response_type,
       is_required, weight, criticality, expected_answer, min_value, max_value,
       options_json, require_photo, sort_order, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
     ON DUPLICATE KEY UPDATE
       section_title=VALUES(section_title),
       question_text=VALUES(question_text),
       help_text=VALUES(help_text),
       response_type=VALUES(response_type),
       is_required=VALUES(is_required),
       weight=VALUES(weight),
       criticality=VALUES(criticality),
       expected_answer=VALUES(expected_answer),
       min_value=VALUES(min_value),
       max_value=VALUES(max_value),
       options_json=VALUES(options_json),
       require_photo=VALUES(require_photo),
       sort_order=VALUES(sort_order),
       is_active=1`,
    [
      id,
      checklistId,
      input.section ?? null,
      input.text,
      input.help_text ?? null,
      input.response_type,
      input.required ? 1 : 0,
      input.weight,
      input.criticality,
      input.expected_answer ?? null,
      input.min_value ?? null,
      input.max_value ?? null,
      JSON.stringify(input.options || []),
      input.require_photo,
      input.order ?? index + 1
    ]
  );
  return id;
}

async function upsertAnswers(conn: any, runId: string, answers: Array<z.infer<typeof answerInputSchema>>) {
  for (const answer of answers) {
    const id = uuidv4();
    const answeredBy = await existingSupervisorId(conn, answer.answered_by ?? null);
    await conn.query(
      `INSERT INTO fls_checklist_answers
        (id, run_id, question_id, answer_value, numeric_value, answer_status,
         score_awarded, comment, photo_urls_json, answered_by, answered_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,NOW())
       ON DUPLICATE KEY UPDATE
         answer_value=VALUES(answer_value),
         numeric_value=VALUES(numeric_value),
         answer_status=VALUES(answer_status),
         score_awarded=VALUES(score_awarded),
         comment=VALUES(comment),
         photo_urls_json=VALUES(photo_urls_json),
         answered_by=VALUES(answered_by),
         answered_at=NOW()`,
      [
        id,
        runId,
        answer.question_id,
        answer.answer_value ?? null,
        answer.numeric_value ?? null,
        answer.answer_status ?? null,
        answer.score_awarded ?? null,
        answer.comment ?? null,
        JSON.stringify(answer.photo_urls || []),
        answeredBy
      ]
    );
  }
}

function inferAnswerStatus(question: any, answer: any): z.infer<typeof AnswerStatusEnum> | null {
  if (!answer) return question.is_required ? 'FAIL' : null;
  if (answer.answer_status) return answer.answer_status;

  const raw = String(answer.answer_value || '').trim().toUpperCase();
  if (['NA', 'N/A', 'NO APLICA'].includes(raw)) return 'NA';
  if (['PASS', 'YES', 'SI', 'OK', 'TRUE', 'CUMPLE'].includes(raw)) return 'PASS';
  if (['FAIL', 'NO', 'FALSE', 'FALLA', 'NO CUMPLE'].includes(raw)) return 'FAIL';

  if (question.response_type === 'NUMBER') {
    const n = answer.numeric_value == null ? Number(answer.answer_value) : Number(answer.numeric_value);
    if (!Number.isFinite(n)) return question.is_required ? 'FAIL' : null;
    if (question.min_value != null && n < Number(question.min_value)) return 'FAIL';
    if (question.max_value != null && n > Number(question.max_value)) return 'FAIL';
    return 'PASS';
  }

  if (raw || answer.comment || parseJson<string[]>(answer.photo_urls_json, []).length) return 'PASS';
  return question.is_required ? 'FAIL' : null;
}

async function calculateRunScore(conn: any, runId: string) {
  const [[run]]: any = await conn.query(
    `SELECT r.*, c.scoring_method, c.passing_score
       FROM fls_checklist_runs r
       JOIN fls_checklists c ON c.id = r.checklist_id
      WHERE r.id = ?`,
    [runId]
  );
  if (!run) return null;

  const [questions]: any = await conn.query(
    `SELECT *
       FROM fls_checklist_questions
      WHERE checklist_id = ? AND is_active = 1
      ORDER BY sort_order ASC, id ASC`,
    [run.checklist_id]
  );
  const [answers]: any = await conn.query(
    `SELECT *
       FROM fls_checklist_answers
      WHERE run_id = ?`,
    [runId]
  );

  const byQuestion = new Map<string, any>();
  answers.forEach((a: any) => byQuestion.set(a.question_id, a));

  let maxScore = 0;
  let score = 0;
  let criticalFailed = false;
  const failedQuestions: any[] = [];

  for (const question of questions) {
    const answer = byQuestion.get(question.id);
    const status = inferAnswerStatus(question, answer);
    if (status === 'NA') continue;

    const weight = Number(question.weight || 0);
    maxScore += weight;

    if (status === 'PASS' || status === 'INFO') {
      score += answer?.score_awarded != null ? Number(answer.score_awarded) : weight;
    } else if (status === 'FAIL') {
      if (question.criticality === 'CRITICAL') criticalFailed = true;
      failedQuestions.push({ question, answer });
    }
  }

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 100;
  const passingScore = Number(run.passing_score ?? 80);
  const passed = run.scoring_method === 'CRITICAL_FAIL'
    ? percent >= passingScore && !criticalFailed
    : percent >= passingScore;

  return { run, score, maxScore, percent, passed, criticalFailed, failedQuestions };
}

/* ===========================
   Dashboard
   =========================== */

router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await withConn(async (conn) => {
      const [[due]]: any = await conn.query(
        `SELECT
           SUM(next_due_at IS NOT NULL AND next_due_at < NOW()) AS overdue,
           SUM(next_due_at IS NOT NULL AND next_due_at >= NOW() AND next_due_at < DATE_ADD(NOW(), INTERVAL 7 DAY)) AS due_soon,
           COUNT(*) AS active_templates
         FROM fls_checklists
         WHERE active = 1`
      );
      const [[runs]]: any = await conn.query(
        `SELECT
           SUM(status='SCHEDULED') AS scheduled,
           SUM(status='IN_PROGRESS') AS in_progress,
           SUM(status='COMPLETED') AS completed
         FROM fls_checklist_runs`
      );
      const [[issues]]: any = await conn.query(
        `SELECT
           SUM(status IN ('OPEN','IN_PROGRESS')) AS open_issues,
           SUM(status IN ('OPEN','IN_PROGRESS') AND severity='CRITICAL') AS critical_open
         FROM fls_checklist_issues`
      );
      const [recentRuns]: any = await conn.query(
        `SELECT r.id, r.status, r.completed_at, r.score, r.max_score, r.passed,
                c.title AS checklist_title, s.nombre AS inspector_name
           FROM fls_checklist_runs r
           JOIN fls_checklists c ON c.id = r.checklist_id
           LEFT JOIN supervisors s ON s.id = r.inspector_id
          ORDER BY COALESCE(r.completed_at, r.started_at, r.created_at) DESC
          LIMIT 10`
      );
      return { due, runs, issues, recentRuns: recentRuns.map(mapRun) };
    });
    res.json(data);
  } catch (err) {
    handleError(err, res, next);
  }
});

/* ===========================
   Checklist templates
   =========================== */

router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const active = req.query.active == null ? null : String(req.query.active);
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : null;
    const includeQuestions = String(req.query.includeQuestions || '').toLowerCase() === 'true';

    const result = await withConn(async (conn) => {
      const where: string[] = [];
      const args: any[] = [];
      if (active === 'true' || active === '1') where.push('c.active = 1');
      if (active === 'false' || active === '0') where.push('c.active = 0');
      if (category) {
        where.push('c.category = ?');
        args.push(category);
      }
      if (q) {
        where.push('(c.title LIKE ? OR c.code LIKE ? OR c.description LIKE ?)');
        args.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const [rows]: any = await conn.query(
        `SELECT c.*,
                s.nombre AS last_completed_by_name,
                cb.nombre AS created_by_name,
                COUNT(qs.id) AS questions_count
           FROM fls_checklists c
           LEFT JOIN supervisors s ON s.id = c.last_completed_by
           LEFT JOIN supervisors cb ON cb.id = c.created_by
           LEFT JOIN fls_checklist_questions qs
                  ON qs.checklist_id = c.id AND qs.is_active = 1
          ${whereSql}
          GROUP BY c.id
          ORDER BY c.active DESC, c.next_due_at IS NULL ASC, c.next_due_at ASC, c.title ASC`,
        args
      );

      const templates = rows.map((r: any) => mapTemplate(r));
      if (!includeQuestions) return templates;
      for (const template of templates) {
        const [questions]: any = await conn.query(
          `SELECT * FROM fls_checklist_questions WHERE checklist_id=? AND is_active=1 ORDER BY sort_order ASC, id ASC`,
          [template.id]
        );
        template.questions = questions.map(mapQuestion);
      }
      return templates;
    });

    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = templateCreateSchema.parse(req.body);
    const id = uuidv4();
    const recurrence = body.recurrence;
    const scoring = body.scoring;
    const nextDue = computeNextDue({
      recurrenceType: recurrence.type,
      intervalDays: recurrence.interval_days,
      startDate: recurrence.start_date ?? undefined,
      dueTime: recurrence.due_time ?? undefined
    });

    const template = await withConn(async (conn) => {
      await conn.beginTransaction();
      try {
        const createdBy = await existingSupervisorId(conn, body.created_by ?? null);
        await conn.query(
          `INSERT INTO fls_checklists
            (id, code, title, description, category, location_scope, asset_type,
             recurrence_type, recurrence_interval_days, grace_days, start_date, due_time,
             estimated_minutes, scoring_method, passing_score, requires_signature, active,
             metadata_json, next_due_at, created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id,
            normalizeCode(body.code, body.title),
            body.title,
            body.description ?? null,
            body.category,
            body.location_scope ?? null,
            body.asset_type ?? null,
            recurrence.type,
            recurrence.interval_days ?? null,
            recurrence.grace_days,
            recurrence.start_date ?? null,
            recurrence.due_time ?? null,
            body.estimated_minutes ?? null,
            scoring.method,
            scoring.passing_score,
            body.requires_signature ? 1 : 0,
            body.active ? 1 : 0,
            JSON.stringify(body.metadata || {}),
            nextDue,
            createdBy
          ]
        );

        for (let i = 0; i < body.questions.length; i += 1) {
          await insertQuestion(conn, id, body.questions[i], i);
        }

        await conn.commit();
        return await fetchTemplate(conn, id);
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    });

    getIO()?.emit('fls:templateCreated', { id });
    res.status(201).json(template);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const includeInactive = String(req.query.includeInactiveQuestions || '').toLowerCase() === 'true';
    const template = await withConn((conn) => fetchTemplate(conn, id, includeInactive));
    if (!template) return res.status(404).json({ error: 'not_found' });
    res.json(template);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = templatePatchSchema.parse(req.body);

    const template = await withConn(async (conn) => {
      const sets: string[] = [];
      const args: any[] = [];

      const add = (sql: string, value: any) => {
        sets.push(sql);
        args.push(value);
      };

      if (body.code !== undefined) add('code=?', normalizeCode(body.code));
      if (body.title !== undefined) add('title=?', body.title);
      if (body.description !== undefined) add('description=?', body.description);
      if (body.category !== undefined) add('category=?', body.category);
      if (body.location_scope !== undefined) add('location_scope=?', body.location_scope);
      if (body.asset_type !== undefined) add('asset_type=?', body.asset_type);
      if (body.estimated_minutes !== undefined) add('estimated_minutes=?', body.estimated_minutes);
      if (body.requires_signature !== undefined) add('requires_signature=?', body.requires_signature ? 1 : 0);
      if (body.active !== undefined) add('active=?', body.active ? 1 : 0);
      if (body.metadata !== undefined) add('metadata_json=?', JSON.stringify(body.metadata || {}));
      if (body.recurrence) {
        if (body.recurrence.type !== undefined) add('recurrence_type=?', body.recurrence.type);
        if (body.recurrence.interval_days !== undefined) add('recurrence_interval_days=?', body.recurrence.interval_days);
        if (body.recurrence.grace_days !== undefined) add('grace_days=?', body.recurrence.grace_days);
        if (body.recurrence.start_date !== undefined) add('start_date=?', body.recurrence.start_date);
        if (body.recurrence.due_time !== undefined) add('due_time=?', body.recurrence.due_time);
      }
      if (body.scoring) {
        if (body.scoring.method !== undefined) add('scoring_method=?', body.scoring.method);
        if (body.scoring.passing_score !== undefined) add('passing_score=?', body.scoring.passing_score);
      }

      if (sets.length) {
        args.push(id);
        const [r]: any = await conn.query(
          `UPDATE fls_checklists SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`,
          args
        );
        if (!r.affectedRows) return null;
      }

      return await fetchTemplate(conn, id);
    });

    if (!template) return res.status(404).json({ error: 'not_found' });
    getIO()?.emit('fls:templateUpdated', { id, changes: req.body });
    res.json(template);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/templates/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { active: activeBody } = z.object({ active: boolish.optional().default(false) }).parse(req.body || {});
    const active = activeBody ? 1 : 0;
    await withConn(async (conn) => {
      const [r]: any = await conn.query('UPDATE fls_checklists SET active=?, updated_at=NOW() WHERE id=?', [active, id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ id, active: !!active });
    });
    getIO()?.emit('fls:templateArchived', { id, active: !!active });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [r]: any = await conn.query('DELETE FROM fls_checklists WHERE id=?', [id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: r.affectedRows || 0 });
    });
    getIO()?.emit('fls:templateDeleted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.put('/templates/:id/questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { questions } = z.object({ questions: z.array(questionInputSchema).min(1) }).parse(req.body);

    const template = await withConn(async (conn) => {
      await conn.beginTransaction();
      try {
        const [[exists]]: any = await conn.query('SELECT id FROM fls_checklists WHERE id=?', [id]);
        if (!exists) {
          await conn.rollback();
          return null;
        }
        await conn.query('UPDATE fls_checklist_questions SET is_active=0 WHERE checklist_id=?', [id]);
        for (let i = 0; i < questions.length; i += 1) {
          await insertQuestion(conn, id, questions[i], i);
        }
        await conn.commit();
        return await fetchTemplate(conn, id);
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    });

    if (!template) return res.status(404).json({ error: 'not_found' });
    getIO()?.emit('fls:questionsReplaced', { id });
    res.json(template);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/templates/:id/questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const question = questionInputSchema.parse(req.body);
    const questionId = await withConn(async (conn) => {
      const [[exists]]: any = await conn.query('SELECT id FROM fls_checklists WHERE id=?', [id]);
      if (!exists) return null;
      const [[countRow]]: any = await conn.query(
        'SELECT COUNT(*) AS cnt FROM fls_checklist_questions WHERE checklist_id=? AND is_active=1',
        [id]
      );
      return await insertQuestion(conn, id, question, Number(countRow?.cnt || 0));
    });
    if (!questionId) return res.status(404).json({ error: 'not_found' });
    getIO()?.emit('fls:questionCreated', { checklist_id: id });
    res.status(201).json({ id: questionId });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/questions/:questionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questionId } = z.object({ questionId: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [[row]]: any = await conn.query(
        'SELECT * FROM fls_checklist_questions WHERE id=?',
        [questionId]
      );
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json(mapQuestion(row));
    });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/questions/:questionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questionId } = z.object({ questionId: z.string().uuid() }).parse(req.params);
    const body = questionInputSchema.partial().parse(req.body);
    const updated = await withConn(async (conn) => {
      const sets: string[] = [];
      const args: any[] = [];
      const add = (sql: string, value: any) => { sets.push(sql); args.push(value); };
      if (body.section !== undefined) add('section_title=?', body.section);
      if (body.text !== undefined) add('question_text=?', body.text);
      if (body.help_text !== undefined) add('help_text=?', body.help_text);
      if (body.response_type !== undefined) add('response_type=?', body.response_type);
      if (body.required !== undefined) add('is_required=?', body.required ? 1 : 0);
      if (body.weight !== undefined) add('weight=?', body.weight);
      if (body.criticality !== undefined) add('criticality=?', body.criticality);
      if (body.expected_answer !== undefined) add('expected_answer=?', body.expected_answer);
      if (body.min_value !== undefined) add('min_value=?', body.min_value);
      if (body.max_value !== undefined) add('max_value=?', body.max_value);
      if (body.options !== undefined) add('options_json=?', JSON.stringify(body.options || []));
      if (body.require_photo !== undefined) add('require_photo=?', body.require_photo);
      if (body.order !== undefined) add('sort_order=?', body.order);
      if (!sets.length) return true;
      args.push(questionId);
      const [r]: any = await conn.query(
        `UPDATE fls_checklist_questions SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`,
        args
      );
      return !!r.affectedRows;
    });
    if (!updated) return res.status(404).json({ error: 'not_found' });
    getIO()?.emit('fls:questionUpdated', { questionId });
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/questions/:questionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questionId } = z.object({ questionId: z.string().uuid() }).parse(req.params);
    const hard = String(req.query.hard || '').toLowerCase() === 'true';
    await withConn(async (conn) => {
      const [r]: any = hard
        ? await conn.query('DELETE FROM fls_checklist_questions WHERE id=?', [questionId])
        : await conn.query(
            'UPDATE fls_checklist_questions SET is_active=0, updated_at=NOW() WHERE id=?',
            [questionId]
          );
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true, deleted: hard ? r.affectedRows || 0 : 0, archived: !hard });
    });
    getIO()?.emit('fls:questionDeleted', { questionId });
  } catch (err) {
    handleError(err, res, next);
  }
});

/* ===========================
   Runs / executions
   =========================== */

router.get('/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      checklist_id: z.string().uuid().optional(),
      status: RunStatusEnum.optional(),
      from: ymd.optional(),
      to: ymd.optional(),
      inspector_id: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().min(1).max(500).optional().default(100)
    }).parse(req.query);

    const rows = await withConn(async (conn) => {
      const where: string[] = [];
      const args: any[] = [];
      if (q.checklist_id) { where.push('r.checklist_id=?'); args.push(q.checklist_id); }
      if (q.status) { where.push('r.status=?'); args.push(q.status); }
      if (q.from) { where.push('COALESCE(r.completed_at, r.started_at, r.scheduled_for, r.created_at) >= ?'); args.push(`${q.from} 00:00:00`); }
      if (q.to) { where.push('COALESCE(r.completed_at, r.started_at, r.scheduled_for, r.created_at) < DATE_ADD(?, INTERVAL 1 DAY)'); args.push(q.to); }
      if (q.inspector_id) { where.push('r.inspector_id=?'); args.push(q.inspector_id); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [data]: any = await conn.query(
        `SELECT r.*, c.title AS checklist_title, c.code AS checklist_code,
                s.nombre AS inspector_nombre, room.numero AS room_number
           FROM fls_checklist_runs r
           JOIN fls_checklists c ON c.id = r.checklist_id
           LEFT JOIN supervisors s ON s.id = r.inspector_id
           LEFT JOIN rooms room ON room.id = r.target_room_id
          ${whereSql}
          ORDER BY COALESCE(r.completed_at, r.started_at, r.scheduled_for, r.created_at) DESC
          LIMIT ?`,
        [...args, q.limit]
      );
      return data.map(mapRun);
    });

    res.json(rows);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = runCreateSchema.parse(req.body);
    const id = uuidv4();
    const status = body.start_now ? 'IN_PROGRESS' : 'SCHEDULED';
    const scheduledFor = toSqlDateTime(body.scheduled_for ?? null);
    const startedAt = body.start_now ? sqlNow() : null;

    const run = await withConn(async (conn) => {
      const [[template]]: any = await conn.query('SELECT id FROM fls_checklists WHERE id=? AND active=1', [body.checklist_id]);
      if (!template) return null;
      const inspectorId = await existingSupervisorId(conn, body.inspector_id ?? null);
      const createdBy = await existingSupervisorId(conn, body.created_by ?? null);
      await conn.query(
        `INSERT INTO fls_checklist_runs
          (id, checklist_id, status, scheduled_for, started_at, inspector_id, inspector_name,
           target_area, target_room_id, target_asset_code, notes, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          body.checklist_id,
          status,
          scheduledFor,
          startedAt,
          inspectorId,
          body.inspector_name ?? null,
          body.target_area ?? null,
          body.target_room_id ?? null,
          body.target_asset_code ?? null,
          body.notes ?? null,
          createdBy
        ]
      );
      const [[created]]: any = await conn.query('SELECT * FROM fls_checklist_runs WHERE id=?', [id]);
      return mapRun(created);
    });

    if (!run) return res.status(404).json({ error: 'checklist_not_found_or_inactive' });
    getIO()?.emit('fls:runCreated', { id, checklist_id: body.checklist_id });
    res.status(201).json(run);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const detail = await withConn(async (conn) => {
      const [[run]]: any = await conn.query(
        `SELECT r.*, c.title AS checklist_title, c.code AS checklist_code,
                s.nombre AS inspector_nombre, room.numero AS room_number
           FROM fls_checklist_runs r
           JOIN fls_checklists c ON c.id = r.checklist_id
           LEFT JOIN supervisors s ON s.id = r.inspector_id
           LEFT JOIN rooms room ON room.id = r.target_room_id
          WHERE r.id=?`,
        [id]
      );
      if (!run) return null;
      const [questions]: any = await conn.query(
        `SELECT * FROM fls_checklist_questions WHERE checklist_id=? ORDER BY sort_order ASC, id ASC`,
        [run.checklist_id]
      );
      const [answers]: any = await conn.query(
        `SELECT * FROM fls_checklist_answers WHERE run_id=?`,
        [id]
      );
      const [issues]: any = await conn.query(
        `SELECT i.*, q.question_text
           FROM fls_checklist_issues i
           LEFT JOIN fls_checklist_questions q ON q.id = i.question_id
          WHERE i.run_id=?
          ORDER BY i.created_at DESC`,
        [id]
      );
      return {
        ...mapRun(run),
        questions: questions.map(mapQuestion),
        answers: answers.map(mapAnswer),
        issues: issues.map(mapIssue)
      };
    });

    if (!detail) return res.status(404).json({ error: 'not_found' });
    res.json(detail);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = runPatchSchema.parse(req.body || {});
    const run = await withConn(async (conn) => {
      const sets: string[] = [];
      const args: any[] = [];
      const add = (sql: string, value: any) => { sets.push(sql); args.push(value); };

      if (body.status !== undefined) add('status=?', body.status);
      if (body.scheduled_for !== undefined) add('scheduled_for=?', toSqlDateTime(body.scheduled_for));
      if (body.started_at !== undefined) add('started_at=?', toSqlDateTime(body.started_at));
      if (body.completed_at !== undefined) add('completed_at=?', toSqlDateTime(body.completed_at));
      if (body.inspector_id !== undefined) {
        const inspectorId = await existingSupervisorId(conn, body.inspector_id);
        add('inspector_id=?', inspectorId);
      }
      if (body.inspector_name !== undefined) add('inspector_name=?', body.inspector_name);
      if (body.target_area !== undefined) add('target_area=?', body.target_area);
      if (body.target_room_id !== undefined) add('target_room_id=?', body.target_room_id);
      if (body.target_asset_code !== undefined) add('target_asset_code=?', body.target_asset_code);
      if (body.score !== undefined) add('score=?', body.score);
      if (body.max_score !== undefined) add('max_score=?', body.max_score);
      if (body.passed !== undefined) add('passed=?', body.passed == null ? null : body.passed ? 1 : 0);
      if (body.notes !== undefined) add('notes=?', body.notes);
      if (body.signature_url !== undefined) add('signature_url=?', body.signature_url);

      if (!sets.length) {
        const [[current]]: any = await conn.query('SELECT * FROM fls_checklist_runs WHERE id=?', [id]);
        return mapRun(current);
      }

      args.push(id);
      const [r]: any = await conn.query(
        `UPDATE fls_checklist_runs SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`,
        args
      );
      if (!r.affectedRows) return null;
      const [[updated]]: any = await conn.query('SELECT * FROM fls_checklist_runs WHERE id=?', [id]);
      return mapRun(updated);
    });

    if (!run) return res.status(404).json({ error: 'not_found' });
    getIO()?.emit('fls:runUpdated', { id, changes: req.body });
    res.json(run);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [r]: any = await conn.query('DELETE FROM fls_checklist_runs WHERE id=?', [id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: r.affectedRows || 0 });
    });
    getIO()?.emit('fls:runDeleted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/runs/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
      inspector_id: z.coerce.number().int().positive().nullable().optional(),
      inspector_name: toNullableString.optional()
    }).parse(req.body || {});

    await withConn(async (conn) => {
      const inspectorId = await existingSupervisorId(conn, body.inspector_id ?? null);
      const [r]: any = await conn.query(
        `UPDATE fls_checklist_runs
            SET status='IN_PROGRESS',
                started_at=COALESCE(started_at, NOW()),
                inspector_id=COALESCE(?, inspector_id),
                inspector_name=COALESCE(?, inspector_name),
                updated_at=NOW()
          WHERE id=? AND status IN ('SCHEDULED','IN_PROGRESS')`,
        [inspectorId, body.inspector_name ?? null, id]
      );
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found_or_not_startable' });
      res.json({ ok: true });
    });
    getIO()?.emit('fls:runStarted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/runs/:id/answers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [rows]: any = await conn.query(
        `SELECT a.*, q.question_text, q.section_title, q.sort_order
           FROM fls_checklist_answers a
           LEFT JOIN fls_checklist_questions q ON q.id = a.question_id
          WHERE a.run_id=?
          ORDER BY q.sort_order ASC, a.created_at ASC`,
        [id]
      );
      res.json(rows.map(mapAnswer));
    });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/runs/:id/answers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = answersBodySchema.parse(req.body);
    await withConn(async (conn) => {
      const [[run]]: any = await conn.query('SELECT id FROM fls_checklist_runs WHERE id=?', [id]);
      if (!run) return res.status(404).json({ error: 'run_not_found' });
      await upsertAnswers(conn, id, body.answers);
      await conn.query(
        `UPDATE fls_checklist_runs
            SET status=IF(status='SCHEDULED','IN_PROGRESS',status),
                started_at=COALESCE(started_at, NOW()),
                updated_at=NOW()
          WHERE id=?`,
        [id]
      );
      res.json({ ok: true, saved: body.answers.length });
    });
    getIO()?.emit('fls:answersSaved', { id, count: body.answers.length });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/answers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = answerCreateSchema.parse(req.body);
    const id = uuidv4();
    const answer = await withConn(async (conn) => {
      const [[run]]: any = await conn.query('SELECT id FROM fls_checklist_runs WHERE id=?', [body.run_id]);
      if (!run) return null;
      const answeredBy = await existingSupervisorId(conn, body.answered_by ?? null);
      await conn.query(
        `INSERT INTO fls_checklist_answers
          (id, run_id, question_id, answer_value, numeric_value, answer_status,
           score_awarded, comment, photo_urls_json, answered_by, answered_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
        [
          id,
          body.run_id,
          body.question_id,
          body.answer_value ?? null,
          body.numeric_value ?? null,
          body.answer_status ?? null,
          body.score_awarded ?? null,
          body.comment ?? null,
          JSON.stringify(body.photo_urls || []),
          answeredBy
        ]
      );
      const [[created]]: any = await conn.query('SELECT * FROM fls_checklist_answers WHERE id=?', [id]);
      return mapAnswer(created);
    });
    if (!answer) return res.status(404).json({ error: 'run_not_found' });
    getIO()?.emit('fls:answerCreated', { id, run_id: body.run_id });
    res.status(201).json(answer);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/answers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [[row]]: any = await conn.query(
        `SELECT a.*, q.question_text, q.section_title
           FROM fls_checklist_answers a
           LEFT JOIN fls_checklist_questions q ON q.id = a.question_id
          WHERE a.id=?`,
        [id]
      );
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json(mapAnswer(row));
    });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/answers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = answerPatchSchema.parse(req.body || {});
    const answer = await withConn(async (conn) => {
      const sets: string[] = [];
      const args: any[] = [];
      const add = (sql: string, value: any) => { sets.push(sql); args.push(value); };

      if (body.question_id !== undefined) add('question_id=?', body.question_id);
      if (body.answer_value !== undefined) add('answer_value=?', body.answer_value);
      if (body.numeric_value !== undefined) add('numeric_value=?', body.numeric_value);
      if (body.answer_status !== undefined) add('answer_status=?', body.answer_status);
      if (body.score_awarded !== undefined) add('score_awarded=?', body.score_awarded);
      if (body.comment !== undefined) add('comment=?', body.comment);
      if (body.photo_urls !== undefined) add('photo_urls_json=?', JSON.stringify(body.photo_urls || []));
      if (body.answered_by !== undefined) {
        const answeredBy = await existingSupervisorId(conn, body.answered_by);
        add('answered_by=?', answeredBy);
      }
      if (sets.length) sets.push('answered_at=NOW()');

      if (!sets.length) {
        const [[current]]: any = await conn.query('SELECT * FROM fls_checklist_answers WHERE id=?', [id]);
        return mapAnswer(current);
      }

      args.push(id);
      const [r]: any = await conn.query(
        `UPDATE fls_checklist_answers SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`,
        args
      );
      if (!r.affectedRows) return null;
      const [[updated]]: any = await conn.query('SELECT * FROM fls_checklist_answers WHERE id=?', [id]);
      return mapAnswer(updated);
    });

    if (!answer) return res.status(404).json({ error: 'not_found' });
    getIO()?.emit('fls:answerUpdated', { id, changes: req.body });
    res.json(answer);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/answers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [r]: any = await conn.query('DELETE FROM fls_checklist_answers WHERE id=?', [id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: r.affectedRows || 0 });
    });
    getIO()?.emit('fls:answerDeleted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/runs/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = completeRunSchema.parse(req.body || {});

    const result = await withConn(async (conn) => {
      await conn.beginTransaction();
      try {
        const [[run]]: any = await conn.query(
          `SELECT r.*, c.recurrence_type, c.recurrence_interval_days, c.start_date, c.due_time
             FROM fls_checklist_runs r
             JOIN fls_checklists c ON c.id = r.checklist_id
            WHERE r.id=?`,
          [id]
        );
        if (!run) {
          await conn.rollback();
          return null;
        }

        if (body.answers?.length) await upsertAnswers(conn, id, body.answers);

        const scoreData = await calculateRunScore(conn, id);
        if (!scoreData) {
          await conn.rollback();
          return null;
        }

        const completedAt = toSqlDateTime(body.completed_at ?? null) || sqlNow();
        const inspectorId = await existingSupervisorId(conn, body.inspector_id ?? run.inspector_id ?? null);
        await conn.query(
          `UPDATE fls_checklist_runs
              SET status='COMPLETED',
                  completed_at=?,
                  inspector_id=COALESCE(?, inspector_id),
                  inspector_name=COALESCE(?, inspector_name),
                  notes=COALESCE(?, notes),
                  signature_url=COALESCE(?, signature_url),
                  score=?,
                  max_score=?,
                  passed=?,
                  updated_at=NOW()
            WHERE id=?`,
          [
            completedAt,
            inspectorId,
            body.inspector_name ?? null,
            body.notes ?? null,
            body.signature_url ?? null,
            scoreData.percent,
            100,
            scoreData.passed ? 1 : 0,
            id
          ]
        );

        const nextDue = computeNextDue({
          recurrenceType: run.recurrence_type,
          intervalDays: run.recurrence_interval_days,
          completedAt,
          startDate: run.start_date,
          dueTime: run.due_time
        });

        await conn.query(
          `UPDATE fls_checklists
              SET last_completed_run_id=?,
                  last_completed_at=?,
                  last_completed_by=COALESCE(?, last_completed_by),
                  next_due_at=?,
                  updated_at=NOW()
            WHERE id=?`,
          [id, completedAt, inspectorId, nextDue, run.checklist_id]
        );

        if (body.create_issues) {
          for (const failed of scoreData.failedQuestions) {
            const question = failed.question;
            if (!['HIGH', 'CRITICAL'].includes(question.criticality)) continue;
            const issueId = uuidv4();
            const photoUrls = parseJson<string[]>(failed.answer?.photo_urls_json, []);
            await conn.query(
              `INSERT INTO fls_checklist_issues
                (id, run_id, question_id, severity, status, title, description, photo_urls_json)
               VALUES (?,?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE
                 severity=VALUES(severity),
                 status=IF(status='CLOSED', status, 'OPEN'),
                 description=VALUES(description),
                 photo_urls_json=VALUES(photo_urls_json),
                 updated_at=NOW()`,
              [
                issueId,
                id,
                question.id,
                question.criticality,
                'OPEN',
                `FLS: ${question.question_text}`.slice(0, 255),
                failed.answer?.comment || 'Respuesta no conforme en checklist FLS',
                JSON.stringify(photoUrls)
              ]
            );
          }
        }

        await conn.commit();
        return { id, score: scoreData.percent, passed: scoreData.passed, next_due_at: nextDue };
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    });

    if (!result) return res.status(404).json({ error: 'run_not_found' });
    getIO()?.emit('fls:runCompleted', result);
    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/runs/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { notes } = z.object({ notes: toNullableString.optional() }).parse(req.body || {});
    await withConn(async (conn) => {
      const [r]: any = await conn.query(
        `UPDATE fls_checklist_runs
            SET status='CANCELLED', notes=COALESCE(?, notes), updated_at=NOW()
          WHERE id=? AND status <> 'COMPLETED'`,
        [notes ?? null, id]
      );
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found_or_not_cancellable' });
      res.json({ ok: true });
    });
    getIO()?.emit('fls:runCancelled', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

/* ===========================
   Issues / corrective actions
   =========================== */

router.get('/issues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.object({
      status: IssueStatusEnum.optional(),
      severity: CriticalityEnum.optional(),
      assigned_to: z.coerce.number().int().positive().optional(),
      checklist_id: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(500).optional().default(100)
    }).parse(req.query);

    const rows = await withConn(async (conn) => {
      const where: string[] = [];
      const args: any[] = [];
      if (q.status) { where.push('i.status=?'); args.push(q.status); }
      if (q.severity) { where.push('i.severity=?'); args.push(q.severity); }
      if (q.assigned_to) { where.push('i.assigned_to=?'); args.push(q.assigned_to); }
      if (q.checklist_id) { where.push('r.checklist_id=?'); args.push(q.checklist_id); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const [data]: any = await conn.query(
        `SELECT i.*, q.question_text, c.title AS checklist_title, r.completed_at, s.nombre AS assigned_to_name
           FROM fls_checklist_issues i
           JOIN fls_checklist_runs r ON r.id = i.run_id
           JOIN fls_checklists c ON c.id = r.checklist_id
           LEFT JOIN fls_checklist_questions q ON q.id = i.question_id
           LEFT JOIN supervisors s ON s.id = i.assigned_to
          ${whereSql}
          ORDER BY FIELD(i.status,'OPEN','IN_PROGRESS','CLOSED','CANCELLED'), FIELD(i.severity,'CRITICAL','HIGH','MEDIUM','LOW'), i.created_at DESC
          LIMIT ?`,
        [...args, q.limit]
      );
      return data.map(mapIssue);
    });

    res.json(rows);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.post('/issues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = issueCreateSchema.parse(req.body || {});
    const id = uuidv4();
    const issue = await withConn(async (conn) => {
      const [[run]]: any = await conn.query('SELECT id FROM fls_checklist_runs WHERE id=?', [body.run_id]);
      if (!run) return null;
      const assignedTo = await existingSupervisorId(conn, body.assigned_to ?? null);
      await conn.query(
        `INSERT INTO fls_checklist_issues
          (id, run_id, question_id, severity, status, title, description, photo_urls_json, assigned_to, due_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          body.run_id,
          body.question_id ?? null,
          body.severity,
          body.status,
          body.title,
          body.description ?? null,
          JSON.stringify(body.photo_urls || []),
          assignedTo,
          toSqlDateTime(body.due_at ?? null)
        ]
      );
      const [[created]]: any = await conn.query('SELECT * FROM fls_checklist_issues WHERE id=?', [id]);
      return mapIssue(created);
    });
    if (!issue) return res.status(404).json({ error: 'run_not_found' });
    getIO()?.emit('fls:issueCreated', { id, run_id: body.run_id });
    res.status(201).json(issue);
  } catch (err) {
    handleError(err, res, next);
  }
});

router.get('/issues/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [[row]]: any = await conn.query(
        `SELECT i.*, q.question_text, c.title AS checklist_title, r.completed_at, s.nombre AS assigned_to_name
           FROM fls_checklist_issues i
           JOIN fls_checklist_runs r ON r.id = i.run_id
           JOIN fls_checklists c ON c.id = r.checklist_id
           LEFT JOIN fls_checklist_questions q ON q.id = i.question_id
           LEFT JOIN supervisors s ON s.id = i.assigned_to
          WHERE i.id=?`,
        [id]
      );
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json(mapIssue(row));
    });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.patch('/issues/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = issuePatchSchema.parse(req.body || {});
    await withConn(async (conn) => {
      const sets: string[] = [];
      const args: any[] = [];
      const add = (sql: string, value: any) => { sets.push(sql); args.push(value); };

      if (body.status !== undefined) add('status=?', body.status);
      if (body.severity !== undefined) add('severity=?', body.severity);
      if (body.title !== undefined) add('title=?', body.title);
      if (body.description !== undefined) add('description=?', body.description);
      if (body.assigned_to !== undefined) {
        const assignedTo = await existingSupervisorId(conn, body.assigned_to);
        add('assigned_to=?', assignedTo);
      }
      if (body.due_at !== undefined) add('due_at=?', toSqlDateTime(body.due_at));
      if (body.status === 'CLOSED') {
        sets.push('closed_at=NOW()');
        if (body.closed_by !== undefined) {
          const closedBy = await existingSupervisorId(conn, body.closed_by);
          add('closed_by=?', closedBy);
        }
        if (body.close_comment !== undefined) add('close_comment=?', body.close_comment);
      }

      if (!sets.length) return res.json({ ok: true });
      args.push(id);
      const [r]: any = await conn.query(
        `UPDATE fls_checklist_issues SET ${sets.join(', ')}, updated_at=NOW() WHERE id=?`,
        args
      );
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    });
    getIO()?.emit('fls:issueUpdated', { id, changes: req.body });
  } catch (err) {
    handleError(err, res, next);
  }
});

router.delete('/issues/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await withConn(async (conn) => {
      const [r]: any = await conn.query('DELETE FROM fls_checklist_issues WHERE id=?', [id]);
      if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: r.affectedRows || 0 });
    });
    getIO()?.emit('fls:issueDeleted', { id });
  } catch (err) {
    handleError(err, res, next);
  }
});

export default router;
