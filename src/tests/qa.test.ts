// src/tests/qa.test.ts - Test file for Q&A feature
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { prisma } from '../lib/prisma';
import { generateToken } from '../lib/jwt';

describe('Q&A Feature', () => {
  let authToken: string;
  let userId: string;
  let projectId: string;
  let questionId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'qa-test@example.com',
        passwordHash: 'test-hash',
      },
    });
    userId = user.id;
    authToken = generateToken(userId);

    // Create test project
    const project = await prisma.project.create({
      data: {
        userId,
        name: 'Test Q&A Project',
        summaryBanner: 'Testing Q&A functionality',
      },
    });
    projectId = project.id;

    // Add some test data for context
    await prisma.task.createMany({
      data: [
        { projectId, title: 'Task 1', status: 'TODO', position: 1 },
        { projectId, title: 'Task 2', status: 'IN_PROGRESS', position: 2 },
        { projectId, title: 'Task 3', status: 'DONE', position: 3 },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.qaQuestion.deleteMany({ where: { projectId } });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  describe('POST /api/projects/:id/qa/ask', () => {
    it('should create a new Q&A entry', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/qa/ask`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question: 'What should I focus on next?',
          includeExamples: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('answer');
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body.question).toBe('What should I focus on next?');
      
      questionId = response.body.id;
    });

    it('should reject short questions', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/qa/ask`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question: 'Hi',
        });

      expect(response.status).toBe(400);
    });

    it('should work without examples', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/qa/ask`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question: 'How many tasks do I have?',
          includeExamples: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.examples).toBeUndefined();
    });
  });

  describe('GET /api/projects/:id/qa/history', () => {
    it('should retrieve Q&A history', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/qa/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should not return history for other projects', async () => {
      const otherProject = await prisma.project.create({
        data: {
          userId: 'other-user-id',
          name: 'Other Project',
        },
      });

      const response = await request(app)
        .get(`/api/projects/${otherProject.id}/qa/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);

      await prisma.project.delete({ where: { id: otherProject.id } });
    });
  });

  describe('GET /api/projects/:id/qa/suggestions', () => {
    it('should return question suggestions', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/qa/suggestions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/qa/:id/feedback', () => {
    it('should update feedback for a question', async () => {
      const response = await request(app)
        .patch(`/api/qa/${questionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          helpful: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify feedback was saved
      const question = await prisma.qaQuestion.findUnique({
        where: { id: questionId },
      });
      expect(question?.helpful).toBe(true);
    });

    it('should handle negative feedback', async () => {
      const response = await request(app)
        .patch(`/api/qa/${questionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          helpful: false,
        });

      expect(response.status).toBe(200);

      const question = await prisma.qaQuestion.findUnique({
        where: { id: questionId },
      });
      expect(question?.helpful).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // This test would need to make many requests to trigger rate limit
      // Simplified for demonstration
      const requests = Array(51).fill(null).map(() =>
        request(app)
          .post(`/api/projects/${projectId}/qa/ask`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            question: 'Test rate limiting question?',
            includeExamples: false,
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});

// Integration test for Q&A context analysis
describe('Q&A Context Analysis', () => {
  it('should reference actual project data in answers', async () => {
    // This would require mocking OpenAI responses in a real test environment
    // Example of what to test:
    // - Answer mentions the number of tasks
    // - Answer references task statuses
    // - Answer considers milestones
    // - Suggestions are relevant to project state
  });
});

// Test helper functions
export async function createTestQuestion(
  projectId: string,
  authToken: string,
  question: string = 'Test question?'
) {
  const response = await request(app)
    .post(`/api/projects/${projectId}/qa/ask`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ question, includeExamples: false });
  
  return response.body;
}