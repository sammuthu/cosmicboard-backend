import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const user = await prisma.user.findUnique({
    where: { email: 'nmuthu@gmail.com' },
    include: {
      Project: true,
      Reference: true,
      Task_Task_creatorIdToUser: true
    }
  });
  
  if (user) {
    console.log('🧑 User:', user.email, '(ID:', user.id + ')');
    console.log('📁 Projects owned:', user.Project.length);
    console.log('📚 References:', user.Reference.length);  
    console.log('📝 Tasks created:', user.Task_Task_creatorIdToUser.length);
    
    console.log('\n📁 Project names:');
    user.Project.forEach(p => console.log('  -', p.name));
    
    console.log('\n📝 Task titles:');
    user.Task_Task_creatorIdToUser.forEach(t => console.log('  -', t.title));
    
    console.log('\n✅ All data is successfully associated with user:', user.email);
  } else {
    console.log('❌ User not found');
  }
  
  await prisma.$disconnect();
}

verify().catch(console.error);