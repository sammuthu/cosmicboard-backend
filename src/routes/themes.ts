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

// Get user's theme configuration (merged with defaults)
router.get('/user/active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Get user's active theme customization
    const userTheme = await prisma.userThemeCustomization.findFirst({
      where: {
        userId,
        isActive: true
      },
      include: {
        theme: true
      }
    })

    if (userTheme) {
      // Merge custom colors with theme defaults
      const mergedColors = {
        ...(userTheme.theme.colors as object),
        ...(userTheme.customColors as object || {})
      }

      return res.json({
        success: true,
        data: {
          id: userTheme.id,
          themeId: userTheme.themeId,
          name: userTheme.theme.name,
          displayName: userTheme.theme.displayName,
          colors: mergedColors,
          isCustomized: true
        }
      })
    }

    // If no active customization, return the default theme
    const defaultTheme = await prisma.themeTemplate.findFirst({
      where: { isDefault: true }
    })

    if (!defaultTheme) {
      // Fallback to first theme if no default is set
      const firstTheme = await prisma.themeTemplate.findFirst({
        orderBy: { name: 'asc' }
      })

      return res.json({
        success: true,
        data: {
          themeId: firstTheme?.id,
          name: firstTheme?.name,
          displayName: firstTheme?.displayName,
          colors: firstTheme?.colors,
          isCustomized: false
        }
      })
    }

    res.json({
      success: true,
      data: {
        themeId: defaultTheme.id,
        name: defaultTheme.name,
        displayName: defaultTheme.displayName,
        colors: defaultTheme.colors,
        isCustomized: false
      }
    })
  } catch (error) {
    console.error('Error fetching user theme:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user theme'
    })
  }
})

// Get all user's theme customizations
router.get('/user/customizations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const customizations = await prisma.userThemeCustomization.findMany({
      where: { userId },
      include: {
        theme: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    res.json({
      success: true,
      data: customizations.map(c => ({
        id: c.id,
        themeId: c.themeId,
        themeName: c.theme.name,
        themeDisplayName: c.theme.displayName,
        customColors: c.customColors,
        isActive: c.isActive,
        updatedAt: c.updatedAt
      }))
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

    // Check if theme exists
    const theme = await prisma.themeTemplate.findUnique({
      where: { id: themeId }
    })

    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme template not found'
      })
    }

    // Deactivate all other customizations for this user
    await prisma.userThemeCustomization.updateMany({
      where: { userId },
      data: { isActive: false }
    })

    // Create or update customization
    const customization = await prisma.userThemeCustomization.upsert({
      where: {
        userId_themeId: {
          userId,
          themeId
        }
      },
      update: {
        customColors,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        userId,
        themeId,
        customColors,
        isActive: true
      },
      include: {
        theme: true
      }
    })

    res.json({
      success: true,
      data: {
        id: customization.id,
        themeId: customization.themeId,
        themeName: customization.theme.name,
        themeDisplayName: customization.theme.displayName,
        customColors: customization.customColors,
        isActive: customization.isActive
      }
    })
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
    const { themeId } = req.body

    if (!themeId) {
      return res.status(400).json({
        success: false,
        error: 'Theme ID is required'
      })
    }

    // Check if theme exists
    const theme = await prisma.themeTemplate.findUnique({
      where: { id: themeId }
    })

    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme template not found'
      })
    }

    // Deactivate all customizations
    await prisma.userThemeCustomization.updateMany({
      where: { userId },
      data: { isActive: false }
    })

    // Create or update customization with no custom colors (use defaults)
    const customization = await prisma.userThemeCustomization.upsert({
      where: {
        userId_themeId: {
          userId,
          themeId
        }
      },
      update: {
        isActive: true,
        customColors: {},
        updatedAt: new Date()
      },
      create: {
        userId,
        themeId,
        customColors: {},
        isActive: true
      },
      include: {
        theme: true
      }
    })

    res.json({
      success: true,
      data: {
        id: customization.id,
        themeId: customization.themeId,
        themeName: customization.theme.name,
        themeDisplayName: customization.theme.displayName,
        isActive: customization.isActive
      }
    })
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

    // Check if customization exists and belongs to user
    const customization = await prisma.userThemeCustomization.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Customization not found'
      })
    }

    // Don't allow deletion of active customization
    if (customization.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active customization. Set another theme as active first.'
      })
    }

    await prisma.userThemeCustomization.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Customization deleted successfully'
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