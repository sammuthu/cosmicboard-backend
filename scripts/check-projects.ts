#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProjects() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true }
  });
  
  console.log('Existing projects:');
  projects.forEach(p => console.log(`  ${p.id}: ${p.name}`));
  
  // Check the project IDs from files
  const fileProjectIds = [
    'cmf3l0iqv0000m6anec4pxlau',
    'cmfbqf0ln0000m6os28skps0i'
  ];
  
  console.log('\nProject IDs from files:');
  for (const id of fileProjectIds) {
    const exists = projects.some(p => p.id === id);
    console.log(`  ${id}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  }
  
  // Get first project ID if any exist
  if (projects.length > 0) {
    console.log(`\nFirst existing project ID to use: ${projects[0].id}`);
  }
  
  await prisma.$disconnect();
}

checkProjects().catch(console.error);