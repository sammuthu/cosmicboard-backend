import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function restoreBackup() {
  const USER_EMAIL = 'nmuthu@gmail.com';
  const BACKUP_FILE = path.join(__dirname, '../db-backup/backup_2025-09-12T10-55-02-851Z.json');
  
  try {
    console.log('📚 Starting database restoration...');
    
    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    console.log(`✅ Loaded backup from ${backupData.timestamp}`);
    console.log(`📊 Data counts:`, backupData.counts);
    
    // Get or verify user
    let user = await prisma.user.findUnique({
      where: { email: USER_EMAIL }
    });
    
    if (!user) {
      console.log(`Creating user ${USER_EMAIL}...`);
      user = await prisma.user.create({
        data: {
          email: USER_EMAIL,
          name: 'Nmuthu',
          username: 'nmuthu'
        }
      });
    }
    
    console.log(`✅ Using user: ${user.email} (ID: ${user.id})`);
    
    // Restore Projects (using userId field that exists in current schema)
    if (backupData.data.projects && backupData.data.projects.length > 0) {
      console.log(`\\n📁 Restoring ${backupData.data.projects.length} projects...`);
      
      for (const project of backupData.data.projects) {
        try {
          const createdProject = await prisma.project.create({
            data: {
              name: project.name,
              description: project.description || '',
              userId: user.id, // Use userId field from current schema
              metadata: project.metadata || {},
              createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
              updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date()
            }
          });
          console.log(`  ✅ Created project: ${project.name} (Old ID: ${project.id}, New ID: ${createdProject.id})`);
          
          // Store mapping for tasks and references
          project.newId = createdProject.id;
        } catch (error) {
          console.error(`  ❌ Failed to create project ${project.name}:`, error);
        }
      }
    }
    
    // Restore Tasks (using current schema with title and creatorId fields)
    if (backupData.data.tasks && backupData.data.tasks.length > 0) {
      console.log(`\\n📝 Restoring ${backupData.data.tasks.length} tasks...`);
      
      for (const task of backupData.data.tasks) {
        try {
          // Find the new project ID
          const project = backupData.data.projects.find((p: any) => p.id === task.projectId);
          if (!project || !project.newId) {
            console.log(`  ⚠️ Skipping task "${task.title || task.content}" - project not found`);
            continue;
          }
          
          // Map priority to current schema enum values
          const priorityMap: Record<string, 'SUPERNOVA' | 'STELLAR' | 'NEBULA'> = {
            'URGENT': 'SUPERNOVA',
            'HIGH': 'STELLAR',
            'MEDIUM': 'NEBULA',
            'LOW': 'NEBULA'
          };
          
          const createdTask = await prisma.task.create({
            data: {
              title: task.title || 'Untitled Task',
              content: task.content || '',
              projectId: project.newId,
              creatorId: user.id, // Use creatorId field from current schema
              assigneeId: user.id, // Assign to same user
              priority: priorityMap[task.priority] || 'NEBULA',
              status: task.status || 'ACTIVE',
              dueDate: task.dueDate ? new Date(task.dueDate) : null,
              metadata: task.metadata || {},
              createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
              updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date()
            }
          });
          console.log(`  ✅ Created task: ${task.title || task.content || 'Untitled'}`);
        } catch (error) {
          console.error(`  ❌ Failed to create task:`, error);
        }
      }
    }
    
    // Restore References (using current schema with userId field)
    if (backupData.data.references && backupData.data.references.length > 0) {
      console.log(`\\n📚 Restoring ${backupData.data.references.length} references...`);
      
      for (const reference of backupData.data.references) {
        try {
          // Find the new project ID
          const project = backupData.data.projects.find((p: any) => p.id === reference.projectId);
          if (!project || !project.newId) {
            console.log(`  ⚠️ Skipping reference "${reference.title}" - project not found`);
            continue;
          }
          
          // Map category to current schema enum values
          const categoryMap: Record<string, 'SNIPPET' | 'DOCUMENTATION' | 'LINK' | 'NOTE'> = {
            'DOCUMENTATION': 'DOCUMENTATION',
            'SNIPPET': 'SNIPPET', 
            'CONFIGURATION': 'NOTE',
            'TOOLS': 'NOTE',
            'API': 'DOCUMENTATION',
            'TUTORIAL': 'DOCUMENTATION',
            'REFERENCE': 'DOCUMENTATION',
            'general': 'NOTE'
          };
          
          const createdReference = await prisma.reference.create({
            data: {
              title: reference.title,
              content: reference.content || '',
              projectId: project.newId,
              userId: user.id, // Use userId field from current schema
              category: categoryMap[reference.category] || 'NOTE',
              tags: reference.tags || [],
              metadata: reference.metadata || {},
              createdAt: reference.createdAt ? new Date(reference.createdAt) : new Date(),
              updatedAt: reference.updatedAt ? new Date(reference.updatedAt) : new Date()
            }
          });
          console.log(`  ✅ Created reference: ${reference.title}`);
        } catch (error) {
          console.error(`  ❌ Failed to create reference:`, error);
        }
      }
    }
    
    // Skip Media restoration since the model doesn't exist in current schema
    if (backupData.data.media && backupData.data.media.length > 0) {
      console.log(`\\n🖼️ Skipping ${backupData.data.media.length} media items - Media model not present in current schema`);
    }
    
    // Get final counts
    const finalCounts = {
      projects: await prisma.project.count({ where: { userId: user.id } }),
      tasks: await prisma.task.count({ where: { creatorId: user.id } }),
      references: await prisma.reference.count({ where: { userId: user.id } })
    };
    
    console.log('\\n✨ Restoration complete!');
    console.log('📊 Final counts:', finalCounts);
    console.log(`✅ All data has been associated with user: ${USER_EMAIL}`);
    
  } catch (error) {
    console.error('❌ Restoration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the restoration
restoreBackup().catch(console.error);