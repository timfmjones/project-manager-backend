// generate-secrets.js
// Run this with: node generate-secrets.js
// This will generate secure secrets for your Railway deployment

const crypto = require('crypto');

console.log('🔐 Generating secure secrets for Railway deployment...\n');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('base64');
console.log('JWT_SECRET:');
console.log(jwtSecret);
console.log('');

// Generate a secure random string
const randomSecret = crypto.randomBytes(24).toString('hex');
console.log('RANDOM_SECRET (if needed):');
console.log(randomSecret);
console.log('');

// Generate URL-safe random string
const urlSafeSecret = crypto.randomBytes(32).toString('base64url');
console.log('URL_SAFE_SECRET (if needed):');
console.log(urlSafeSecret);
console.log('');

console.log('📋 Copy these values to your Railway environment variables.');
console.log('⚠️  Keep these secrets safe and never commit them to git!\n');

// Sample environment variables for Railway
console.log('═══════════════════════════════════════════════════════');
console.log('BACKEND ENVIRONMENT VARIABLES FOR RAILWAY:');
console.log('═══════════════════════════════════════════════════════\n');

const backendEnv = `# Database (Railway provides this automatically)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Application
NODE_ENV=production
PORT=3001
JWT_SECRET=${jwtSecret}

# Supabase (get from https://app.supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# OpenAI (get from https://platform.openai.com)
OPENAI_API_KEY=sk-your-openai-api-key

# Storage
USE_SUPABASE_STORAGE=true
SUPABASE_STORAGE_BUCKET=audio-uploads

# CORS (add after frontend is deployed)
FRONTEND_URL=https://your-frontend.up.railway.app

# Optional: Firebase for Google Auth
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n`;

console.log(backendEnv);

console.log('\n═══════════════════════════════════════════════════════');
console.log('FRONTEND ENVIRONMENT VARIABLES FOR RAILWAY:');
console.log('═══════════════════════════════════════════════════════\n');

const frontendEnv = `# API Configuration (add after backend is deployed)
VITE_API_BASE_URL=https://your-backend.up.railway.app`;

console.log(frontendEnv);

console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ Save this output for your Railway deployment!');
console.log('═══════════════════════════════════════════════════════');