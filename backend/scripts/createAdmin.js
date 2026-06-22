const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@cryptobank.com';
  const password = 'Admin@CryptoBank2026';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      fullName: 'System Administrator',
      email,
      phone: '+94000000000',
      passwordHash,
      role: 'ADMIN',
      kycStatus: 'VERIFIED',
    },
  });

  console.log('Admin created successfully:', admin.email);
  console.log('Password:', password);
  process.exit(0);
}

createAdmin().catch(console.error);
