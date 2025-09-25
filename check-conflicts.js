const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConflicts() {
  const targetProject = 'cmfgwu1qz0001m6knbhq19qbh';

  // IDs from S3 files in the pdf folder
  const s3FileIds = [
    '524b4d33-5472-4046-a36b-d2517db54cac', // CLAUDE.md
    'ccc92952-c895-467c-a854-b28d6ef385d6', // Download Sam_Muthu_Resume_Fun_Style.docx
    'ce1fd183-e2ee-4ae9-bdde-285b2a3c57dc', // web-mobile-sync-guide.txt
    'd1ba9cf1-722c-4c86-b6fb-bc60cad7608f', // Sam_Muthu_Updated_One_Pager.pdf
    'ec1f44ef-d2ae-4fe5-a364-0dbffeaaf04e', // Sam_Muthu_Updated_One_Pager.pdf (duplicate name)
    'f6d16c49-deea-4e19-8ae4-94b54ed49c4b', // package.json
    'fdd93b9e-df6b-4548-b200-cd717bbc8cb6', // tsconfig.json
  ];

  console.log('Checking conflicts for S3 files in project:', targetProject);
  console.log('=' + '='.repeat(60));

  for (const id of s3FileIds) {
    const record = await prisma.media.findUnique({
      where: { id },
      include: { project: true }
    });

    if (record) {
      if (record.projectId === targetProject) {
        console.log('✅ ID', id.substring(0, 8) + '...');
        console.log('   File:', record.name);
        console.log('   Correct project');
      } else {
        console.log('❌ CONFLICT - ID', id.substring(0, 8) + '...');
        console.log('   File:', record.name);
        console.log('   Wrong project:', record.project.name, '(' + record.projectId + ')');
        console.log('   Should be in:', targetProject);
      }
    } else {
      console.log('⚠️  MISSING - ID', id.substring(0, 8) + '...');
      console.log('   Not in database at all');
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkConflicts();