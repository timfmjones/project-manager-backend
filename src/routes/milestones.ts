// src/routes/milestones.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createMilestoneSchema } from '../validators/milestone';

const router = Router();

// GET /api/projects/:id/milestones
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

// POST /api/projects/:id/milestones
router.post('/:id/milestones', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    console.log('Creating milestone with data:', req.body); // Debug log
    
    const validationResult = createMilestoneSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }
    
    const { title, description, dueDate } = validationResult.data;
    
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Handle the date conversion more carefully
    let dueDateValue = null;
    if (dueDate) {
      try {
        dueDateValue = new Date(dueDate);
        // Check if the date is valid
        if (isNaN(dueDateValue.getTime())) {
          console.error('Invalid date format:', dueDate);
          return res.status(400).json({ error: 'Invalid date format' });
        }
      } catch (dateError) {
        console.error('Date parsing error:', dateError);
        return res.status(400).json({ error: 'Invalid date format' });
      }
    }
    
    const milestone = await prisma.milestone.create({
      data: {
        projectId: req.params.id,
        title,
        description: description || null,
        dueDate: dueDateValue,
      },
    });
    
    res.json(milestone);
  } catch (error) {
    console.error('Milestone creation error:', error);
    next(error);
  }
});

export default router;