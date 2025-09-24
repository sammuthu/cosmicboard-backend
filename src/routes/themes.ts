import { Router, Request, Response } from 'express'
import { prisma } from '../lib/database'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { z } from 'zod'

const router = Router()

// Validation schemas
const themeCustomizationSchema = z.object({
  themeId: z.string(),
  customColors: z.object({
    parentBackground: z.object({
      from: z.string(),
      via: z.string(),
      to: z.string()
    }),
    prismCard: z.object({
      background: z.object({
        from: z.string(),
        via: z.string(),
        to: z.string()
      }),
      glowGradient: z.object({
        from: z.string(),
        via: z.string(),
        to: z.string()
      }),
      borderColor: z.string()
    }),
    text: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      muted: z.string()
    }),
    buttons: z.object({
      primary: z.object({
        background: z.string(),
        hover: z.string(),
        text: z.string()
      }),
      secondary: z.object({
        background: z.string(),
        hover: z.string(),
        text: z.string()
      })
    }),
    status: z.object({
      success: z.string(),
      warning: z.string(),
      error: z.string(),
      info: z.string()
    })
  })
})

// Helper to extract device info from headers
function getDeviceInfo(req: Request) {
  return {
    deviceType: req.headers['x-device-type'] as string || 'desktop',
    deviceOS: req.headers['x-device-os'] as string || 'browser',
    deviceIdentifier: req.headers['x-device-identifier'] as string || 'unknown-device',
    deviceName: req.headers['x-device-name'] as string || 'Unknown Device'
  }
}

// Deep merge function for nested color objects
function deepMerge(target: any, source: any): any {
  const output = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        output[key] = deepMerge(target[key], source[key])
      } else {
        output[key] = source[key]
      }
    } else {
      output[key] = source[key]
    }
  }
  return output
}

// Get all available theme templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const themes = await prisma.themeTemplate.findMany({
      orderBy: { name: 'asc' }
    })

    res.json({
      success: true,
      data: themes
    })
  } catch (error) {
    console.error('Error fetching theme templates:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch theme templates'
    })
  }
})

// Get a specific theme template
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const theme = await prisma.themeTemplate.findUnique({
      where: { id }
    })

    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme template not found'
      })
    }

    res.json({
      success: true,
      data: theme
    })
  } catch (error) {
    console.error('Error fetching theme template:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch theme template'
    })
  }
})

// Find theme for device or create default
async function findThemeForDeviceOrDefault(userId: string, deviceInfo: any) {
  console.log('Finding theme for device:', deviceInfo)

  // 1. Check for device-specific theme
  const deviceTheme = await prisma.userThemeCustomization.findUnique({
    where: {
      userId_deviceIdentifier: {
        userId,
        deviceIdentifier: deviceInfo.deviceIdentifier
      }
    },
    include: {
      theme: true
    }
  })

  if (deviceTheme) {
    console.log('Found device-specific theme')
    const mergedColors = deepMerge(deviceTheme.theme.colors, deviceTheme.customColors)
    return {
      id: deviceTheme.id,
      themeId: deviceTheme.themeId,
      name: deviceTheme.theme.name,
      displayName: deviceTheme.theme.displayName,
      colors: mergedColors,
      isCustomized: true,
      scope: 'device'
    }
  }

  // 2. Check for user's global theme
  let globalTheme = await prisma.userThemeGlobal.findUnique({
    where: { userId },
    include: { theme: true }
  })

  // 3. If no global theme, create one using default template
  if (!globalTheme) {
    console.log('Creating default global theme for user')

    // Find default theme or first available theme
    const defaultTemplate = await prisma.themeTemplate.findFirst({
      where: { isDefault: true }
    }) || await prisma.themeTemplate.findFirst({
      orderBy: { name: 'asc' }
    })

    if (!defaultTemplate) {
      throw new Error('No theme templates available')
    }

    globalTheme = await prisma.userThemeGlobal.create({
      data: {
        userId,
        themeId: defaultTemplate.id,
        customColors: {}
      },
      include: { theme: true }
    })
  }

  console.log('Using global theme')
  const mergedColors = deepMerge(globalTheme.theme.colors, globalTheme.customColors)
  return {
    id: globalTheme.id,
    themeId: globalTheme.themeId,
    name: globalTheme.theme.name,
    displayName: globalTheme.theme.displayName,
    colors: mergedColors,
    isCustomized: Object.keys(globalTheme.customColors as any).length > 0,
    scope: 'global'
  }
}

// Get user's active theme using hierarchy
router.get('/user/active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const deviceInfo = getDeviceInfo(req)

    const theme = await findThemeForDeviceOrDefault(userId, deviceInfo)

    res.json({
      success: true,
      data: theme
    })
  } catch (error) {
    console.error('Error fetching user theme:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user theme'
    })
  }
})

// Get all user's theme customizations (both global and device-specific)
router.get('/user/customizations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const [globalTheme, deviceThemes] = await Promise.all([
      prisma.userThemeGlobal.findUnique({
        where: { userId },
        include: { theme: true }
      }),
      prisma.userThemeCustomization.findMany({
        where: { userId },
        include: { theme: true },
        orderBy: { updatedAt: 'desc' }
      })
    ])

    const result = []

    if (globalTheme) {
      result.push({
        id: globalTheme.id,
        themeId: globalTheme.themeId,
        themeName: globalTheme.theme.name,
        themeDisplayName: globalTheme.theme.displayName,
        customColors: globalTheme.customColors,
        scope: 'global',
        updatedAt: globalTheme.updatedAt
      })
    }

    for (const deviceTheme of deviceThemes) {
      result.push({
        id: deviceTheme.id,
        themeId: deviceTheme.themeId,
        themeName: deviceTheme.theme.name,
        themeDisplayName: deviceTheme.theme.displayName,
        customColors: deviceTheme.customColors,
        scope: 'device',
        deviceName: deviceTheme.deviceName,
        updatedAt: deviceTheme.updatedAt
      })
    }

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error fetching user customizations:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user customizations'
    })
  }
})

// Create or update user theme customization
router.post('/user/customize', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const validation = themeCustomizationSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid theme customization data',
        details: validation.error.issues
      })
    }

    const { themeId, customColors } = validation.data
    const { isGlobal = false } = req.body
    const deviceInfo = getDeviceInfo(req)

    // Check if theme exists
    const templateCheck = await prisma.themeTemplate.findUnique({
      where: { id: themeId }
    })

    if (!templateCheck) {
      return res.status(404).json({
        success: false,
        error: 'Theme template not found'
      })
    }

    let result

    if (isGlobal) {
      // Update or create global theme
      result = await prisma.userThemeGlobal.upsert({
        where: { userId },
        update: {
          themeId,
          customColors,
          updatedAt: new Date()
        },
        create: {
          userId,
          themeId,
          customColors
        },
        include: { theme: true }
      })

      res.json({
        success: true,
        data: {
          id: result.id,
          themeId: result.themeId,
          themeName: result.theme.name,
          themeDisplayName: result.theme.displayName,
          customColors: result.customColors,
          scope: 'global'
        }
      })
    } else {
      // Update or create device-specific theme
      result = await prisma.userThemeCustomization.upsert({
        where: {
          userId_deviceIdentifier: {
            userId,
            deviceIdentifier: deviceInfo.deviceIdentifier
          }
        },
        update: {
          themeId,
          customColors,
          updatedAt: new Date()
        },
        create: {
          userId,
          themeId,
          customColors,
          deviceType: deviceInfo.deviceType,
          deviceOS: deviceInfo.deviceOS,
          deviceIdentifier: deviceInfo.deviceIdentifier,
          deviceName: deviceInfo.deviceName
        },
        include: { theme: true }
      })

      res.json({
        success: true,
        data: {
          id: result.id,
          themeId: result.themeId,
          themeName: result.theme.name,
          themeDisplayName: result.theme.displayName,
          customColors: result.customColors,
          scope: 'device',
          deviceName: result.deviceName
        }
      })
    }
  } catch (error) {
    console.error('Error saving theme customization:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to save theme customization'
    })
  }
})

// Set active theme (without customization)
router.post('/user/set-active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { themeId, isGlobal = true } = req.body
    const deviceInfo = getDeviceInfo(req)

    console.log('Set active theme request:', { userId, themeId, isGlobal, deviceInfo })

    if (!themeId) {
      return res.status(400).json({
        success: false,
        error: 'Theme ID is required'
      })
    }

    // Check if theme exists
    const themeTemplate = await prisma.themeTemplate.findUnique({
      where: { id: themeId }
    })

    if (!themeTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Theme template not found'
      })
    }

    let result

    if (isGlobal) {
      console.log('Applying theme globally')

      // Update or create global theme
      result = await prisma.userThemeGlobal.upsert({
        where: { userId },
        update: {
          themeId,
          customColors: {},
          updatedAt: new Date()
        },
        create: {
          userId,
          themeId,
          customColors: {}
        }
      })

      res.json({
        success: true,
        data: {
          id: result.id,
          themeId: result.themeId,
          themeName: themeTemplate.name,
          themeDisplayName: themeTemplate.displayName,
          scope: 'global'
        }
      })
    } else {
      console.log('Applying theme to device only')

      // Create or update device-specific theme
      result = await prisma.userThemeCustomization.upsert({
        where: {
          userId_deviceIdentifier: {
            userId,
            deviceIdentifier: deviceInfo.deviceIdentifier
          }
        },
        update: {
          themeId,
          customColors: {},
          updatedAt: new Date()
        },
        create: {
          userId,
          themeId,
          customColors: {},
          deviceType: deviceInfo.deviceType,
          deviceOS: deviceInfo.deviceOS,
          deviceIdentifier: deviceInfo.deviceIdentifier,
          deviceName: deviceInfo.deviceName
        }
      })

      res.json({
        success: true,
        data: {
          id: result.id,
          themeId: result.themeId,
          themeName: themeTemplate.name,
          themeDisplayName: themeTemplate.displayName,
          scope: 'device',
          deviceName: result.deviceName
        }
      })
    }
  } catch (error) {
    console.error('Error setting active theme:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to set active theme'
    })
  }
})

// Delete user theme customization
router.delete('/user/customizations/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const { scope } = req.query as { scope?: 'global' | 'device' }

    if (scope === 'global') {
      // Check if it's the user's global theme
      const globalTheme = await prisma.userThemeGlobal.findFirst({
        where: { id, userId }
      })

      if (!globalTheme) {
        return res.status(404).json({
          success: false,
          error: 'Global theme not found'
        })
      }

      // Don't delete, just reset to default theme
      const defaultTemplate = await prisma.themeTemplate.findFirst({
        where: { isDefault: true }
      }) || await prisma.themeTemplate.findFirst({
        orderBy: { name: 'asc' }
      })

      if (defaultTemplate) {
        await prisma.userThemeGlobal.update({
          where: { id },
          data: {
            themeId: defaultTemplate.id,
            customColors: {}
          }
        })
      }
    } else {
      // Delete device-specific customization
      const deviceTheme = await prisma.userThemeCustomization.findFirst({
        where: { id, userId }
      })

      if (!deviceTheme) {
        return res.status(404).json({
          success: false,
          error: 'Device customization not found'
        })
      }

      await prisma.userThemeCustomization.delete({
        where: { id }
      })
    }

    res.json({
      success: true,
      message: 'Customization removed successfully'
    })
  } catch (error) {
    console.error('Error deleting customization:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete customization'
    })
  }
})

export default router