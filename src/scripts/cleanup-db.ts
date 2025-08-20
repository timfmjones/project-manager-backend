// src/scripts/cleanup-db.ts
import { prisma } from '../lib/prisma';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanupDatabase() {
  try {
    console.log('⚠️  Database Cleanup Utility\n');
    
    // Check for orphaned projects
    const orphanedProjects = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count 
      FROM "Project" p 
      LEFT JOIN "User" u ON p."userId" = u.id 
      WHERE u.id IS NULL
    `;
    
    const orphanCount = Number(orphanedProjects[0].count);
    
    if (orphanCount > 0) {
      console.log(`Found ${orphanCount} orphaned projects.`);
      const answer = await question('Delete orphaned projects? (y/n): ');
      
      if (answer.toLowerCase() === 'y') {
        // Delete orphaned projects
        const deleted = await prisma.$executeRaw`
          DELETE FROM "Project" 
          WHERE "userId" NOT IN (SELECT id FROM "User")
        `;
        console.log(`✅ Deleted ${deleted} orphaned projects`);
      }
    } else {
      console.log('✅ No orphaned projects found');
    }
    
    // Option to create a test user
    const createUser = await question('\nCreate a test user? (y/n): ');
    
    if (createUser.toLowerCase() === 'y') {
      const email = await question('Enter email: ');
      
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: '$2a$10$rBV2JDeWW3.vKyeQcM8fFO4777l.VqVorprfcEzpqJJTYl7J0KMlu', // password: "password123"
        },
      });
      
      console.log(`✅ Created user: ${user.email} (ID: ${user.id})`);
      console.log('   Password: password123');
    }
    
    console.log('\n✨ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the cleanup script
cleanupDatabase().catch(console.error);