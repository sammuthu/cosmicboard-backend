import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Define the color structure for each theme
interface ThemeColors {
  // Parent background gradient
  parentBackground: {
    from: string
    via: string
    to: string
  }
  // PrismCard container colors
  prismCard: {
    background: {
      from: string
      via: string
      to: string
    }
    glowGradient: {
      from: string
      via: string
      to: string
    }
    borderColor: string
  }
  // Text colors
  text: {
    primary: string
    secondary: string
    accent: string
    muted: string
  }
  // Button colors
  buttons: {
    primary: {
      background: string
      hover: string
      text: string
    }
    secondary: {
      background: string
      hover: string
      text: string
    }
  }
  // Status colors
  status: {
    success: string
    warning: string
    error: string
    info: string
  }
}

const themes = [
  {
    name: 'moon',
    displayName: 'Moon',
    description: 'Dark blue theme with cool tones',
    colors: {
      parentBackground: {
        from: '#1e293b', // slate-900
        via: '#1e3a8a',  // blue-900
        to: '#312e81'    // indigo-950
      },
      prismCard: {
        background: {
          from: 'rgba(17, 24, 39, 0.9)', // gray-900/90
          via: 'rgba(31, 41, 55, 0.9)',  // gray-800/90
          to: 'rgba(17, 24, 39, 0.9)'    // gray-900/90
        },
        glowGradient: {
          from: '#a855f7', // purple-500
          via: '#ec4899',  // pink-500
          to: '#eab308'    // yellow-500
        },
        borderColor: 'rgba(148, 163, 184, 0.2)' // slate-400/20
      },
      text: {
        primary: '#f1f5f9',   // slate-100
        secondary: '#cbd5e1', // slate-300
        accent: '#60a5fa',    // blue-400
        muted: '#94a3b8'      // slate-400
      },
      buttons: {
        primary: {
          background: '#3b82f6', // blue-500
          hover: '#2563eb',      // blue-600
          text: '#ffffff'
        },
        secondary: {
          background: 'rgba(59, 130, 246, 0.2)', // blue-500/20
          hover: 'rgba(59, 130, 246, 0.3)',      // blue-500/30
          text: '#60a5fa'                        // blue-400
        }
      },
      status: {
        success: '#10b981', // emerald-500
        warning: '#f59e0b', // amber-500
        error: '#ef4444',   // red-500
        info: '#3b82f6'     // blue-500
      }
    } as ThemeColors
  },
  {
    name: 'sun',
    displayName: 'Sun',
    description: 'Warm orange and amber tones',
    colors: {
      parentBackground: {
        from: '#7c2d12', // orange-900
        via: '#78350f',  // amber-900
        to: '#713f12'    // yellow-900
      },
      prismCard: {
        background: {
          from: 'rgba(17, 24, 39, 0.9)',
          via: 'rgba(31, 41, 55, 0.9)',
          to: 'rgba(17, 24, 39, 0.9)'
        },
        glowGradient: {
          from: '#f97316', // orange-500
          via: '#fbbf24',  // amber-400
          to: '#facc15'    // yellow-400
        },
        borderColor: 'rgba(251, 191, 36, 0.2)' // amber-400/20
      },
      text: {
        primary: '#fef3c7',   // amber-100
        secondary: '#fde68a', // amber-200
        accent: '#fbbf24',    // amber-400
        muted: '#fcd34d'      // amber-300
      },
      buttons: {
        primary: {
          background: '#f59e0b', // amber-500
          hover: '#d97706',      // amber-600
          text: '#ffffff'
        },
        secondary: {
          background: 'rgba(245, 158, 11, 0.2)',
          hover: 'rgba(245, 158, 11, 0.3)',
          text: '#fbbf24'
        }
      },
      status: {
        success: '#84cc16', // lime-500
        warning: '#f59e0b', // amber-500
        error: '#dc2626',   // red-600
        info: '#0891b2'     // cyan-600
      }
    } as ThemeColors
  },
  {
    name: 'daylight',
    displayName: 'Daylight',
    description: 'Bright and light theme with warm tones',
    colors: {
      parentBackground: {
        from: '#fffbeb', // amber-50
        via: '#fff7ed',  // orange-50
        to: '#fefce8'    // yellow-50
      },
      prismCard: {
        background: {
          from: 'rgba(255, 255, 255, 0.9)',
          via: 'rgba(254, 249, 195, 0.9)', // yellow-100/90
          to: 'rgba(255, 255, 255, 0.9)'
        },
        glowGradient: {
          from: '#fbbf24', // amber-400
          via: '#fb923c',  // orange-400
          to: '#facc15'    // yellow-400
        },
        borderColor: 'rgba(251, 191, 36, 0.3)'
      },
      text: {
        primary: '#292524',   // stone-800
        secondary: '#57534e', // stone-600
        accent: '#ea580c',    // orange-600
        muted: '#78716c'      // stone-500
      },
      buttons: {
        primary: {
          background: '#f97316', // orange-500
          hover: '#ea580c',      // orange-600
          text: '#ffffff'
        },
        secondary: {
          background: 'rgba(249, 115, 22, 0.1)',
          hover: 'rgba(249, 115, 22, 0.2)',
          text: '#ea580c'
        }
      },
      status: {
        success: '#65a30d', // lime-600
        warning: '#d97706', // amber-600
        error: '#dc2626',   // red-600
        info: '#0284c7'     // sky-600
      }
    } as ThemeColors
  },
  {
    name: 'comet',
    displayName: 'Comet',
    description: 'Deep purple and violet cosmic theme',
    colors: {
      parentBackground: {
        from: '#581c87', // purple-900
        via: '#5b21b6',  // violet-900
        to: '#312e81'    // indigo-900
      },
      prismCard: {
        background: {
          from: 'rgba(17, 24, 39, 0.9)',
          via: 'rgba(31, 41, 55, 0.9)',
          to: 'rgba(17, 24, 39, 0.9)'
        },
        glowGradient: {
          from: '#a855f7', // purple-500
          via: '#8b5cf6',  // violet-500
          to: '#ec4899'    // pink-500
        },
        borderColor: 'rgba(168, 85, 247, 0.2)'
      },
      text: {
        primary: '#f3e8ff',   // purple-50
        secondary: '#e9d5ff', // purple-100
        accent: '#c084fc',    // purple-400
        muted: '#d8b4fe'      // purple-300
      },
      buttons: {
        primary: {
          background: '#a855f7', // purple-500
          hover: '#9333ea',      // purple-600
          text: '#ffffff'
        },
        secondary: {
          background: 'rgba(168, 85, 247, 0.2)',
          hover: 'rgba(168, 85, 247, 0.3)',
          text: '#c084fc'
        }
      },
      status: {
        success: '#22c55e', // green-500
        warning: '#f59e0b', // amber-500
        error: '#ef4444',   // red-500
        info: '#8b5cf6'     // violet-500
      }
    } as ThemeColors
  },
  {
    name: 'earth',
    displayName: 'Earth',
    description: 'Natural blue and green tones',
    colors: {
      parentBackground: {
        from: '#1e3a8a', // blue-900
        via: '#134e4a',  // teal-900
        to: '#14532d'    // green-900
      },
      prismCard: {
        background: {
          from: 'rgba(17, 24, 39, 0.9)',
          via: 'rgba(31, 41, 55, 0.9)',
          to: 'rgba(17, 24, 39, 0.9)'
        },
        glowGradient: {
          from: '#3b82f6', // blue-500
          via: '#14b8a6',  // teal-500
          to: '#22c55e'    // green-500
        },
        borderColor: 'rgba(20, 184, 166, 0.2)' // teal-500/20
      },
      text: {
        primary: '#ecfdf5',   // emerald-50
        secondary: '#a7f3d0', // emerald-200
        accent: '#34d399',    // emerald-400
        muted: '#6ee7b7'      // emerald-300
      },
      buttons: {
        primary: {
          background: '#10b981', // emerald-500
          hover: '#059669',      // emerald-600
          text: '#ffffff'
        },
        secondary: {
          background: 'rgba(16, 185, 129, 0.2)',
          hover: 'rgba(16, 185, 129, 0.3)',
          text: '#34d399'
        }
      },
      status: {
        success: '#22c55e', // green-500
        warning: '#eab308', // yellow-500
        error: '#f87171',   // red-400
        info: '#06b6d4'     // cyan-500
      }
    } as ThemeColors
  },
  {
    name: 'rocket',
    displayName: 'Rocket',
    description: 'Sleek gray and metallic theme',
    colors: {
      parentBackground: {
        from: '#111827', // gray-900
        via: '#1e293b',  // slate-800
        to: '#18181b'    // zinc-900
      },
      prismCard: {
        background: {
          from: 'rgba(17, 24, 39, 0.95)',
          via: 'rgba(31, 41, 55, 0.95)',
          to: 'rgba(17, 24, 39, 0.95)'
        },
        glowGradient: {
          from: '#6b7280', // gray-500
          via: '#9ca3af',  // gray-400
          to: '#d1d5db'    // gray-300
        },
        borderColor: 'rgba(156, 163, 175, 0.2)' // gray-400/20
      },
      text: {
        primary: '#f3f4f6',   // gray-100
        secondary: '#d1d5db', // gray-300
        accent: '#9ca3af',    // gray-400
        muted: '#6b7280'      // gray-500
      },
      buttons: {
        primary: {
          background: '#4b5563', // gray-600
          hover: '#374151',      // gray-700
          text: '#ffffff'
        },
        secondary: {
          background: 'rgba(75, 85, 99, 0.3)',
          hover: 'rgba(75, 85, 99, 0.4)',
          text: '#d1d5db'
        }
      },
      status: {
        success: '#10b981', // emerald-500
        warning: '#f59e0b', // amber-500
        error: '#ef4444',   // red-500
        info: '#3b82f6'     // blue-500
      }
    } as ThemeColors
  },
  {
    name: 'saturn',
    displayName: 'Saturn',
    description: 'Purple to pink gradient theme',
    colors: {
      parentBackground: {
        from: '#581c87', // purple-900
        via: '#701a75',  // fuchsia-900
        to: '#831843'    // pink-900
      },
      prismCard: {
        background: {
          from: 'rgba(17, 24, 39, 0.9)',
          via: 'rgba(31, 41, 55, 0.9)',
          to: 'rgba(17, 24, 39, 0.9)'
        },
        glowGradient: {
          from: '#a855f7', // purple-500
          via: '#d946ef',  // fuchsia-500
          to: '#ec4899'    // pink-500
        },
        borderColor: 'rgba(217, 70, 239, 0.2)' // fuchsia-500/20
      },
      text: {
        primary: '#fdf4ff',   // fuchsia-50
        secondary: '#fae8ff', // fuchsia-100
        accent: '#e879f9',    // fuchsia-400
        muted: '#f0abfc'      // fuchsia-300
      },
      buttons: {
        primary: {
          background: '#d946ef', // fuchsia-500
          hover: '#c026d3',      // fuchsia-600
          text: '#ffffff'
        },
        secondary: {
          background: 'rgba(217, 70, 239, 0.2)',
          hover: 'rgba(217, 70, 239, 0.3)',
          text: '#e879f9'
        }
      },
      status: {
        success: '#22c55e', // green-500
        warning: '#f59e0b', // amber-500
        error: '#ef4444',   // red-500
        info: '#a855f7'     // purple-500
      }
    } as ThemeColors
  },
  {
    name: 'sparkle',
    displayName: 'Sparkle',
    description: 'Pink and rose magical theme',
    colors: {
      parentBackground: {
        from: '#831843', // pink-900
        via: '#881337',  // rose-900
        to: '#581c87'    // purple-900
      },
      prismCard: {
        background: {
          from: 'rgba(17, 24, 39, 0.9)',
          via: 'rgba(31, 41, 55, 0.9)',
          to: 'rgba(17, 24, 39, 0.9)'
        },
        glowGradient: {
          from: '#ec4899', // pink-500
          via: '#f43f5e',  // rose-500
          to: '#a855f7'    // purple-500
        },
        borderColor: 'rgba(236, 72, 153, 0.2)' // pink-500/20
      },
      text: {
        primary: '#fdf2f8',   // pink-50
        secondary: '#fce7f3', // pink-100
        accent: '#f9a8d4',    // pink-300
        muted: '#fbcfe8'      // pink-200
      },
      buttons: {
        primary: {
          background: '#ec4899', // pink-500
          hover: '#db2777',      // pink-600
          text: '#ffffff'
        },
        secondary: {
          background: 'rgba(236, 72, 153, 0.2)',
          hover: 'rgba(236, 72, 153, 0.3)',
          text: '#f9a8d4'
        }
      },
      status: {
        success: '#22c55e', // green-500
        warning: '#f59e0b', // amber-500
        error: '#ef4444',   // red-500
        info: '#ec4899'     // pink-500
      }
    } as ThemeColors
  }
]

async function seedThemes() {
  console.log('🎨 Starting theme seeding...')

  try {
    // Clear existing themes
    await prisma.userThemeCustomization.deleteMany()
    await prisma.themeTemplate.deleteMany()
    console.log('✅ Cleared existing themes')

    // Insert all themes
    for (const theme of themes) {
      await prisma.themeTemplate.create({
        data: {
          name: theme.name,
          displayName: theme.displayName,
          description: theme.description,
          isDefault: theme.name === 'moon', // Moon is the default theme
          colors: theme.colors as any,
          metadata: {
            version: '1.0.0',
            createdBy: 'system'
          }
        }
      })
      console.log(`✅ Created theme: ${theme.displayName}`)
    }

    console.log(`\n✨ Successfully seeded ${themes.length} themes!`)
  } catch (error) {
    console.error('❌ Error seeding themes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedThemes()
  .catch(console.error)
  .finally(() => process.exit())