// src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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
const PORT = env.PORT;

// Only create uploads directory if using local storage
if (!env.USE_SUPABASE_STORAGE) {
  const uploadsDir = path.join(__dirname, '..', env.UPLOAD_DIR);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
}

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.headers.authorization ? 'with auth' : 'no auth');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    supabase: env.SUPABASE_URL ? 'configured' : 'not configured',
    storage: env.USE_SUPABASE_STORAGE ? 'supabase' : 'local',
    firebase: env.FIREBASE_PROJECT_ID ? 'configured' : 'not configured',
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

// Error handler must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using ${env.USE_SUPABASE_STORAGE ? 'Supabase' : 'local'} storage`);
  console.log(`Connected to Supabase: ${env.SUPABASE_URL}`);
  console.log(`Firebase: ${env.FIREBASE_PROJECT_ID ? 'Configured' : 'Not configured'}`);
});