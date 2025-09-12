const { PrismaClient } = require('@prisma/client');

async function getAuthToken() {
  const prisma = new PrismaClient();
  
  try {
    // Get the user first
    const user = await prisma.user.findUnique({
      where: { email: 'nmuthu@gmail.com' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user.email, 'ID:', user.id);
    
    // Get latest refresh token
    const refreshToken = await prisma.refreshToken.findFirst({
      where: { 
        userId: user.id,
        expiresAt: { gt: new Date() }
      },
      orderBy: { expiresAt: 'desc' }
    });
    
    if (!refreshToken) {
      console.log('No valid refresh token found');
      return;
    }
    
    console.log('Auth token:', refreshToken.token);
    console.log('Expires at:', refreshToken.expiresAt);
    
    // Test the projects endpoint with this token
    const response = await fetch('http://localhost:7779/api/projects', {
      headers: {
        'Authorization': `Bearer ${refreshToken.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const projects = await response.json();
      console.log('\n✅ Projects endpoint working!');
      console.log(`Found ${projects.length} projects for user ${user.email}`);
      projects.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));
    } else {
      console.log('\n❌ Projects endpoint failed:', response.status, await response.text());
    }
    
    // Test current priority endpoint
    const priorityResponse = await fetch('http://localhost:7779/api/tasks/current-priority', {
      headers: {
        'Authorization': `Bearer ${refreshToken.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (priorityResponse.ok) {
      const currentPriority = await priorityResponse.json();
      console.log('\n✅ Current priority endpoint working!');
      console.log('Current priority task:', currentPriority);
    } else {
      console.log('\n❌ Current priority endpoint failed:', priorityResponse.status, await priorityResponse.text());
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAuthToken();