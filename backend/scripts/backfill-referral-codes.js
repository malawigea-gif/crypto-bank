'use strict';
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function generateCode() {
  return crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars → trim to 8
}

async function uniqueCode() {
  while (true) {
    const code = generateCode().slice(0, 8);
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
}

async function main() {
  const users = await prisma.user.findMany({ where: { referralCode: null } });
  console.log(`Backfilling ${users.length} users...`);
  for (const u of users) {
    const code = await uniqueCode();
    await prisma.user.update({ where: { id: u.id }, data: { referralCode: code } });
    console.log(`  User ${u.id} → ${code}`);
  }
  console.log('Done.');
}

main().finally(() => prisma.$disconnect());
