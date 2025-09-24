/**
 * Database Export Script
 * Exports all data from the database to JSON files for backup and migration
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function exportData() {
  const exportDir = path.join(__dirname, 'backups', `data_${new Date().toISOString().split('T')[0]}`)

  // Create export directory
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  try {
    console.log('Starting database export...')

    // Export Users
    const users = await prisma.user.findMany({
      include: {
        authMethods: true,
        globalTheme: true,
        themeCustomizations: true
      }
    })
    fs.writeFileSync(
      path.join(exportDir, 'users.json'),
      JSON.stringify(users, null, 2)
    )
    console.log(`✓ Exported ${users.length} users`)

    // Export Theme Templates
    const themeTemplates = await prisma.themeTemplate.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'themeTemplates.json'),
      JSON.stringify(themeTemplates, null, 2)
    )
    console.log(`✓ Exported ${themeTemplates.length} theme templates`)

    // Export Projects
    const projects = await prisma.project.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'projects.json'),
      JSON.stringify(projects, null, 2)
    )
    console.log(`✓ Exported ${projects.length} projects`)

    // Export Tasks
    const tasks = await prisma.task.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'tasks.json'),
      JSON.stringify(tasks, null, 2)
    )
    console.log(`✓ Exported ${tasks.length} tasks`)

    // Export References
    const references = await prisma.reference.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'references.json'),
      JSON.stringify(references, null, 2)
    )
    console.log(`✓ Exported ${references.length} references`)

    // Export Media
    const media = await prisma.media.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'media.json'),
      JSON.stringify(media, null, 2)
    )
    console.log(`✓ Exported ${media.length} media items`)

    // Export UserThemeGlobal
    const userThemeGlobals = await prisma.userThemeGlobal.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'userThemeGlobals.json'),
      JSON.stringify(userThemeGlobals, null, 2)
    )
    console.log(`✓ Exported ${userThemeGlobals.length} global themes`)

    // Export UserThemeCustomization
    const userThemeCustomizations = await prisma.userThemeCustomization.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'userThemeCustomizations.json'),
      JSON.stringify(userThemeCustomizations, null, 2)
    )
    console.log(`✓ Exported ${userThemeCustomizations.length} theme customizations`)

    // Create metadata file
    const metadata = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      counts: {
        users: users.length,
        themeTemplates: themeTemplates.length,
        projects: projects.length,
        tasks: tasks.length,
        references: references.length,
        media: media.length,
        userThemeGlobals: userThemeGlobals.length,
        userThemeCustomizations: userThemeCustomizations.length
      }
    }
    fs.writeFileSync(
      path.join(exportDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    )

    console.log(`\n✅ Export completed successfully!`)
    console.log(`📁 Data exported to: ${exportDir}`)

  } catch (error) {
    console.error('Error exporting data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportData()