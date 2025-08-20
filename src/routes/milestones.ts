import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createMilestoneSchema, updateMilestoneSchema } from '../validators/milestone';

const router = Router();

router.get('/:id/milestones', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const milestones = await prisma.milestone.findMany({
      where: { projectId: req.params.id },
      orderBy: { dueDate: 'asc' },
    });
    
    res.json(milestones);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/milestones', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { title, description, dueDate } = createMilestoneSchema.parse(req.body);
    
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const milestone = await prisma.milestone.create({
      data: {
        projectId: req.params.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    
    res.json(milestone);
  } catch (error) {
    next(error);
  }
});

router.patch('/milestones/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { title, description, dueDate } = updateMilestoneSchema.parse(req.body);
    
    const milestone = await prisma.milestone.findFirst({
      where: { id: req.params.id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });
    
    if (!milestone || milestone.project.userId !== req.userId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    const updated = await prisma.milestone.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/milestones/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const milestone = await prisma.milestone.findFirst({
      where: { id: req.params.id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });
    
    if (!milestone || milestone.project.userId !== req.userId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    await prisma.milestone.delete({
      where: { id: req.params.id },
    });
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;