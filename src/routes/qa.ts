// src/routes/qa.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generateQAResponse } from '../config/openai';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const router = Router();

// Rate limiting for Q&A
const qaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 questions per hour
  message: 'Too many questions, please try again later',
});

// Validation schema
const askQuestionSchema = z.object({
  question: z.string().min(5).max(500),
  includeExamples: z.boolean().optional().default(true),
});

// GET /api/projects/:id/qa/history
router.get('/:id/qa/history', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const questions = await prisma.qAQuestion.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20, // Last 20 questions
    });
    
    return res.json(questions);
  } catch (error) {
    return next(error);
  }
});

// POST /api/projects/:id/qa/ask
router.post('/:id/qa/ask', authenticateToken, qaLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { question, includeExamples } = askQuestionSchema.parse(req.body);
    
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        tasks: {
          orderBy: { updatedAt: 'desc' },
          take: 10,
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
          where: {
            dueDate: {
              gte: new Date(),
            },
          },
          take: 5,
        },
      },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get recent insights for context
    const recentInsights = await prisma.insight.findMany({
      where: {
        ideaDump: {
          projectId: req.params.id,
        },
      },
      include: {
        ideaDump: {
          select: {
            contentText: true,
            transcript: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    // Get project statistics
    const stats = {
      totalTasks: await prisma.task.count({ where: { projectId: req.params.id } }),
      completedTasks: await prisma.task.count({ 
        where: { projectId: req.params.id, status: 'DONE' } 
      }),
      totalInsights: await prisma.insight.count({
        where: { ideaDump: { projectId: req.params.id } },
      }),
      upcomingMilestones: project.milestones.length,
    };
    
    // Prepare context for AI
    const projectContext = {
      name: project.name,
      summary: project.summaryBanner,
      stats,
      recentTasks: project.tasks.map(t => ({
        title: t.title,
        status: t.status,
        description: t.description,
      })),
      upcomingMilestones: project.milestones.map(m => ({
        title: m.title,
        description: m.description,
        dueDate: m.dueDate,
      })),
      recentInsights: recentInsights.map(i => ({
        summary: i.shortSummary,
        recommendations: i.recommendations,
        suggestedTasks: i.suggestedTasks,
        source: i.ideaDump.contentText || i.ideaDump.transcript,
        date: i.createdAt,
      })),
    };
    
    // Generate AI response
    const aiResponse = await generateQAResponse(
      question,
      projectContext,
      includeExamples
    );
    
    // Save question and answer to database
    const qaRecord = await prisma.qAQuestion.create({
      data: {
        projectId: req.params.id,
        question,
        answer: aiResponse.answer,
        suggestions: aiResponse.suggestions || [],
        examples: aiResponse.examples || [],
        helpful: null, // User can rate later
      },
    });
    
    // Check if follow-up actions are suggested
    if (aiResponse.suggestedTasks && aiResponse.suggestedTasks.length > 0) {
      // Optionally create suggested tasks
      const tasksToCreate = aiResponse.suggestedTasks.map((task: any, index: number) => ({
        projectId: req.params.id,
        title: task.title,
        description: task.description || `Suggested from Q&A: ${question.substring(0, 50)}...`,
        status: 'TODO' as const,
        position: Date.now() + index,
      }));
      
      await prisma.task.createMany({ data: tasksToCreate });
    }
    
    return res.json({
      id: qaRecord.id,
      question: qaRecord.question,
      answer: qaRecord.answer,
      suggestions: qaRecord.suggestions,
      examples: qaRecord.examples,
      suggestedTasks: aiResponse.suggestedTasks || [],
      createdAt: qaRecord.createdAt,
    });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/qa/:id/feedback
router.patch('/qa/:id/feedback', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const feedbackSchema = z.object({
      helpful: z.boolean(),
    });
    
    const { helpful } = feedbackSchema.parse(req.body);
    
    // Verify ownership through project
    const qaQuestion = await prisma.qAQuestion.findFirst({
      where: { id: req.params.id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });
    
    if (!qaQuestion || qaQuestion.project.userId !== req.userId) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    await prisma.qAQuestion.update({
      where: { id: req.params.id },
      data: { helpful },
    });
    
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// GET /api/projects/:id/qa/suggestions
router.get('/:id/qa/suggestions', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get project context for generating smart question suggestions
    const recentTasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    
    const suggestions = [
      "What should I focus on next?",
      "Are there any bottlenecks in my project?",
      "How can I improve my project's progress?",
      "What are similar projects doing differently?",
      "What tasks should I prioritize this week?",
    ];
    
    // Add context-aware suggestions based on project state
    if (recentTasks.filter(t => t.status === 'TODO').length > 5) {
      suggestions.push("How can I better manage my task backlog?");
    }
    
    const upcomingMilestones = await prisma.milestone.count({
      where: {
        projectId: req.params.id,
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      },
    });
    
    if (upcomingMilestones > 0) {
      suggestions.push("What do I need to complete for my upcoming milestone?");
    }
    
    return res.json({ suggestions: suggestions.slice(0, 5) });
  } catch (error) {
    return next(error);
  }
});

export default router;