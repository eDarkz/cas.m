import { Router, Request, Response } from 'express';
import { withConn } from '../config/db.js';
import { logger } from '../config/logger.js';

const router = Router();

const ALLOWED_TYPES = ['ROEDOR', 'UV', 'OTRO'] as const;
const ALLOWED_CONDITIONS = ['BUENA', 'REGULAR', 'MALA'] as const;

// Helper para asegurar que el inspector/fumigador exista en pest_operators
async function ensurePestOperator(
  conn: any,
  nombre: string,
  empresa?: string | null
): Promise<number> {
  const cleanName = (nombre || '').trim();
  if (!cleanName) {
    throw new Error('Nombre de inspector requerido');
  }

  const [rows]: any[] = await conn.query(
    'SELECT id FROM pest_operators WHERE nombre = ? LIMIT 1',
    [cleanName]
  );

  if (rows.length > 0) {
    return rows[0].id as number;
  }

  const [result]: any = await conn.query(
    'INSERT INTO pest_operators (nombre, empresa) VALUES (?, ?)',
    [cleanName, empresa || null]
  );

  return result.insertId as number;
}

/* =========================================================
 *  CRUD BAIT_STATIONS
 * =======================================================*/

/**
 * GET /v1/fumigation/stations
 * Lista cebaderas / trampas UV con su última inspección.
 * Query opcionales:
 *   - type=ROEDOR|UV|OTRO
 *   - active=true|false|1|0
 */
router.get('/stations', async (req: Request, res: Response) => {
  try {
    await withConn(async (conn) => {
      const params: any[] = [];
      let sql = `
        SELECT
          bs.id, bs.code, bs.name, bs.type,
          bs.utm_x, bs.utm_y,
          bs.installed_at,
          bs.is_active,
          bs.created_at,
          li.id AS last_inspection_id,
          li.inspected_at AS last_inspected_at,
          li.has_bait AS last_has_bait,
          li.bait_replaced AS last_bait_replaced,
          li.location_ok AS last_location_ok,
          li.lat AS last_lat,
          li.lng AS last_lng,
          li.physical_condition AS last_physical_condition,
          li.photo_url AS last_photo_url,
          li.observations AS last_observations,
          po.nombre AS last_inspector_nombre,
          po.empresa AS last_inspector_empresa
        FROM bait_stations bs
        LEFT JOIN (
          SELECT
            station_id,
            id,
            inspected_at,
            has_bait,
            bait_replaced,
            location_ok,
            lat,
            lng,
            physical_condition,
            photo_url,
            observations,
            inspector_id,
            ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY inspected_at DESC) as rn
          FROM bait_station_inspections
        ) li ON bs.id = li.station_id AND li.rn = 1
        LEFT JOIN pest_operators po ON po.id = li.inspector_id
        WHERE 1=1
      `;

      const { type, active } = req.query;

      if (typeof type === 'string') {
        sql += ' AND bs.type = ?';
        params.push(type);
      }

      if (typeof active === 'string') {
        if (active === '1' || active.toLowerCase() === 'true') {
          sql += ' AND bs.is_active = 1';
        } else if (active === '0' || active.toLowerCase() === 'false') {
          sql += ' AND bs.is_active = 0';
        }
      }

      sql += ' ORDER BY bs.code ASC';

      const [rows]: any[] = await conn.query(sql, params);

      const stations = rows.map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type,
        utm_x: row.utm_x,
        utm_y: row.utm_y,
        installed_at: row.installed_at,
        is_active: row.is_active,
        created_at: row.created_at,
        lastInspection: row.last_inspection_id ? {
          id: row.last_inspection_id,
          inspected_at: row.last_inspected_at,
          has_bait: row.last_has_bait,
          bait_replaced: row.last_bait_replaced,
          location_ok: row.last_location_ok,
          lat: row.last_lat,
          lng: row.last_lng,
          physical_condition: row.last_physical_condition,
          photo_url: row.last_photo_url,
          observations: row.last_observations,
          inspector_nombre: row.last_inspector_nombre,
          inspector_empresa: row.last_inspector_empresa,
        } : null
      }));

      res.json(stations);
    });
  } catch (err: any) {
    logger.error({ err }, 'Error listing bait stations');
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * GET /v1/fumigation/stations/:id
 * Detalle de una estación + última inspección.
 */
router.get('/stations/:id', async (req: Request, res: Response) => {
  const stationId = Number(req.params.id);
  if (!Number.isFinite(stationId)) {
    return res.status(400).json({ error: 'invalid_station_id' });
  }

  try {
    await withConn(async (conn) => {
      const [stations]: any[] = await conn.query(
        `SELECT id, code, name, type,
                utm_x, utm_y,
                installed_at,
                is_active,
                created_at
         FROM bait_stations
         WHERE id = ?`,
        [stationId]
      );

      if (stations.length === 0) {
        return res.status(404).json({ error: 'station_not_found' });
      }

      const station = stations[0];

      const [inspections]: any[] = await conn.query(
        `SELECT
            i.id,
            i.inspected_at,
            i.has_bait,
            i.bait_replaced,
            i.location_ok,
            i.lat,
            i.lng,
            i.physical_condition,
            i.photo_url,
            i.observations,
            p.nombre AS inspector_nombre,
            p.empresa AS inspector_empresa
         FROM bait_station_inspections i
         LEFT JOIN pest_operators p ON p.id = i.inspector_id
         WHERE i.station_id = ?
         ORDER BY i.inspected_at DESC
         LIMIT 1`,
        [stationId]
      );

      station.lastInspection = inspections.length > 0 ? inspections[0] : null;

      res.json(station);
    });
  } catch (err: any) {
    logger.error({ err }, 'Error getting station detail');
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * POST /v1/fumigation/stations
 * Crea una nueva cebadera / trampa UV.
 * Body:
 *  - code: string
 *  - name: string
 *  - type: 'ROEDOR' | 'UV' | 'OTRO'
 *  - utm_x?: number
 *  - utm_y?: number
 *  - installed_at?: 'YYYY-MM-DD'
 *  - is_active?: boolean
 */
router.post('/stations', async (req: Request, res: Response) => {
  const {
    code,
    name,
    type,
    utm_x,
    utm_y,
    installed_at,
    is_active,
  } = req.body || {};

  if (!code || !name || !type) {
    return res.status(400).json({ error: 'code_name_type_required' });
  }

  const upperType = String(type).toUpperCase();
  if (!ALLOWED_TYPES.includes(upperType as any)) {
    return res.status(400).json({ error: 'invalid_type' });
  }

  const activeFlag =
    typeof is_active === 'boolean'
      ? (is_active ? 1 : 0)
      : 1; // por defecto activas

  try {
    await withConn(async (conn) => {
      const [result]: any = await conn.query(
        `INSERT INTO bait_stations
          (code, name, type, utm_x, utm_y, installed_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          name,
          upperType,
          utm_x ?? null,
          utm_y ?? null,
          installed_at || null,
          activeFlag,
        ]
      );

      res.status(201).json({
        id: result.insertId,
        code,
        name,
        type: upperType,
      });
    });
  } catch (err: any) {
    logger.error({ err, body: req.body }, 'Error creating bait station');
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * PUT /v1/fumigation/stations/:id
 * Actualiza una estación.
 */
router.put('/stations/:id', async (req: Request, res: Response) => {
  const stationId = Number(req.params.id);
  if (!Number.isFinite(stationId)) {
    return res.status(400).json({ error: 'invalid_station_id' });
  }

  const {
    code,
    name,
    type,
    utm_x,
    utm_y,
    installed_at,
    is_active,
  } = req.body || {};

  if (!code || !name || !type) {
    return res.status(400).json({ error: 'code_name_type_required' });
  }

  const upperType = String(type).toUpperCase();
  if (!ALLOWED_TYPES.includes(upperType as any)) {
    return res.status(400).json({ error: 'invalid_type' });
  }

  const activeFlag =
    typeof is_active === 'boolean'
      ? (is_active ? 1 : 0)
      : 1;

  try {
    await withConn(async (conn) => {
      const [result]: any = await conn.query(
        `UPDATE bait_stations
         SET code = ?, name = ?, type = ?,
             utm_x = ?, utm_y = ?,
             installed_at = ?, is_active = ?
         WHERE id = ?`,
        [
          code,
          name,
          upperType,
          utm_x ?? null,
          utm_y ?? null,
          installed_at || null,
          activeFlag,
          stationId,
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'station_not_found' });
      }

      res.json({ ok: true });
    });
  } catch (err: any) {
    logger.error({ err, body: req.body }, 'Error updating bait station');
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * DELETE /v1/fumigation/stations/:id
 * Elimina una estación.
 * Si el FK está en CASCADE, también se borran sus inspecciones.
 */
router.delete('/stations/:id', async (req: Request, res: Response) => {
  const stationId = Number(req.params.id);
  if (!Number.isFinite(stationId)) {
    return res.status(400).json({ error: 'invalid_station_id' });
  }

  try {
    await withConn(async (conn) => {
      const [result]: any = await conn.query(
        'DELETE FROM bait_stations WHERE id = ?',
        [stationId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'station_not_found' });
      }

      res.json({ ok: true });
    });
  } catch (err: any) {
    logger.error({ err }, 'Error deleting bait station');
    res.status(500).json({ error: 'internal_error' });
  }
});

/* =========================================================
 *  CRUD BAIT_STATION_INSPECTIONS
 * =======================================================*/

/**
 * GET /v1/fumigation/inspections
 * Lista general de inspecciones.
 * Query opcionales:
 *   - station_id=ID
 *   - from=YYYY-MM-DD
 *   - to=YYYY-MM-DD
 *   - limit=numero (default 100, max 500)
 */
router.get('/inspections', async (req: Request, res: Response) => {
  const { station_id, from, to, limit } = req.query;
  const params: any[] = [];
  let sql = `
    SELECT
      i.id,
      i.station_id,
      s.code AS station_code,
      s.name AS station_name,
      i.inspected_at,
      i.has_bait,
      i.bait_replaced,
      i.location_ok,
      i.lat,
      i.lng,
      i.physical_condition,
      i.photo_url,
      i.observations,
      p.nombre AS inspector_nombre,
      p.empresa AS inspector_empresa
    FROM bait_station_inspections i
    JOIN bait_stations s ON s.id = i.station_id
    LEFT JOIN pest_operators p ON p.id = i.inspector_id
    WHERE 1=1
  `;

  if (typeof station_id === 'string') {
    sql += ' AND i.station_id = ?';
    params.push(Number(station_id));
  }
  if (typeof from === 'string') {
    sql += ' AND i.inspected_at >= ?';
    params.push(from);
  }
  if (typeof to === 'string') {
    sql += ' AND i.inspected_at <= ?';
    params.push(to);
  }

  sql += ' ORDER BY i.inspected_at DESC';

  const limitNum =
    typeof limit === 'string'
      ? Math.min(parseInt(limit, 10) || 100, 500)
      : 100;
  sql += ' LIMIT ' + limitNum;

  try {
    await withConn(async (conn) => {
      const [rows] = await conn.query(sql, params);
      res.json(rows);
    });
  } catch (err: any) {
    logger.error({ err }, 'Error listing inspections');
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * GET /v1/fumigation/inspections/:id
 * Detalle de una inspección.
 */
router.get('/inspections/:id', async (req: Request, res: Response) => {
  const inspectionId = Number(req.params.id);
  if (!Number.isFinite(inspectionId)) {
    return res.status(400).json({ error: 'invalid_inspection_id' });
  }

  try {
    await withConn(async (conn) => {
      const [rows]: any[] = await conn.query(
        `
        SELECT
          i.id,
          i.station_id,
          s.code AS station_code,
          s.name AS station_name,
          i.inspected_at,
          i.has_bait,
          i.bait_replaced,
          i.location_ok,
          i.lat,
          i.lng,
          i.physical_condition,
          i.photo_url,
          i.observations,
          p.nombre AS inspector_nombre,
          p.empresa AS inspector_empresa
        FROM bait_station_inspections i
        JOIN bait_stations s ON s.id = i.station_id
        LEFT JOIN pest_operators p ON p.id = i.inspector_id
        WHERE i.id = ?
        `,
        [inspectionId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'inspection_not_found' });
      }

      res.json(rows[0]);
    });
  } catch (err: any) {
    logger.error({ err }, 'Error getting inspection detail');
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * GET /v1/fumigation/stations/:id/inspections
 * Lista inspecciones de una estación.
 */
router.get(
  '/stations/:id/inspections',
  async (req: Request, res: Response) => {
    const stationId = Number(req.params.id);
    if (!Number.isFinite(stationId)) {
      return res.status(400).json({ error: 'invalid_station_id' });
    }

    const { from, to, limit } = req.query;
    const params: any[] = [stationId];
    let sql = `
      SELECT
        i.id,
        i.station_id,
        i.inspected_at,
        i.has_bait,
        i.bait_replaced,
        i.location_ok,
        i.lat,
        i.lng,
        i.physical_condition,
        i.photo_url,
        i.observations,
        p.nombre AS inspector_nombre,
        p.empresa AS inspector_empresa
      FROM bait_station_inspections i
      LEFT JOIN pest_operators p ON p.id = i.inspector_id
      WHERE i.station_id = ?
    `;

    if (typeof from === 'string') {
      sql += ' AND i.inspected_at >= ?';
      params.push(from);
    }
    if (typeof to === 'string') {
      sql += ' AND i.inspected_at <= ?';
      params.push(to);
    }

    sql += ' ORDER BY i.inspected_at DESC';

    const limitNum =
      typeof limit === 'string'
        ? Math.min(parseInt(limit, 10) || 100, 500)
        : 100;
    sql += ' LIMIT ' + limitNum;

    try {
      await withConn(async (conn) => {
        const [rows] = await conn.query(sql, params);
        res.json(rows);
      });
    } catch (err: any) {
      logger.error({ err }, 'Error listing bait station inspections');
      res.status(500).json({ error: 'internal_error' });
    }
  }
);

/**
 * POST /v1/fumigation/stations/:id/inspections
 * Crea una inspección para una estación.
 * Body:
 *  - inspected_at?: 'YYYY-MM-DD HH:mm:ss' (por defecto NOW())
 *  - inspector_nombre: string
 *  - inspector_empresa?: string
 *  - physical_condition: 'BUENA' | 'REGULAR' | 'MALA'
 *  - has_bait: boolean
 *  - bait_replaced: boolean
 *  - location_ok: boolean
 *  - lat?: number
 *  - lng?: number
 *  - photo_url?: string
 *  - observations?: string
 */
router.post(
  '/stations/:id/inspections',
  async (req: Request, res: Response) => {
    const stationId = Number(req.params.id);
    if (!Number.isFinite(stationId)) {
      return res.status(400).json({ error: 'invalid_station_id' });
    }

    const {
      inspected_at,
      inspector_nombre,
      inspector_empresa,
      physical_condition,
      has_bait,
      bait_replaced,
      location_ok,
      lat,
      lng,
      photo_url,
      observations,
    } = req.body || {};

    if (!inspector_nombre) {
      return res.status(400).json({ error: 'inspector_nombre_required' });
    }

    const cond = String(physical_condition || '').toUpperCase();
    if (!ALLOWED_CONDITIONS.includes(cond as any)) {
      return res.status(400).json({ error: 'invalid_physical_condition' });
    }

    const hasBaitFlag = !!has_bait;
    const baitReplacedFlag = !!bait_replaced;
    const locationOkFlag = typeof location_ok === 'boolean' ? location_ok : true;

    const useNow = !inspected_at;

    try {
      await withConn(async (conn) => {
        // Verifica que exista la estación
        const [stations]: any[] = await conn.query(
          'SELECT id FROM bait_stations WHERE id = ?',
          [stationId]
        );
        if (stations.length === 0) {
          return res.status(404).json({ error: 'station_not_found' });
        }

        // Upsert de inspector
        const inspectorId = await ensurePestOperator(
          conn,
          inspector_nombre,
          inspector_empresa
        );

        const inspectedAtValue = useNow ? null : inspected_at;

        const [result]: any = await conn.query(
          `INSERT INTO bait_station_inspections
            (station_id, inspector_id, inspected_at,
             has_bait, bait_replaced, location_ok,
             lat, lng,
             physical_condition,
             photo_url, observations)
           VALUES (
             ?, ?, ${useNow ? 'NOW()' : '?'},
             ?, ?, ?,
             ?, ?,
             ?,
             ?, ?
           )`,
          [
            stationId,
            inspectorId,
            ...(useNow ? [] : [inspectedAtValue]),
            hasBaitFlag ? 1 : 0,
            baitReplacedFlag ? 1 : 0,
            locationOkFlag ? 1 : 0,
            lat ?? null,
            lng ?? null,
            cond,
            photo_url || '',
            observations || null,
          ]
        );

        res.status(201).json({ id: result.insertId });
      });
    } catch (err: any) {
      logger.error({ err, body: req.body }, 'Error creating bait inspection');
      res.status(500).json({ error: 'internal_error' });
    }
  }
);

/**
 * PUT /v1/fumigation/inspections/:id
 * Actualiza una inspección (parcial o total).
 * Body: mismos campos que POST, todos opcionales.
 */
router.put('/inspections/:id', async (req: Request, res: Response) => {
  const inspectionId = Number(req.params.id);
  if (!Number.isFinite(inspectionId)) {
    return res.status(400).json({ error: 'invalid_inspection_id' });
  }

  const {
    inspected_at,
    inspector_nombre,
    inspector_empresa,
    physical_condition,
    has_bait,
    bait_replaced,
    location_ok,
    lat,
    lng,
    photo_url,
    observations,
  } = req.body || {};

  try {
    await withConn(async (conn) => {
      // Leemos la inspección actual
      const [rows]: any[] = await conn.query(
        'SELECT * FROM bait_station_inspections WHERE id = ?',
        [inspectionId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'inspection_not_found' });
      }

      const current = rows[0];

      // Inspector
      let inspectorId = current.inspector_id;
      if (inspector_nombre) {
        inspectorId = await ensurePestOperator(
          conn,
          inspector_nombre,
          inspector_empresa
        );
      }

      // physical_condition
      let cond = current.physical_condition;
      if (physical_condition) {
        const candidate = String(physical_condition).toUpperCase();
        if (!ALLOWED_CONDITIONS.includes(candidate as any)) {
          return res.status(400).json({ error: 'invalid_physical_condition' });
        }
        cond = candidate;
      }

      const newInspectedAt =
        inspected_at !== undefined ? inspected_at : current.inspected_at;

      const newHasBait =
        has_bait !== undefined ? (!!has_bait ? 1 : 0) : current.has_bait;

      const newBaitReplaced =
        bait_replaced !== undefined
          ? (!!bait_replaced ? 1 : 0)
          : current.bait_replaced;

      const newLocationOk =
        location_ok !== undefined
          ? (!!location_ok ? 1 : 0)
          : current.location_ok;

      const newLat = lat !== undefined ? lat : current.lat;
      const newLng = lng !== undefined ? lng : current.lng;

      const newPhotoUrl =
        photo_url !== undefined ? photo_url : current.photo_url;
      const newObs =
        observations !== undefined ? observations : current.observations;

      const [result]: any = await conn.query(
        `UPDATE bait_station_inspections
         SET inspector_id = ?,
             inspected_at = ?,
             has_bait = ?,
             bait_replaced = ?,
             location_ok = ?,
             lat = ?,
             lng = ?,
             physical_condition = ?,
             photo_url = ?,
             observations = ?
         WHERE id = ?`,
        [
          inspectorId,
          newInspectedAt,
          newHasBait,
          newBaitReplaced,
          newLocationOk,
          newLat ?? null,
          newLng ?? null,
          cond,
          newPhotoUrl,
          newObs,
          inspectionId,
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'inspection_not_found' });
      }

      res.json({ ok: true });
    });
  } catch (err: any) {
    logger.error({ err, body: req.body }, 'Error updating inspection');
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * DELETE /v1/fumigation/inspections/:id
 * Elimina una inspección.
 */
router.delete('/inspections/:id', async (req: Request, res: Response) => {
  const inspectionId = Number(req.params.id);
  if (!Number.isFinite(inspectionId)) {
    return res.status(400).json({ error: 'invalid_inspection_id' });
  }

  try {
    await withConn(async (conn) => {
      const [result]: any = await conn.query(
        'DELETE FROM bait_station_inspections WHERE id = ?',
        [inspectionId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'inspection_not_found' });
      }

      res.json({ ok: true });
    });
  } catch (err: any) {
    logger.error({ err }, 'Error deleting inspection');
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
