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
import taskRoutes from './routes/tasks';
import milestoneRoutes from './routes/milestones';
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    supabase: env.SUPABASE_URL ? 'configured' : 'not configured',
    storage: env.USE_SUPABASE_STORAGE ? 'supabase' : 'local'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', summaryRoutes);
app.use('/api/projects', ideaDumpRoutes);
app.use('/api/projects', insightRoutes);
app.use('/api/projects', taskRoutes);
app.use('/api/projects', milestoneRoutes);
app.use('/api/projects', aiRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using ${env.USE_SUPABASE_STORAGE ? 'Supabase' : 'local'} storage`);
  console.log(`Connected to Supabase: ${env.SUPABASE_URL}`);
});