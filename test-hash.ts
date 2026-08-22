import 'dotenv/config';
import { compare } from 'bcryptjs';
import { createPrismaClient } from './src/server/db';

const prisma = createPrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  console.log('User:', user.email);
  console.log('Hash:', user.passwordHash);

  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin';
  const isValid = await compare(password, user.passwordHash);
  console.log(`Is valid for "${password}":`, isValid);
}

main().catch(console.error).finally(() => prisma.$disconnect());
