const { PrismaClient } = require('@prisma/client');
const { approveResetRequest, rejectResetRequest } = require('../auth/auth.service');
const { getRates } = require('../exchange/exchange.service');
const prisma = new PrismaClient();

const CURRENCIES = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL'];

const getDashboardStats = async () => {
  const [totalUsers, activeUsers, pendingKYC, totalTransfers, totalLoans, activeSavings] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { kycStatus: 'PENDING' } }),
    prisma.transfer.count(),
    prisma.loan.count({ where: { status: 'ACTIVE' } }),
    prisma.savingsAccount.count({ where: { isActive: true } }),
  ]);

  const transferVolume = await prisma.transfer.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } });
  const loanVolume = await prisma.loan.aggregate({ _sum: { loanAmountUSDT: true } });

  return {
    users: { total: totalUsers, active: activeUsers, pendingKYC },
    transactions: { totalTransfers, transferVolume: transferVolume._sum.amount || 0 },
    loans: { activeLoans: totalLoans, totalLoanVolume: loanVolume._sum.loanAmountUSDT || 0 },
    savings: { activeSavingsAccounts: activeSavings },
  };
};

const getAllUsers = async ({ page = 1, limit = 20, search = '', kycStatus = '' }) => {
  const skip = (page - 1) * limit;
  const where = {
    ...(search && {
      OR: [
        { fullName: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ],
    }),
    ...(kycStatus && { kycStatus }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, firstName: true, lastName: true,
        email: true, phone: true, country: true,
        kycStatus: true, role: true, isActive: true, createdAt: true,
        _count: { select: { wallets: true, loans: true, savingsAccounts: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, totalPages: Math.ceil(total / limit) };
};

const updateUserKYC = async (userId, kycStatus) => {
  if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(kycStatus)) throw new Error('Invalid KYC status');
  return await prisma.user.update({ where: { id: parseInt(userId) }, data: { kycStatus } });
};

const toggleUserStatus = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
  if (!user) throw new Error('User not found');
  return await prisma.user.update({ where: { id: parseInt(userId) }, data: { isActive: !user.isActive } });
};

const getAllTransactions = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [transfers, total] = await Promise.all([
    prisma.transfer.findMany({
      include: {
        sender: { select: { fullName: true, firstName: true, lastName: true, email: true } },
        receiver: { select: { fullName: true, firstName: true, lastName: true, email: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transfer.count(),
  ]);
  return { transfers, total, page, totalPages: Math.ceil(total / limit) };
};

const getAuditLogs = async ({ page = 1, limit = 50 }) => {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { fullName: true, firstName: true, lastName: true, email: true } } },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count(),
  ]);
  return { logs, total, page, totalPages: Math.ceil(total / limit) };
};

// ── KYC Review ────────────────────────────────────────────────

const listKycSubmissions = async ({ status = 'PENDING' }) => {
  return await prisma.kycSubmission.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true } } },
    orderBy: { submittedAt: 'desc' },
  });
};

const approveKyc = async (userId, adminId) => {
  const submission = await prisma.kycSubmission.findUnique({ where: { userId: parseInt(userId) } });
  if (!submission) throw new Error('KYC submission not found');

  await prisma.kycSubmission.update({
    where: { userId: parseInt(userId) },
    data: { status: 'VERIFIED', reviewedAt: new Date(), reviewedBy: adminId },
  });

  await prisma.user.update({ where: { id: parseInt(userId) }, data: { kycStatus: 'VERIFIED' } });

  await prisma.auditLog.create({
    data: { userId: adminId, action: 'KYC_APPROVED', details: `KYC approved for user ${userId}` },
  });
};

const rejectKyc = async (userId, adminId, rejectionReason) => {
  const submission = await prisma.kycSubmission.findUnique({ where: { userId: parseInt(userId) } });
  if (!submission) throw new Error('KYC submission not found');

  await prisma.kycSubmission.update({
    where: { userId: parseInt(userId) },
    data: { status: 'REJECTED', rejectionReason: rejectionReason || 'Rejected by admin', reviewedAt: new Date(), reviewedBy: adminId },
  });

  await prisma.user.update({ where: { id: parseInt(userId) }, data: { kycStatus: 'REJECTED' } });

  await prisma.auditLog.create({
    data: { userId: adminId, action: 'KYC_REJECTED', details: `KYC rejected for user ${userId}: ${rejectionReason}` },
  });
};

const getKycFilePath = async (userId, which) => {
  const submission = await prisma.kycSubmission.findUnique({ where: { userId: parseInt(userId) } });
  if (!submission) throw new Error('Submission not found');

  const map = {
    doc1: submission.docImage1Path,
    doc2: submission.docImage2Path,
    face: submission.facePhotoPath,
    signature: submission.signaturePath,
  };

  if (!map[which]) throw new Error('Invalid file key. Use: doc1, doc2, face, signature');
  return map[which];
};

// ── Reset Requests ────────────────────────────────────────────

const listResetRequests = async ({ status = 'PENDING' }) => {
  return await prisma.passwordResetRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
  });
};

const getResetDocPath = async (requestId) => {
  const req = await prisma.passwordResetRequest.findUnique({ where: { id: parseInt(requestId) } });
  if (!req) throw new Error('Request not found');
  return req.documentPath;
};

// ── Fee Wallet ────────────────────────────────────────────────

const getFeeWallet = async () => {
  const collectorEmail = process.env.FEE_COLLECTOR_EMAIL || 'admin@cryptobank.com';
  const collector = await prisma.user.findUnique({ where: { email: collectorEmail } });
  if (!collector) throw new Error('Fee collector account not found');

  const usd = await getRates();

  const wallets = await Promise.all(CURRENCIES.map(async (currency) => {
    const wallet = await prisma.wallet.findUnique({
      where: { address: `fee_${collector.id}_${currency}` }
    });
    const balance = wallet ? parseFloat(wallet.balance.toString()) : 0;
    const usdValue = parseFloat((balance * (usd[currency] || 0)).toFixed(2));
    return { currency, balance: balance.toFixed(8), usdValue };
  }));

  const totalUSD = parseFloat(wallets.reduce((s, w) => s + w.usdValue, 0).toFixed(2));

  return { wallets, totalUSD, collectorEmail };
};

// ── Deposit Requests (TRC-20 USDT) ───────────────────────────

const USER_SELECT = { select: { id: true, email: true, fullName: true, firstName: true, lastName: true } };

const getDepositRequests = async ({ status = '' } = {}) => {
  return await prisma.depositRequest.findMany({
    where: status ? { status } : undefined,
    include: { user: USER_SELECT },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
};

const approveDepositRequest = async (id, adminId) => {
  const request = await prisma.depositRequest.findUnique({ where: { id: parseInt(id) } });
  if (!request) throw new Error('Deposit request not found');

  const wallet = await prisma.wallet.findFirst({
    where: { userId: request.userId, currency: 'USDT', isActive: true }
  });
  if (!wallet) throw new Error('User USDT wallet not found');

  await prisma.$transaction(async (tx) => {
    const req = await tx.depositRequest.findUnique({ where: { id: parseInt(id) } });
    if (req.status !== 'PENDING') throw new Error('Request is no longer PENDING — already processed');

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: req.amount } }
    });
    await tx.depositRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() }
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'DEPOSIT_APPROVED',
        details: `${req.amount} USDT credited to user ${req.userId} (txid: ${req.txid})`
      }
    });
  });
};

const rejectDepositRequest = async (id, adminId, adminNote) => {
  await prisma.$transaction(async (tx) => {
    const req = await tx.depositRequest.findUnique({ where: { id: parseInt(id) } });
    if (!req) throw new Error('Deposit request not found');
    if (req.status !== 'PENDING') throw new Error('Request is no longer PENDING — already processed');

    await tx.depositRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'REJECTED', adminNote: adminNote || 'Rejected by admin', reviewedBy: adminId, reviewedAt: new Date() }
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'DEPOSIT_REJECTED',
        details: `Deposit request ${id} rejected for user ${req.userId}: ${adminNote || ''}`
      }
    });
  });
};

// ── Withdraw Requests (TRC-20 USDT) ──────────────────────────

const getWithdrawRequests = async ({ status = '' } = {}) => {
  return await prisma.withdrawRequest.findMany({
    where: status ? { status } : undefined,
    include: { user: USER_SELECT },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
};

const approveWithdrawRequest = async (id, adminId, txid) => {
  const tid = (txid || '').trim();
  if (!tid) throw new Error('Transaction hash (txid) is required');

  await prisma.$transaction(async (tx) => {
    const req = await tx.withdrawRequest.findUnique({ where: { id: parseInt(id) } });
    if (!req) throw new Error('Withdraw request not found');
    if (req.status !== 'PENDING') throw new Error('Request is no longer PENDING — already processed');

    await tx.withdrawRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'COMPLETED', txid: tid, reviewedBy: adminId, reviewedAt: new Date() }
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'WITHDRAW_COMPLETED',
        details: `${req.amount} USDT withdrawal completed for user ${req.userId} (txid: ${tid})`
      }
    });
  });
};

const rejectWithdrawRequest = async (id, adminId, adminNote) => {
  const request = await prisma.withdrawRequest.findUnique({ where: { id: parseInt(id) } });
  if (!request) throw new Error('Withdraw request not found');

  const wallet = await prisma.wallet.findFirst({
    where: { userId: request.userId, currency: 'USDT', isActive: true }
  });
  if (!wallet) throw new Error('User USDT wallet not found');

  // Resolve fee wallet to reverse the fee credit
  const collectorEmail = process.env.FEE_COLLECTOR_EMAIL || 'admin@cryptobank.com';
  const collector = await prisma.user.findUnique({ where: { email: collectorEmail } });
  const feeWallet = collector
    ? await prisma.wallet.findUnique({ where: { address: `fee_${collector.id}_USDT` } })
    : null;

  await prisma.$transaction(async (tx) => {
    const req = await tx.withdrawRequest.findUnique({ where: { id: parseInt(id) } });
    if (req.status !== 'PENDING') throw new Error('Request is no longer PENDING — already processed');

    const fee = parseFloat(req.fee.toString());
    const totalRefund = parseFloat(req.amount.toString()) + fee;

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: totalRefund } }
    });
    if (feeWallet && fee > 0) {
      await tx.wallet.update({
        where: { id: feeWallet.id },
        data: { balance: { decrement: fee } }
      });
    }
    await tx.withdrawRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'REJECTED', adminNote: adminNote || 'Rejected by admin', reviewedBy: adminId, reviewedAt: new Date() }
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'WITHDRAW_REJECTED',
        details: `${req.amount} USDT withdrawal rejected for user ${req.userId} — refunded ${totalRefund.toFixed(8)} USDT`
      }
    });
  });
};

// ── Referral Commissions ──────────────────────────────────────

const COMMISSION_RATE = 0.25; // 25% of monthly interest
const MIN_REFERRALS_FOR_COMMISSION = 10; // must have MORE than 10

const processReferralCommissions = async () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Find all eligible referrers (referred more than 10 distinct users)
  const eligibleReferrers = await prisma.user.findMany({
    where: {
      referrals: { some: {} },
    },
    select: {
      id: true,
      lastCommissionRunAt: true,
      _count: { select: { referrals: true } },
    },
  });

  const results = { processed: 0, skipped: 0, payouts: [] };

  for (const referrer of eligibleReferrers) {
    if (referrer._count.referrals <= MIN_REFERRALS_FOR_COMMISSION) {
      results.skipped++;
      continue;
    }

    // Idempotency: skip if already ran this calendar month
    if (referrer.lastCommissionRunAt) {
      const lastRun = new Date(referrer.lastCommissionRunAt);
      if (lastRun.getFullYear() === currentYear && lastRun.getMonth() === currentMonth) {
        results.skipped++;
        continue;
      }
    }

    // Get all active savings accounts belonging to their referred users
    const referredUserIds = await prisma.user
      .findMany({ where: { referredById: referrer.id }, select: { id: true } })
      .then(rows => rows.map(r => r.id));

    const activeSavings = await prisma.savingsAccount.findMany({
      where: { userId: { in: referredUserIds }, isActive: true },
    });

    // Group by currency, compute 30-day interest, take 25%
    const byCurrency = {};
    for (const acc of activeSavings) {
      const principal = parseFloat(acc.principal);
      const rate = parseFloat(acc.interestRate) / 100;
      const monthlyInterest = principal * rate * (30 / 365);
      const commission = monthlyInterest * COMMISSION_RATE;
      if (!byCurrency[acc.currency]) byCurrency[acc.currency] = 0;
      byCurrency[acc.currency] += commission;
    }

    const txOps = [
      prisma.user.update({
        where: { id: referrer.id },
        data: { lastCommissionRunAt: now },
      }),
    ];

    for (const [currency, commission] of Object.entries(byCurrency)) {
      if (commission <= 0) continue;
      const referrerWallet = await prisma.wallet.findFirst({
        where: { userId: referrer.id, currency, isActive: true },
      });
      if (referrerWallet) {
        txOps.push(
          prisma.wallet.update({
            where: { id: referrerWallet.id },
            data: { balance: { increment: commission } },
          })
        );
      }
      txOps.push(
        prisma.referralReward.create({
          data: {
            referrerId: referrer.id,
            refereeId: referrer.id, // self-referencing: commission, no single referee
            sourceType: 'INTEREST_COMMISSION',
            currency,
            amount: commission,
          },
        })
      );
      txOps.push(
        prisma.auditLog.create({
          data: {
            userId: referrer.id,
            action: 'REFERRAL_BONUS',
            details: `Monthly interest commission ${commission.toFixed(8)} ${currency} (25% of referred-accounts interest)`,
          },
        })
      );
      results.payouts.push({ referrerId: referrer.id, currency, amount: commission.toFixed(8) });
    }

    await prisma.$transaction(txOps);
    results.processed++;
  }

  return results;
};

const getReferralStats = async () => {
  const rewards = await prisma.referralReward.findMany({
    orderBy: { createdAt: 'desc' },
    include: { referrer: { select: { id: true, fullName: true, email: true } } },
  });
  return rewards;
};

module.exports = {
  getDashboardStats, getAllUsers, updateUserKYC, toggleUserStatus,
  getAllTransactions, getAuditLogs,
  listKycSubmissions, approveKyc, rejectKyc, getKycFilePath,
  listResetRequests, getResetDocPath,
  approveResetRequest, rejectResetRequest,
  getFeeWallet,
  getDepositRequests, approveDepositRequest, rejectDepositRequest,
  getWithdrawRequests, approveWithdrawRequest, rejectWithdrawRequest,
  processReferralCommissions, getReferralStats,
};
