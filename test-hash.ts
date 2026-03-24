import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  console.log('User:', user.email);
  console.log('Hash:', user.passwordHash);
  
  const isValidAdmin = await compare('admin', user.passwordHash);
  console.log('Is valid for "admin":', isValidAdmin);
}

main().catch(console.error).finally(() => prisma.$disconnect());
