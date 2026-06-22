const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = new PrismaClient();

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

async function generateUniqueReferralCode() {
  while (true) {
    const code = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
}

const register = async ({ firstName, lastName, country, phoneCountry, phone, email, password, promoCode }) => {
  if (!firstName || !lastName || !country || !phoneCountry || !phone || !email || !password) {
    throw new Error('All fields are required');
  }
  if (!PHONE_RE.test(phone)) throw new Error('Phone must be a valid E.164 number (e.g. +94771234567)');

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
  if (existing) throw new Error('Email or phone already registered');

  let referredById = null;
  if (promoCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: promoCode.trim().toUpperCase() } });
    if (!referrer) throw new Error('Invalid promotion code');
    referredById = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const fullName = `${firstName} ${lastName}`;
  const referralCode = await generateUniqueReferralCode();

  const user = await prisma.user.create({
    data: { fullName, firstName, lastName, country, phoneCountry, phone, email, passwordHash, referralCode, referredById },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'USER_REGISTERED', details: `${email} registered${referredById ? ` via promo code ${promoCode}` : ''}` },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role, kycStatus: user.kycStatus },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: { id: user.id, fullName: user.fullName, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, kycStatus: user.kycStatus },
  };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new Error('Account not found or deactivated');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid password');

  const token = jwt.sign(
    { userId: user.id, role: user.role, kycStatus: user.kycStatus },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: { id: user.id, fullName: user.fullName, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, kycStatus: user.kycStatus },
  };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Current password is incorrect');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { message: 'Password updated successfully' };
};

const forgotPassword = async ({ email, documentPath, note }) => {
  // Always respond generically — do not reveal if email exists
  await prisma.passwordResetRequest.create({
    data: { email, documentPath, note: note || null, status: 'PENDING' },
  });
};

const approveResetRequest = async (requestId, adminId) => {
  const req = await prisma.passwordResetRequest.findUnique({ where: { id: parseInt(requestId) } });
  if (!req) throw new Error('Request not found');
  if (req.status !== 'PENDING') throw new Error('Request is not in PENDING state');

  const token = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetRequest.update({
    where: { id: req.id },
    data: { status: 'APPROVED', resetToken: token, tokenExpires, reviewedBy: adminId, reviewedAt: new Date() },
  });

  return { resetToken: token, tokenExpires };
};

const rejectResetRequest = async (requestId, adminId) => {
  const req = await prisma.passwordResetRequest.findUnique({ where: { id: parseInt(requestId) } });
  if (!req) throw new Error('Request not found');
  if (req.status !== 'PENDING') throw new Error('Request is not in PENDING state');

  await prisma.passwordResetRequest.update({
    where: { id: req.id },
    data: { status: 'REJECTED', reviewedBy: adminId, reviewedAt: new Date() },
  });
};

const resetPassword = async ({ token, newPassword }) => {
  const req = await prisma.passwordResetRequest.findUnique({ where: { resetToken: token } });
  if (!req) throw new Error('Invalid or expired token');
  if (req.status !== 'APPROVED') throw new Error('Token is not approved');
  if (req.tokenExpires < new Date()) throw new Error('Token has expired');

  const user = await prisma.user.findUnique({ where: { email: req.email } });
  if (!user) throw new Error('Account not found');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.passwordResetRequest.update({ where: { id: req.id }, data: { status: 'USED' } });
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, fullName: true, email: true, role: true, kycStatus: true,
      referralCode: true,
      _count: { select: { referrals: true } },
    },
  });

  const rewards = await prisma.referralReward.groupBy({
    by: ['currency'],
    where: { referrerId: userId },
    _sum: { amount: true },
  });

  return {
    ...user,
    referralCount: user._count.referrals,
    rewardsByCurrency: rewards.map(r => ({
      currency: r.currency,
      total: parseFloat(r._sum.amount || 0).toFixed(8),
    })),
  };
};

module.exports = { register, login, changePassword, forgotPassword, approveResetRequest, rejectResetRequest, resetPassword, getProfile };
