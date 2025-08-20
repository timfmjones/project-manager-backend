import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createTaskSchema, updateTaskSchema, reorderTasksSchema } from '../validators/task';

const router = Router();

router.get('/:id/tasks', authenticateToken, async (req: AuthRequest, res, next) => {
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
    
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/tasks', authenticateToken, async (req: AuthRequest, res, next) => {
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
    
    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.patch('/tasks/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { title, description, status, position } = updateTaskSchema.parse(req.body);
    
    const task = await prisma.task.findFirst({
      where: { id: req.params.id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });
    
    if (!task || task.project.userId !== req.userId) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(position !== undefined && { position }),
      },
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/tasks/reorder', authenticateToken, async (req: AuthRequest, res, next) => {
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
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;