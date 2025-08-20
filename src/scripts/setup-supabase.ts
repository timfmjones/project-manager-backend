import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test database connection
    const { data, error } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error);
      console.log('\nPlease ensure you have run the migration script in your Supabase SQL Editor.');
      return false;
    }
    
    console.log('✓ Database connection successful');
    
    // Test storage bucket
    if (process.env.USE_SUPABASE_STORAGE === 'true') {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Storage connection failed:', bucketsError);
        return false;
      }
      
      const audioBucket = buckets.find(b => b.name === process.env.SUPABASE_STORAGE_BUCKET);
      
      if (!audioBucket) {
        console.log('\nCreating audio uploads bucket...');
        const { error: createError } = await supabase.storage.createBucket(
          process.env.SUPABASE_STORAGE_BUCKET || 'audio-uploads',
          { public: true }
        );
        
        if (createError) {
          console.error('Failed to create storage bucket:', createError);
          return false;
        }
        
        console.log('✓ Storage bucket created');
      } else {
        console.log('✓ Storage bucket exists');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Setup failed:', error);
    return false;
  }
}

async function main() {
  console.log('Supabase Setup Validator');
  console.log('========================\n');
  
  const success = await testConnection();
  
  if (success) {
    console.log('\n✅ Supabase is properly configured!');
    console.log('You can now run: pnpm dev');
  } else {
    console.log('\n❌ Supabase setup incomplete');
    console.log('Please check your configuration and database migrations.');
  }
}

main().catch(console.error);