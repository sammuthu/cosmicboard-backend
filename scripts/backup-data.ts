import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupData() {
  try {
    console.log('Starting database backup...');
    
    // Fetch all data
    const [projects, tasks, references, media] = await Promise.all([
      prisma.project.findMany(),
      prisma.task.findMany(),
      prisma.reference.findMany(),
      prisma.media.findMany(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      data: {
        projects,
        tasks,
        references,
        media,
      },
      counts: {
        projects: projects.length,
        tasks: tasks.length,
        references: references.length,
        media: media.length,
      }
    };

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'db-backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Save backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup_${timestamp}.json`);
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup completed successfully!`);
    console.log(`📁 Backup saved to: ${backupPath}`);
    console.log(`📊 Backed up:`);
    console.log(`   - ${projects.length} projects`);
    console.log(`   - ${tasks.length} tasks`);
    console.log(`   - ${references.length} references`);
    console.log(`   - ${media.length} media files`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupData();