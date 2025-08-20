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
    const orphanedProjects = await prisma.project.findMany({
      where: {
        user: {
          is: null,
        },
      },
    });
    
    if (orphanedProjects.length > 0) {
      console.log(`\n⚠️  Found ${orphanedProjects.length} orphaned projects!`);
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