#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load LocalStack environment
dotenv.config({ path: '.env.localstack' });

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testDatabaseOperations() {
  console.log('🗄️ Testing Database Operations with Prisma\n');
  
  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test 2: Create a user
    console.log('\n2️⃣ Testing user creation...');
    const testUser = await prisma.user.create({
      data: {
        email: 'test@cosmicspace.app',
        name: 'Test User',
        username: 'testuser',
      },
    });
    console.log('✅ User created:', {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
    });
    
    // Test 3: Create a project
    console.log('\n3️⃣ Testing project creation...');
    const testProject = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Testing database operations',
        ownerId: testUser.id,
      },
    });
    console.log('✅ Project created:', {
      id: testProject.id,
      name: testProject.name,
    });
    
    // Test 4: Create a task
    console.log('\n4️⃣ Testing task creation...');
    const testTask = await prisma.task.create({
      data: {
        title: 'Test Task',
        description: 'This is a test task',
        priority: 'HIGH',
        status: 'TODO',
        projectId: testProject.id,
      },
    });
    console.log('✅ Task created:', {
      id: testTask.id,
      title: testTask.title,
      priority: testTask.priority,
    });
    
    // Test 5: Query with relations
    console.log('\n5️⃣ Testing queries with relations...');
    const projectWithTasks = await prisma.project.findUnique({
      where: { id: testProject.id },
      include: {
        tasks: true,
        owner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
    console.log('✅ Project with relations:', {
      name: projectWithTasks?.name,
      owner: projectWithTasks?.owner.email,
      taskCount: projectWithTasks?.tasks.length,
    });
    
    // Test 6: Update operation
    console.log('\n6️⃣ Testing update operation...');
    const updatedTask = await prisma.task.update({
      where: { id: testTask.id },
      data: {
        status: 'IN_PROGRESS',
        completedAt: new Date(),
      },
    });
    console.log('✅ Task updated:', {
      status: updatedTask.status,
      completedAt: updatedTask.completedAt,
    });
    
    // Test 7: Transaction
    console.log('\n7️⃣ Testing transaction...');
    const [task1, task2] = await prisma.$transaction([
      prisma.task.create({
        data: {
          title: 'Transaction Task 1',
          priority: 'LOW',
          status: 'TODO',
          projectId: testProject.id,
        },
      }),
      prisma.task.create({
        data: {
          title: 'Transaction Task 2',
          priority: 'MEDIUM',
          status: 'TODO',
          projectId: testProject.id,
        },
      }),
    ]);
    console.log('✅ Transaction completed:', {
      task1: task1.title,
      task2: task2.title,
    });
    
    // Test 8: Aggregation
    console.log('\n8️⃣ Testing aggregation...');
    const taskStats = await prisma.task.groupBy({
      by: ['priority'],
      where: {
        projectId: testProject.id,
      },
      _count: true,
    });
    console.log('✅ Task statistics:', taskStats);
    
    // Test 9: Clean up - Delete test data
    console.log('\n9️⃣ Cleaning up test data...');
    await prisma.task.deleteMany({
      where: { projectId: testProject.id },
    });
    await prisma.project.delete({
      where: { id: testProject.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All database operations tested successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseOperations().catch(console.error);