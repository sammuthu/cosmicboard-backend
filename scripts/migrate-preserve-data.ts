#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.localstack' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://admin:localdev123@localhost:5432/cosmicspace'
    }
  }
});

async function safeDataMigration() {
  console.log('🔄 Starting safe data migration...\n');
  
  try {
    // First, let's check what tables exist
    const tables = await prisma.$queryRaw<any[]>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    console.log('Existing tables:', tables.map(t => t.tablename));

    // Check if the new User table structure exists
    const userColumns = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      ORDER BY ordinal_position;
    `;
    console.log('\nCurrent User table columns:', userColumns);

    // Start transaction for safe migration
    await prisma.$transaction(async (tx) => {
      console.log('\n📝 Starting migration transaction...');

      // 1. First check if nmuthu@gmail.com user exists
      let mainUser = await tx.$queryRaw<any[]>`
        SELECT * FROM "User" WHERE email = 'nmuthu@gmail.com' LIMIT 1;
      `;

      if (mainUser.length === 0) {
        console.log('\n👤 Creating user nmuthu@gmail.com...');
        
        // Check if the table has old structure (with password) or new structure
        const hasPasswordColumn = userColumns.some(c => c.column_name === 'password');
        
        if (hasPasswordColumn) {
          // Old structure - create with dummy password
          await tx.$executeRaw`
            INSERT INTO "User" (id, email, password, name, "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, 'nmuthu@gmail.com', 'temp_password', 'Nmuthu', NOW(), NOW())
            ON CONFLICT (email) DO NOTHING;
          `;
        } else {
          // New structure - check what columns we have
          const hasUsername = userColumns.some(c => c.column_name === 'username');
          const hasPhone = userColumns.some(c => c.column_name === 'phone');
          
          if (hasUsername) {
            await tx.$executeRaw`
              INSERT INTO "User" (id, email, name, username, "createdAt", "updatedAt")
              VALUES (gen_random_uuid()::text, 'nmuthu@gmail.com', 'Nmuthu', 'nmuthu', NOW(), NOW())
              ON CONFLICT (email) DO NOTHING;
            `;
          } else {
            await tx.$executeRaw`
              INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
              VALUES (gen_random_uuid()::text, 'nmuthu@gmail.com', 'Nmuthu', NOW(), NOW())
              ON CONFLICT (email) DO NOTHING;
            `;
          }
        }
        
        mainUser = await tx.$queryRaw<any[]>`
          SELECT * FROM "User" WHERE email = 'nmuthu@gmail.com' LIMIT 1;
        `;
      }
      
      const userId = mainUser[0].id;
      console.log(`✅ User ID for nmuthu@gmail.com: ${userId}`);

      // 2. Update Projects without userId
      const projectsWithoutUser = await tx.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM "Project" WHERE "userId" IS NULL OR "userId" = '';
      `;
      
      if (projectsWithoutUser[0]?.count > 0) {
        console.log(`\n📁 Associating ${projectsWithoutUser[0].count} projects with nmuthu@gmail.com...`);
        await tx.$executeRaw`
          UPDATE "Project" 
          SET "userId" = ${userId}
          WHERE "userId" IS NULL OR "userId" = '';
        `;
      }

      // 3. Check if ownerId column exists in Project table
      const projectColumns = await tx.$queryRaw<any[]>`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'Project' AND column_name = 'ownerId';
      `;
      
      if (projectColumns.length > 0) {
        // New schema with ownerId
        const projectsWithoutOwner = await tx.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM "Project" WHERE "ownerId" IS NULL OR "ownerId" = '';
        `;
        
        if (projectsWithoutOwner[0]?.count > 0) {
          console.log(`📁 Setting ownerId for ${projectsWithoutOwner[0].count} projects...`);
          await tx.$executeRaw`
            UPDATE "Project" 
            SET "ownerId" = ${userId}
            WHERE "ownerId" IS NULL OR "ownerId" = '';
          `;
        }
      }

      // 4. Update Tasks without assigneeId (if column exists)
      const taskColumns = await tx.$queryRaw<any[]>`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'Task' AND column_name = 'assigneeId';
      `;
      
      if (taskColumns.length > 0) {
        const tasksWithoutAssignee = await tx.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM "Task" WHERE "assigneeId" IS NULL;
        `;
        
        if (tasksWithoutAssignee[0]?.count > 0) {
          console.log(`\n✅ Associating ${tasksWithoutAssignee[0].count} tasks with nmuthu@gmail.com...`);
          await tx.$executeRaw`
            UPDATE "Task" 
            SET "assigneeId" = ${userId}
            WHERE "assigneeId" IS NULL;
          `;
        }
      }

      // 5. Update References without userId (if they exist)
      const referenceTableExists = tables.some(t => t.tablename === 'Reference');
      if (referenceTableExists) {
        const refsWithoutUser = await tx.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM "Reference" WHERE "userId" IS NULL OR "userId" = '';
        `;
        
        if (refsWithoutUser[0]?.count > 0) {
          console.log(`\n📚 Associating ${refsWithoutUser[0].count} references with nmuthu@gmail.com...`);
          await tx.$executeRaw`
            UPDATE "Reference" 
            SET "userId" = ${userId}
            WHERE "userId" IS NULL OR "userId" = '';
          `;
        }
      }

      // 6. Alter User table to match new schema if needed
      if (userColumns.some(c => c.column_name === 'password')) {
        console.log('\n🔧 Migrating User table to new schema...');
        
        // Remove password column
        await tx.$executeRaw`
          ALTER TABLE "User" 
          DROP COLUMN IF EXISTS password;
        `;
        
        // Rename avatarUrl to avatar if it exists
        const hasAvatarUrl = userColumns.some(c => c.column_name === 'avatarUrl');
        if (hasAvatarUrl) {
          await tx.$executeRaw`
            ALTER TABLE "User" RENAME COLUMN "avatarUrl" TO avatar;
          `;
        }
        
        // Add new columns one by one to avoid conflicts
        await tx.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS username TEXT;`;
        await tx.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS phone TEXT;`;
        await tx.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS bio TEXT;`;
        await tx.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);`;
        await tx.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" TIMESTAMP(3);`;
        await tx.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);`;
        await tx.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;`;
        await tx.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS metadata JSONB;`;
      }

      // 7. Create AuthMethod table if it doesn't exist
      const authMethodExists = tables.some(t => t.tablename === 'AuthMethod');
      if (!authMethodExists) {
        console.log('\n🔐 Creating AuthMethod table...');
        await tx.$executeRaw`
          CREATE TABLE IF NOT EXISTS "AuthMethod" (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "userId" TEXT NOT NULL,
            provider TEXT NOT NULL,
            "providerId" TEXT,
            email TEXT,
            phone TEXT,
            "passwordHash" TEXT,
            metadata JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
            UNIQUE("userId", provider, "providerId")
          );
        `;
        
        // Create an email auth method for nmuthu@gmail.com
        await tx.$executeRaw`
          INSERT INTO "AuthMethod" ("userId", provider, email)
          VALUES (${userId}, 'EMAIL', 'nmuthu@gmail.com')
          ON CONFLICT DO NOTHING;
        `;
      }

      console.log('\n✅ Migration completed successfully!');
    });

    // Show final state
    console.log('\n📊 Final database state:');
    const userCount = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "User";
    `;
    const projectCount = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "Project";
    `;
    const taskCount = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "Task";
    `;
    
    console.log(`  Users: ${userCount[0].count}`);
    console.log(`  Projects: ${projectCount[0].count}`);
    console.log(`  Tasks: ${taskCount[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
safeDataMigration().catch(console.error);