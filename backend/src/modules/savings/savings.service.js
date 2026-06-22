const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INTEREST_RATES = {
  FLEXIBLE: 10.0,
  FIXED_6M: 500.0,
  FIXED_1Y: 1000.0,
};

const EARLY_WITHDRAWAL_RATE = 8.0;
const ALLOWED_SAVINGS_CURRENCIES = ['ETH', 'BTC', 'SOL'];

const MATURITY_MONTHS = {
  FLEXIBLE: null,
  FIXED_6M: 6,
  FIXED_1Y: 12,
};

const REFERRAL_BONUS_RATES = {
  FLEXIBLE: 0.03,
  FIXED_6M: 0.10,
  FIXED_1Y: 0.10,
};

const openSavingsAccount = async (userId, { currency, amount, accountType }) => {
  if (!['FLEXIBLE', 'FIXED_6M', 'FIXED_1Y'].includes(accountType)) {
    throw new Error('Invalid account type');
  }
  if (!ALLOWED_SAVINGS_CURRENCIES.includes(currency)) {
    throw new Error('Savings accounts only accept ETH, BTC, or SOL. USDT and BNB are not eligible.');
  }
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const wallet = await prisma.wallet.findFirst({
    where: { userId, currency, isActive: true }
  });
  if (!wallet || parseFloat(wallet.balance) < parseFloat(amount)) {
    throw new Error('Wallet Insufficient balance');
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } });

  const maturityMonths = MATURITY_MONTHS[accountType];
  const maturityDate = maturityMonths
    ? new Date(Date.now() + maturityMonths * 30 * 24 * 60 * 60 * 1000)
    : null;

  const depositAmount = parseFloat(amount);

  const txOps = [
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: depositAmount } }
    }),
    prisma.savingsAccount.create({
      data: {
        userId,
        currency,
        principal: depositAmount,
        interestRate: INTEREST_RATES[accountType],
        accountType,
        maturityDate,
      }
    }),
    prisma.auditLog.create({
      data: {
        userId,
        action: 'SAVINGS_OPENED',
        details: `${accountType} savings account opened: ${amount} ${currency}`
      }
    }),
  ];

  // Referral bonus — funded by system, never deducted from the referee
  if (user.referredById) {
    const bonusRate = REFERRAL_BONUS_RATES[accountType];
    const bonus = depositAmount * bonusRate;
    const referrerWallet = await prisma.wallet.findFirst({
      where: { userId: user.referredById, currency, isActive: true }
    });
    const sourceType = accountType === 'FLEXIBLE' ? 'SAVINGS_OPEN_FLEXIBLE' : 'SAVINGS_OPEN_FIXED';

    if (referrerWallet) {
      txOps.push(
        prisma.wallet.update({
          where: { id: referrerWallet.id },
          data: { balance: { increment: bonus } }
        })
      );
    }
    // savingsId filled after creation — handled via a post-transaction update below
    txOps.push(
      prisma.referralReward.create({
        data: {
          referrerId: user.referredById,
          refereeId: userId,
          sourceType,
          currency,
          amount: bonus,
        }
      })
    );
    txOps.push(
      prisma.auditLog.create({
        data: {
          userId: user.referredById,
          action: 'REFERRAL_BONUS',
          details: `Referral bonus ${bonus.toFixed(8)} ${currency} credited for ${sourceType} by user ${userId}`
        }
      })
    );
  }

  const results = await prisma.$transaction(txOps);
  const savings = results[1]; // savingsAccount.create is index 1

  // Back-fill savingsId on the reward row if we created one
  if (user.referredById) {
    const rewardIdx = 3 + (user.referredById ? 1 : 0); // wallet credit (optional) shifts index — find by query instead
    await prisma.referralReward.updateMany({
      where: { refereeId: userId, savingsId: null, sourceType: { in: ['SAVINGS_OPEN_FLEXIBLE', 'SAVINGS_OPEN_FIXED'] } },
      data: { savingsId: savings.id }
    });
  }

  return savings;
};

const getSavingsAccounts = async (userId) => {
  const accounts = await prisma.savingsAccount.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  return accounts.map(acc => {
    const days = (Date.now() - new Date(acc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const interest = parseFloat(acc.principal) * (parseFloat(acc.interestRate) / 100) * (days / 365);
    return {
      ...acc,
      accruedInterest: interest.toFixed(8),
      totalValue: (parseFloat(acc.principal) + interest).toFixed(8)
    };
  });
};

const closeSavingsAccount = async (userId, accountId) => {
  const account = await prisma.savingsAccount.findFirst({
    where: { id: parseInt(accountId), userId, isActive: true }
  });
  if (!account) throw new Error('Account not found');

  const now = new Date();
  const days = (now.getTime() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  let annualRate;
  if (account.accountType === 'FLEXIBLE') {
    annualRate = parseFloat(account.interestRate); // 10%
  } else if (account.maturityDate && now >= account.maturityDate) {
    annualRate = parseFloat(account.interestRate); // contracted rate (500% / 1000%)
  } else {
    annualRate = EARLY_WITHDRAWAL_RATE; // 8% early-exit penalty
  }

  const interest = parseFloat(account.principal) * (annualRate / 100) * (days / 365);
  const totalReturn = parseFloat(account.principal) + interest;

  await prisma.$transaction([
    prisma.savingsAccount.update({
      where: { id: account.id },
      data: { isActive: false }
    }),
    prisma.wallet.updateMany({
      where: { userId, currency: account.currency, isActive: true },
      data: { balance: { increment: totalReturn } }
    })
  ]);

  return { totalReturn: totalReturn.toFixed(8), interest: interest.toFixed(8) };
};

module.exports = { openSavingsAccount, getSavingsAccounts, closeSavingsAccount };
