# Backend - Project Management API

## Overview
Node.js/Express/TypeScript backend API for a project management application with AI-powered insights, using Supabase as the database and OpenAI for transcription and analysis.

## Tech Stack
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Authentication**: JWT tokens
- **File Storage**: Local filesystem or Supabase Storage
- **AI Services**: OpenAI (Whisper for transcription, GPT-4 for insights)
- **Validation**: Zod schemas

## Project Structure
backend/
├── src/
│   ├── server.ts           # Express app setup and middleware
│   ├── env.ts             # Environment variable configuration
│   ├── config/
│   │   ├── openai.ts      # OpenAI client and AI functions
│   │   └── supabase.ts    # Supabase client setup
│   ├── middleware/
│   │   ├── auth.ts        # JWT authentication middleware
│   │   ├── error.ts       # Global error handler
│   │   └── upload.ts      # File upload handling (local/Supabase)
│   ├── lib/
│   │   ├── prisma.ts      # Prisma client singleton
│   │   ├── hash.ts        # Password hashing utilities
│   │   └── jwt.ts         # JWT token utilities
│   ├── routes/            # API route handlers
│   │   ├── auth.ts        # Authentication endpoints
│   │   ├── projects.ts    # Project CRUD operations
│   │   ├── summary.ts     # Project summary management
│   │   ├── ideaDumps.ts   # Text/audio idea capture
│   │   ├── insights.ts    # AI-generated insights
│   │   ├── tasks.ts       # Kanban task management
│   │   ├── milestones.ts  # Project milestones
│   │   └── ai.ts          # AI suggestion endpoints
│   ├── validators/        # Zod validation schemas
│   └── scripts/
│       └── setup-supabase.ts # Database setup validator
├── prisma/
│   └── schema.prisma      # Database schema definition
└── supabase-migration.sql # SQL migration for Supabase

## Key Features

### Authentication System
- **JWT-based auth** with 7-day token expiry
- **Guest mode** support (creates temporary users with null passwords)
- **Password hashing** using bcrypt
- Protected routes via `authenticateToken` middleware

### AI Integration
- **Voice Transcription**: Converts audio uploads to text using OpenAI Whisper
- **Insight Generation**: Analyzes idea dumps to produce:
  - Short summaries (2-4 bullet points)
  - Business recommendations (2-5 suggestions)
  - Suggested tasks (2-6 actionable items)
- **Summary Suggestions**: AI-powered project summary updates based on recent insights

### Data Flow
1. User uploads text or audio idea dump
2. Audio is transcribed via Whisper if needed
3. Content is analyzed by GPT-4 to generate insights
4. Insights are stored and suggested tasks are created
5. Frontend displays insights chronologically with pinning support

### Storage Options
- **Local Storage** (default): Files saved to `uploads/` directory
- **Supabase Storage** (optional): Cloud storage with public URLs
- Configurable via `USE_SUPABASE_STORAGE` environment variable

## Database Schema

### Core Models
- **User**: Authentication and ownership
- **Project**: Main organizational unit
- **IdeaDump**: Raw text or audio input from users
- **Insight**: AI-generated analysis of idea dumps
- **Task**: Kanban board items with status tracking
- **Milestone**: Project deadlines and goals

### Relationships
- Users own multiple Projects
- Projects contain IdeaDumps, Tasks, and Milestones
- IdeaDumps generate Insights
- All models cascade delete for data integrity

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/guest` - Create guest session
- `GET /api/auth/me` - Get current user profile

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project

### Idea Dumps
- `POST /api/projects/:id/idea-dumps/text` - Submit text idea
- `POST /api/projects/:id/idea-dumps/audio` - Upload audio file

### Insights
- `GET /api/projects/:id/insights` - List project insights
- `PATCH /api/insights/:id/pin` - Pin/unpin insight

### Tasks
- `GET /api/projects/:id/tasks` - List project tasks
- `POST /api/projects/:id/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `PATCH /api/projects/:id/tasks/reorder` - Reorder tasks

### Milestones
- `GET /api/projects/:id/milestones` - List milestones
- `POST /api/projects/:id/milestones` - Create milestone
- `PATCH /api/milestones/:id` - Update milestone
- `DELETE /api/milestones/:id` - Delete milestone

### AI Features
- `POST /api/projects/:id/summary/suggest` - Get AI summary suggestion

## Environment Variables
```env
# Supabase Configuration
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_KEY=[service-key]
DATABASE_URL=postgresql://...

# Application
JWT_SECRET=[secret-key]
OPENAI_API_KEY=sk-...
PORT=3001
UPLOAD_DIR=uploads

# Optional
USE_SUPABASE_STORAGE=false
SUPABASE_STORAGE_BUCKET=audio-uploads
Security Considerations

All routes except auth endpoints require JWT authentication
Passwords hashed with bcrypt (10 rounds)
User can only access their own data (enforced at query level)
Rate limiting on AI endpoints (100 requests/hour)
File upload limited to 25MB audio files only
CORS configured for frontend origin only

Error Handling

Global error handler middleware
Zod validation errors return 400 with details
Auth failures return 401/403 appropriately
Database errors logged but sanitized in production
OpenAI errors handled gracefully with fallbacks

Development Commands
bashpnpm dev                # Start development server
pnpm build             # Build for production
pnpm setup:check       # Validate Supabase connection
pnpm prisma:generate   # Generate Prisma client
pnpm prisma:introspect # Pull schema from database
pnpm lint              # Run ESLint
pnpm format            # Format with Prettier
Testing Strategy

Unit tests for utilities (JWT, hashing)
Integration tests for API endpoints
Mock OpenAI responses in tests
Use test database for integration tests

Performance Optimizations

Database indexes on foreign keys
Prisma query optimization with includes
Static file serving for uploads
Connection pooling via Supabase
Async/await for all I/O operations

Deployment Considerations

Set NODE_ENV=production
Use strong JWT_SECRET
Configure Supabase RLS policies
Set up proper CORS origins
Enable HTTPS in production
Configure proper file upload limits
Monitor OpenAI API usage and costs
Set up error tracking (e.g., Sentry)
Configure database backups
Use PM2 or similar for process management

Common Issues & Solutions
Supabase Connection Issues

Verify DATABASE_URL includes ?pgbouncer=true
Check service role key has proper permissions
Ensure RLS policies allow service role access

File Upload Problems

Check uploads directory exists and is writable
Verify multer configuration for file types
For Supabase Storage, ensure bucket exists and is public

OpenAI Rate Limits

Implement retry logic with exponential backoff
Cache responses where appropriate
Consider queueing system for heavy usage

CORS Errors

Verify frontend URL in CORS configuration
Check credentials: true is set for cookies
Ensure Authorization header is allowed

Future Enhancements

WebSocket support for real-time updates
Email notifications for milestones
Batch processing for multiple idea dumps
Advanced search and filtering
Export functionality for projects
Team collaboration features
Webhook integrations
Background job processing
Caching layer (Redis)
GraphQL API alternative