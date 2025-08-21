// src/routes/tasks.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createTaskSchema, reorderTasksSchema } from '../validators/task';

const routerTasks = Router();

// GET /api/projects/:id/tasks
routerTasks.get('/:id/tasks', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      orderBy: { position: 'asc' },
    });
    
    return res.json(tasks);
  } catch (error) {
    return next(error);
  }
});

// POST /api/projects/:id/tasks
routerTasks.post('/:id/tasks', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { title, description, status } = createTaskSchema.parse(req.body);
    
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const task = await prisma.task.create({
      data: {
        projectId: req.params.id,
        title,
        description,
        status: status || 'TODO',
        position: Date.now(),
      },
    });
    
    return res.json(task);
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/projects/:id/tasks/reorder
routerTasks.patch('/:id/tasks/reorder', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { orderedIds } = reorderTasksSchema.parse(req.body);
    
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const updates = orderedIds.map((id, index) => 
      prisma.task.update({
        where: { id },
        data: { position: index },
      })
    );
    
    await prisma.$transaction(updates);
    
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default routerTasks;