// src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import summaryRoutes from './routes/summary';
import ideaDumpRoutes from './routes/ideaDumps';
import insightRoutes from './routes/insights';
import insightRoutesIndividual from './routes/insightRoutes';
import tasksRoutes from './routes/tasks';
import taskRoutesIndividual from './routes/taskRoutes';
import milestoneRoutes from './routes/milestones';
import milestoneRoutesIndividual from './routes/milestoneRoutes';
import aiRoutes from './routes/ai';
import { env } from './env';

dotenv.config();

const app = express();
const PORT = process.env.PORT || env.PORT || 3001;
const isDevelopment = process.env.NODE_ENV === 'development';

// CORS configuration for production
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Security headers for production
if (!isDevelopment) {
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

app.use(express.json());

// Request logging middleware (for debugging)
if (isDevelopment) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`, req.headers.authorization ? 'with auth' : 'no auth');
    next();
  });
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    supabase: env.SUPABASE_URL ? 'configured' : 'not configured',
    storage: 'in-memory (audio not stored)',
    firebase: env.FIREBASE_PROJECT_ID ? 'configured' : 'not configured',
  });
});

// Metrics endpoint for monitoring
app.get('/metrics', (_req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  });
});

// Auth routes (no authentication required)
app.use('/api/auth', authRoutes);

// Individual resource routes (for operations on specific items)
app.use('/api/tasks', taskRoutesIndividual);        // PATCH/DELETE /api/tasks/:id
app.use('/api/milestones', milestoneRoutesIndividual); // PATCH/DELETE /api/milestones/:id
app.use('/api/insights', insightRoutesIndividual);    // PATCH /api/insights/:id/pin

// Project-related routes (all under /api/projects)
app.use('/api/projects', projectRoutes);      // GET/POST/PATCH /api/projects
app.use('/api/projects', summaryRoutes);      // GET/PATCH /api/projects/:id/summary
app.use('/api/projects', ideaDumpRoutes);     // POST /api/projects/:id/idea-dumps
app.use('/api/projects', insightRoutes);      // GET /api/projects/:id/insights
app.use('/api/projects', tasksRoutes);        // GET/POST /api/projects/:id/tasks
app.use('/api/projects', milestoneRoutes);    // GET/POST /api/projects/:id/milestones
app.use('/api/projects', aiRoutes);           // POST /api/projects/:id/summary/suggest

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler must be last
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Storage: Audio transcribed in-memory (not stored)`);
  console.log(`🔗 Connected to Supabase: ${env.SUPABASE_URL}`);
  console.log(`🔐 Firebase: ${env.FIREBASE_PROJECT_ID ? 'Configured' : 'Not configured'}`);
  if (process.env.FRONTEND_URL) {
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  }
});