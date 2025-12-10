import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import notesRouter from './routes/notes.routes.js';
import requisRouter from './routes/requis.routes.js';
import inspections from './routes/inspections.routes.js';
import roomsRouter from './routes/rooms.routes.js';
import sabanasRouter from './routes/sabanas.routes.js';
import notifyRouter from './routes/notify.routes.js';
import workingOrdersRouter from './routes/working-orders.routes.js';
import supervisorsRouter from './routes/supervisors.routes.js';
import sectionsRouter from './routes/sections.routes.js';
import albercas from './routes/albercas.routes.js';
import remindersRouter from './routes/reminders.routes.js';
import beosingRoutes from './routes/beosing.routes.js';
import energy from './routes/energy.routes.js'
import fumigationRouter from './routes/fumigation.routes.js';

//fumigation routes

export function buildApp() {
  const app = express();

  app.use(helmet());

  // ✅ CORS global (allow all). Responde preflights y cachea por 1 día.
  const corsAll = cors({
    origin: '*',
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: false,   // con '*' no se permiten cookies
    maxAge: 86400
  });
  app.use(corsAll);
  app.options('*', corsAll);   // responde a OPTIONS en cualquier ruta

  app.use(express.json({ limit: '2mb' }));

  // --- tus rutas ---
  app.use('/v1/supervisors', supervisorsRouter);
  app.use('/v1/sections', sectionsRouter);
  app.use('/v1/notes', notesRouter);
  app.use('/v1/requis', requisRouter);
  app.use('/v1/inspections', inspections);
  app.use('/v1/rooms', roomsRouter);
  app.use('/v1/sabanas', sabanasRouter);
  app.get('/health', (_req,res)=>res.json({ok:true}));
  app.use('/v1/working-orders', workingOrdersRouter);
  app.use('/v1/albercas', albercas);
  app.use('/v1/reminders', remindersRouter);
  app.use('/v1/beosing', beosingRoutes);
  app.use('/v1/energy', energy);

    app.use('/v1/fumigation', fumigationRouter);

     // 404 con CORS
  app.use((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(404).json({ error: 'not_found' });
  });

  // Manejo de errores con CORS
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}