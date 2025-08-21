// src/routes/taskRoutes.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { updateTaskSchema } from '../validators/task';

const routerTaskRoutes = Router();

// PATCH /api/tasks/:id
routerTaskRoutes.patch('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
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
    
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/tasks/:id
routerTaskRoutes.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
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
    
    await prisma.task.delete({
      where: { id: req.params.id },
    });
    
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default routerTaskRoutes;