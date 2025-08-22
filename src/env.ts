export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL!,
  
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
  
  // Auth
  JWT_SECRET: process.env.JWT_SECRET!,
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Firebase configuration (optional)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  
  // Frontend URL for CORS
  FRONTEND_URL: process.env.FRONTEND_URL,
};