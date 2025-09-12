import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function restoreData(backupFile?: string) {
  try {
    const backupDir = path.join(process.cwd(), 'db-backup');
    
    // If no file specified, use the most recent backup
    if (!backupFile) {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        console.error('No backup files found in db-backup directory');
        process.exit(1);
      }
      
      backupFile = files[0];
    }
    
    const backupPath = path.join(backupDir, backupFile);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`Backup file not found: ${backupPath}`);
      process.exit(1);
    }
    
    console.log(`Restoring from: ${backupPath}`);
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    
    // Restore data in order (respecting foreign key constraints)
    console.log('Restoring projects...');
    for (const project of backupData.data.projects) {
      await prisma.project.upsert({
        where: { id: project.id },
        update: project,
        create: project,
      });
    }
    
    console.log('Restoring tasks...');
    for (const task of backupData.data.tasks) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: task,
        create: task,
      });
    }
    
    console.log('Restoring references...');
    for (const reference of backupData.data.references) {
      await prisma.reference.upsert({
        where: { id: reference.id },
        update: reference,
        create: reference,
      });
    }
    
    console.log('Restoring media...');
    for (const media of backupData.data.media) {
      await prisma.media.upsert({
        where: { id: media.id },
        update: media,
        create: media,
      });
    }
    
    console.log(`✅ Restore completed successfully!`);
    console.log(`📊 Restored:`);
    console.log(`   - ${backupData.counts.projects} projects`);
    console.log(`   - ${backupData.counts.tasks} tasks`);
    console.log(`   - ${backupData.counts.references} references`);
    console.log(`   - ${backupData.counts.media} media files`);
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run with optional backup file argument
const backupFile = process.argv[2];
restoreData(backupFile);