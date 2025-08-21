// src/routes/milestoneRoutes.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { updateMilestoneSchema } from '../validators/milestone';

const routerMilestoneRoutes = Router();

// PATCH /api/milestones/:id
routerMilestoneRoutes.patch('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    console.log('Updating milestone with data:', req.body); // Debug log
    
    const validationResult = updateMilestoneSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }
    
    const { title, description, dueDate } = validationResult.data;
    
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
    
    // Handle the date conversion more carefully
    let dueDateValue = undefined;
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        dueDateValue = null;
      } else {
        try {
          const parsedDate = new Date(dueDate);
          if (isNaN(parsedDate.getTime())) {
            console.error('Invalid date format:', dueDate);
            return res.status(400).json({ error: 'Invalid date format' });
          }
          dueDateValue = parsedDate;
        } catch (dateError) {
          console.error('Date parsing error:', dateError);
          return res.status(400).json({ error: 'Invalid date format' });
        }
      }
    }
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (dueDateValue !== undefined) updateData.dueDate = dueDateValue;
    
    const updated = await prisma.milestone.update({
      where: { id: req.params.id },
      data: updateData,
    });
    
    return res.json(updated);
  } catch (error) {
    console.error('Milestone update error:', error);
    return next(error);
  }
});

// DELETE /api/milestones/:id
routerMilestoneRoutes.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
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
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Milestone deletion error:', error);
    return next(error);
  }
});

export default routerMilestoneRoutes;