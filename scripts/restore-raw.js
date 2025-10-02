const fs = require('fs');
const { Client } = require('pg');

async function restore() {
  const client = new Client({
    user: 'admin',
    password: 'localdev123',
    host: 'localhost',
    port: 5432,
    database: 'cosmicspace'
  });

  await client.connect();

  try {
    const backup = JSON.parse(fs.readFileSync('./db-backup/backup_2025-09-12T10-55-02-851Z.json', 'utf-8'));
    
    // Get or create default user
    const userResult = await client.query("SELECT id FROM \"User\" WHERE email = 'nmuthu@gmail.com' LIMIT 1");
    const userId = userResult.rows[0]?.id;
    
    console.log('Using user ID:', userId);
    
    // Restore projects
    console.log('Restoring', backup.data.projects.length, 'projects...');
    for (const project of backup.data.projects) {
      await client.query(`
        INSERT INTO "Project" (id, name, description, "userId", archived, metadata, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          "userId" = EXCLUDED."userId",
          archived = EXCLUDED.archived
      `, [project.id, project.name, project.description, userId, project.archived || false, project.metadata || {}, project.createdAt, project.updatedAt]);
    }
    
    // Restore tasks
    console.log('Restoring', backup.data.tasks.length, 'tasks...');
    for (const task of backup.data.tasks) {
      await client.query(`
        INSERT INTO "Task" (id, "projectId", title, content, priority, status, tags, "dueDate", "completedAt", "creatorId", "assigneeId", metadata, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content
      `, [task.id, task.projectId, task.title, task.content, task.priority, task.status, task.tags || [], task.dueDate, task.completedAt, userId, task.assigneeId, task.metadata || {}, task.createdAt, task.updatedAt]);
    }
    
    // Restore references
    console.log('Restoring', backup.data.references.length, 'references...');
    for (const ref of backup.data.references) {
      await client.query(`
        INSERT INTO "Reference" (id, "projectId", "userId", title, content, category, tags, language, metadata, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content
      `, [ref.id, ref.projectId, userId, ref.title, ref.content, ref.category, ref.tags || [], ref.language, ref.metadata || {}, ref.createdAt, ref.updatedAt]);
    }
    
    console.log('✅ Restore completed!');
    console.log('Projects:', backup.counts.projects);
    console.log('Tasks:', backup.counts.tasks);
    console.log('References:', backup.counts.references);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

restore().catch(console.error);
