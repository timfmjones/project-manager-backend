// src/scripts/debug-db.ts
import { prisma } from '../lib/prisma';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debugDatabase() {
  try {
    console.log('🔍 Debugging Database Connection...\n');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');
    
    // Check users
    const userCount = await prisma.user.count();
    console.log(`📊 Total users: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });
      
      console.log('\n👥 Sample users:');
      users.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id})`);
      });
    }
    
    // Check projects
    const projectCount = await prisma.project.count();
    console.log(`\n📁 Total projects: ${projectCount}`);
    
    if (projectCount > 0) {
      const projects = await prisma.project.findMany({
        take: 5,
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });
      
      console.log('\n📋 Sample projects:');
      projects.forEach(project => {
        console.log(`  - "${project.name}" by ${project.user.email}`);
      });
    }
    
    // Check for orphaned projects (projects without valid users)
    // Fix: Cannot use 'is: null' for required relations, check via raw query instead
    const orphanedProjects = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count 
      FROM "Project" p 
      LEFT JOIN "User" u ON p."userId" = u.id 
      WHERE u.id IS NULL
    `;
    
    const orphanCount = Number(orphanedProjects[0].count);
    
    if (orphanCount > 0) {
      console.log(`\n⚠️  Found ${orphanCount} orphaned projects!`);
      console.log('These projects reference non-existent users.');
    }
    
    console.log('\n✨ Database check complete!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug script
debugDatabase().catch(console.error);

// ===== SEPARATE FILE =====
// src/scripts/setup-supabase.ts
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
    const { error } = await supabase
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