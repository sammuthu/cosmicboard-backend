const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function fixExtensions() {
  try {
    // Get all media items
    const mediaItems = await prisma.media.findMany();
    
    for (const item of mediaItems) {
      const metadata = item.metadata || {};
      
      // If extension is missing, extract from filename
      if (!metadata.extension && item.name) {
        const ext = path.extname(item.name).slice(1).toLowerCase();
        if (ext) {
          metadata.extension = ext;
          
          // Update the record
          await prisma.media.update({
            where: { id: item.id },
            data: { 
              metadata: {
                ...metadata,
                extension: ext
              }
            }
          });
          
          console.log(`Updated ${item.name} with extension: ${ext}`);
        }
      }
    }
    
    console.log('Done fixing extensions');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExtensions();
