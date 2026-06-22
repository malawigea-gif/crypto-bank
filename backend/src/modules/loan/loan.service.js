const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LOAN_INTEREST_RATE = 12.0;
const MIN_COLLATERAL_USDT = 200;
const MIN_ACCOUNT_AGE_MONTHS = 6;
const LTV_RATIO = 0.6;

const applyLoan = async (userId, { collateralCurrency, collateralAmount, loanAmountUSDT }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const accountAgeMonths = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (accountAgeMonths < MIN_ACCOUNT_AGE_MONTHS) {
    throw new Error(`Account must be at least ${MIN_ACCOUNT_AGE_MONTHS} months old (currently: ${accountAgeMonths.toFixed(1)} months)`);
  }

  const collateralWallet = await prisma.wallet.findFirst({
    where: { userId, currency: collateralCurrency, isActive: true }
  });
  if (!collateralWallet || parseFloat(collateralWallet.balance) < parseFloat(collateralAmount)) {
    throw new Error('Insufficient collateral balance');
  }

  const usdtWallet = await prisma.wallet.findFirst({
    where: { userId, currency: 'USDT', isActive: true }
  });
  if (!usdtWallet) throw new Error('USDT wallet not found');

  if (parseFloat(collateralAmount) < MIN_COLLATERAL_USDT / 100) {
    throw new Error(`Minimum collateral required: ${MIN_COLLATERAL_USDT} USDT`);
  }

  const maxLoan = parseFloat(collateralAmount) * LTV_RATIO;
  if (parseFloat(loanAmountUSDT) > maxLoan) {
    throw new Error(`Maximum loan amount: ${maxLoan.toFixed(2)} USDT`);
  }

  const dueDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const [loan] = await prisma.$transaction([
    prisma.loan.create({
      data: {
        userId,
        collateralCurrency,
        collateralAmount: parseFloat(collateralAmount),
        loanAmountUSDT: parseFloat(loanAmountUSDT),
        interestRate: LOAN_INTEREST_RATE,
        status: 'ACTIVE',
        dueDate
      }
    }),
    prisma.wallet.update({
      where: { id: collateralWallet.id },
      data: { balance: { decrement: parseFloat(collateralAmount) } }
    }),
    prisma.wallet.update({
      where: { id: usdtWallet.id },
      data: { balance: { increment: parseFloat(loanAmountUSDT) } }
    })
  ]);

  return loan;
};

const getLoans = async (userId) => {
  return await prisma.loan.findMany({
    where: { userId },
    include: { repayments: true },
    orderBy: { createdAt: 'desc' }
  });
};

const repayLoan = async (userId, loanId, amount) => {
  const loan = await prisma.loan.findFirst({
    where: { id: parseInt(loanId), userId, status: 'ACTIVE' }
  });
  if (!loan) throw new Error('Active loan not found');

  const usdtWallet = await prisma.wallet.findFirst({
    where: { userId, currency: 'USDT', isActive: true }
  });
  if (!usdtWallet || parseFloat(usdtWallet.balance) < parseFloat(amount)) {
    throw new Error('Insufficient USDT balance');
  }

  const days = (Date.now() - new Date(loan.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const totalDue = parseFloat(loan.loanAmountUSDT) * (1 + (parseFloat(loan.interestRate) / 100) * (days / 365));

  await prisma.$transaction([
    prisma.repayment.create({
      data: { loanId: loan.id, amount: parseFloat(amount) }
    }),
    prisma.wallet.update({
      where: { id: usdtWallet.id },
      data: { balance: { decrement: parseFloat(amount) } }
    }),
    ...(parseFloat(amount) >= totalDue ? [
      prisma.loan.update({
        where: { id: loan.id },
        data: { status: 'REPAID' }
      }),
      prisma.wallet.updateMany({
        where: { userId, currency: loan.collateralCurrency, isActive: true },
        data: { balance: { increment: parseFloat(loan.collateralAmount) } }
      })
    ] : [])
  ]);

  return { totalDue: totalDue.toFixed(2), repaid: amount };
};

module.exports = { applyLoan, getLoans, repayLoan };
