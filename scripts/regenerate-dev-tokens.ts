import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function regenerateDevTokens() {
  try {
    // Find users
    const nmuthu = await prisma.user.findUnique({ where: { email: 'nmuthu@gmail.com' } });
    const sammuthu = await prisma.user.findUnique({ where: { email: 'sammuthu@me.com' } });

    if (!nmuthu || !sammuthu) {
      console.error('Users not found!');
      process.exit(1);
    }

    // Generate new tokens
    const nmuthuToken = crypto.randomBytes(32).toString('hex');
    const sammuthuToken = crypto.randomBytes(32).toString('hex');

    // Expires in 10 years for dev
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);

    // Delete old tokens for these users
    await prisma.accessToken.deleteMany({
      where: {
        OR: [
          { userId: nmuthu.id },
          { userId: sammuthu.id }
        ]
      }
    });

    // Create new tokens
    await prisma.accessToken.createMany({
      data: [
        {
          userId: nmuthu.id,
          token: nmuthuToken,
          expiresAt
        },
        {
          userId: sammuthu.id,
          token: sammuthuToken,
          expiresAt
        }
      ]
    });

    console.log('\n✅ Successfully regenerated dev tokens!\n');
    console.log('iOS token (nmuthu@gmail.com):', nmuthuToken);
    console.log('Android token (sammuthu@me.com):', sammuthuToken);
    console.log('\nUpdate these tokens in:');
    console.log('- /Users/sammuthu/Projects/cosmicboard-mobile/src/services/api.ts');
    console.log('- Any other places where dev tokens are hardcoded\n');

  } catch (error) {
    console.error('Error regenerating tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateDevTokens();
