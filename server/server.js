import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import pandalsRouter from './routes/pandals.js';
import eateriesRouter from './routes/eateries.js';
import itineraryRouter from './routes/itinerary.js';
import parikramasRouter from './routes/parikramas.js';
import squadsRouter from './routes/squads.js';
import scheduleRouter from './routes/schedule.js';
import metroRouter from './routes/metro.js';
import archetypesRouter from './routes/archetypes.js';
import authRouter from './routes/auth.js';
import aiRouter from './routes/ai.js';
import routeRouter from './routes/route.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  if (!req.path.startsWith('/css') && !req.path.startsWith('/js') && !req.path.includes('.')) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/pandals', pandalsRouter);
app.use('/api/eateries', eateriesRouter);
app.use('/api/itinerary', itineraryRouter);
app.use('/api/parikramas', parikramasRouter);
app.use('/api/squads', squadsRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/metro', metroRouter);
app.use('/api/archetypes', archetypesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/route', routeRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Sharodiya - Full-Stack Durga Puja Experience',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Static Files (Frontend UI)
app.use(express.static(ROOT_DIR));

// SPA Catch-all (Send index.html for any unmatched non-API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// Server Initialization
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🕉️ SHARODIYA FULL-STACK SERVER RUNNING`);
    console.log(`🚀 URL: http://localhost:${PORT}`);
    console.log(`📡 API Endpoints: http://localhost:${PORT}/api/pandals`);
    console.log(`==================================================\n`);
  });
}

export default app;
