/**
 * Database Import Script
 * Imports data from JSON backup files
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function importData(dataDir) {
  if (!dataDir) {
    console.error('Please provide the data directory as an argument')
    console.error('Usage: node import-data.js <data-directory>')
    process.exit(1)
  }

  const importDir = path.join(__dirname, 'backups', dataDir)

  if (!fs.existsSync(importDir)) {
    console.error(`Directory not found: ${importDir}`)
    process.exit(1)
  }

  try {
    console.log(`Starting database import from: ${importDir}`)

    // Read metadata
    const metadata = JSON.parse(
      fs.readFileSync(path.join(importDir, 'metadata.json'), 'utf-8')
    )
    console.log('Import metadata:', metadata)

    // Import Theme Templates first (no dependencies)
    if (fs.existsSync(path.join(importDir, 'themeTemplates.json'))) {
      const themeTemplates = JSON.parse(
        fs.readFileSync(path.join(importDir, 'themeTemplates.json'), 'utf-8')
      )
      for (const template of themeTemplates) {
        await prisma.themeTemplate.upsert({
          where: { id: template.id },
          update: template,
          create: template
        })
      }
      console.log(`✓ Imported ${themeTemplates.length} theme templates`)
    }

    // Import Users (with auth methods)
    if (fs.existsSync(path.join(importDir, 'users.json'))) {
      const users = JSON.parse(
        fs.readFileSync(path.join(importDir, 'users.json'), 'utf-8')
      )
      for (const user of users) {
        const { authMethods, globalTheme, themeCustomizations, ...userData } = user

        // Create user
        await prisma.user.upsert({
          where: { id: user.id },
          update: userData,
          create: userData
        })

        // Create auth methods
        if (authMethods) {
          for (const authMethod of authMethods) {
            await prisma.authMethod.upsert({
              where: { id: authMethod.id },
              update: authMethod,
              create: authMethod
            })
          }
        }
      }
      console.log(`✓ Imported ${users.length} users`)
    }

    // Import Projects
    if (fs.existsSync(path.join(importDir, 'projects.json'))) {
      const projects = JSON.parse(
        fs.readFileSync(path.join(importDir, 'projects.json'), 'utf-8')
      )
      for (const project of projects) {
        await prisma.project.upsert({
          where: { id: project.id },
          update: project,
          create: project
        })
      }
      console.log(`✓ Imported ${projects.length} projects`)
    }

    // Import Tasks
    if (fs.existsSync(path.join(importDir, 'tasks.json'))) {
      const tasks = JSON.parse(
        fs.readFileSync(path.join(importDir, 'tasks.json'), 'utf-8')
      )
      for (const task of tasks) {
        await prisma.task.upsert({
          where: { id: task.id },
          update: task,
          create: task
        })
      }
      console.log(`✓ Imported ${tasks.length} tasks`)
    }

    // Import References
    if (fs.existsSync(path.join(importDir, 'references.json'))) {
      const references = JSON.parse(
        fs.readFileSync(path.join(importDir, 'references.json'), 'utf-8')
      )
      for (const reference of references) {
        await prisma.reference.upsert({
          where: { id: reference.id },
          update: reference,
          create: reference
        })
      }
      console.log(`✓ Imported ${references.length} references`)
    }

    // Import Media
    if (fs.existsSync(path.join(importDir, 'media.json'))) {
      const media = JSON.parse(
        fs.readFileSync(path.join(importDir, 'media.json'), 'utf-8')
      )
      for (const item of media) {
        await prisma.media.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
      console.log(`✓ Imported ${media.length} media items`)
    }

    // Import UserThemeGlobal
    if (fs.existsSync(path.join(importDir, 'userThemeGlobals.json'))) {
      const userThemeGlobals = JSON.parse(
        fs.readFileSync(path.join(importDir, 'userThemeGlobals.json'), 'utf-8')
      )
      for (const theme of userThemeGlobals) {
        await prisma.userThemeGlobal.upsert({
          where: { userId: theme.userId },
          update: theme,
          create: theme
        })
      }
      console.log(`✓ Imported ${userThemeGlobals.length} global themes`)
    }

    // Import UserThemeCustomization
    if (fs.existsSync(path.join(importDir, 'userThemeCustomizations.json'))) {
      const userThemeCustomizations = JSON.parse(
        fs.readFileSync(path.join(importDir, 'userThemeCustomizations.json'), 'utf-8')
      )
      for (const customization of userThemeCustomizations) {
        await prisma.userThemeCustomization.upsert({
          where: {
            userId_deviceIdentifier: {
              userId: customization.userId,
              deviceIdentifier: customization.deviceIdentifier
            }
          },
          update: customization,
          create: customization
        })
      }
      console.log(`✓ Imported ${userThemeCustomizations.length} theme customizations`)
    }

    console.log('\n✅ Import completed successfully!')

  } catch (error) {
    console.error('Error importing data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get directory name from command line argument
const dataDir = process.argv[2]
importData(dataDir)