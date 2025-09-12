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
    
    // Restore Projects
    if (backupData.data.projects && backupData.data.projects.length > 0) {
      console.log(`\n📁 Restoring ${backupData.data.projects.length} projects...`);
      
      for (const project of backupData.data.projects) {
        try {
          const createdProject = await prisma.project.create({
            data: {
              name: project.name,
              description: project.description || '',
              ownerId: user.id,
              metadata: project.metadata || {},
              createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
              updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date()
            }
          });
          console.log(`  ✅ Created project: ${project.name} (Old ID: ${project.id}, New ID: ${createdProject.id})`);
          
          // Store mapping for tasks
          project.newId = createdProject.id;
        } catch (error) {
          console.error(`  ❌ Failed to create project ${project.name}:`, error);
        }
      }
    }
    
    // Restore Tasks
    if (backupData.data.tasks && backupData.data.tasks.length > 0) {
      console.log(`\n📝 Restoring ${backupData.data.tasks.length} tasks...`);
      
      for (const task of backupData.data.tasks) {
        try {
          // Find the new project ID
          const project = backupData.data.projects.find((p: any) => p.id === task.projectId);
          if (!project || !project.newId) {
            console.log(`  ⚠️ Skipping task "${task.title}" - project not found`);
            continue;
          }
          
          const createdTask = await prisma.task.create({
            data: {
              content: task.content || task.title || 'Untitled Task', // Use content field as per schema
              projectId: project.newId,
              priority: task.priority || 'MEDIUM',
              status: task.status || 'ACTIVE',
              metadata: task.metadata || {},
              createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
              updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date()
            }
          });
          console.log(`  ✅ Created task: ${task.title || 'Untitled'}`);
        } catch (error) {
          console.error(`  ❌ Failed to create task:`, error);
        }
      }
    }
    
    // Restore References
    if (backupData.data.references && backupData.data.references.length > 0) {
      console.log(`\n📚 Restoring ${backupData.data.references.length} references...`);
      
      for (const reference of backupData.data.references) {
        try {
          // Find the new project ID
          const project = backupData.data.projects.find((p: any) => p.id === reference.projectId);
          if (!project || !project.newId) {
            console.log(`  ⚠️ Skipping reference "${reference.title}" - project not found`);
            continue;
          }
          
          const createdReference = await prisma.reference.create({
            data: {
              title: reference.title,
              content: reference.content || '',
              url: reference.url || null,
              category: reference.category || 'DOCUMENTATION', // Use enum value from schema
              tags: reference.tags || [],
              projectId: project.newId,
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
    
    // Restore Media
    if (backupData.data.media && backupData.data.media.length > 0) {
      console.log(`\n🖼️ Restoring ${backupData.data.media.length} media items...`);
      
      for (const media of backupData.data.media) {
        try {
          // Find the new project ID if associated
          let newProjectId = null;
          if (media.projectId) {
            const project = backupData.data.projects.find((p: any) => p.id === media.projectId);
            newProjectId = project?.newId || null;
          }
          
          const createdMedia = await prisma.media.create({
            data: {
              type: media.type,
              name: media.name,
              originalName: media.originalName || media.name, // Use originalName if available, fallback to name
              url: media.url,
              thumbnailUrl: media.thumbnailUrl || null,
              size: media.size || 0,
              mimeType: media.mimeType || 'application/octet-stream',
              projectId: newProjectId,
              uploadedBy: user.id, // Use uploadedBy instead of userId
              metadata: media.metadata || {},
              createdAt: media.createdAt ? new Date(media.createdAt) : new Date(),
              updatedAt: media.updatedAt ? new Date(media.updatedAt) : new Date()
            }
          });
          console.log(`  ✅ Created media: ${media.name}`);
        } catch (error) {
          console.error(`  ❌ Failed to create media:`, error);
        }
      }
    }
    
    // Get final counts
    const finalCounts = {
      projects: await prisma.project.count({ where: { ownerId: user.id } }),
      tasks: await prisma.task.count({ where: { project: { ownerId: user.id } } }),
      references: await prisma.reference.count({ where: { project: { ownerId: user.id } } }),
      media: await prisma.media.count({ where: { uploadedBy: user.id } })
    };
    
    console.log('\n✨ Restoration complete!');
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