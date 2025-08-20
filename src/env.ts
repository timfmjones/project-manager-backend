export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  PORT: process.env.PORT || 3001,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  USE_SUPABASE_STORAGE: process.env.USE_SUPABASE_STORAGE === 'true',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'audio-uploads',
};