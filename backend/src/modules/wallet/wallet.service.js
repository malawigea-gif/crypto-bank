const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { getFeeCollectorWallet } = require('../fees/fees.service');
const prisma = new PrismaClient();

const SUPPORTED_CURRENCIES = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL'];
const WITHDRAW_FEE_PERCENT = 0.03;

const generateWalletAddress = (currency) => {
  const prefix = { BTC: '1', ETH: '0x', USDT: '0x', BNB: '0x', SOL: '' };
  const rand = crypto.randomBytes(20).toString('hex');
  return `${prefix[currency] || ''}${rand}`;
};

const getOrCreateWallet = async (userId, currency) => {
  let wallet = await prisma.wallet.findFirst({
    where: { userId, currency, isActive: true }
  });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId, currency, balance: 0, address: generateWalletAddress(currency) }
    });
  }
  return wallet;
};

const getAllWallets = async (userId) => {
  return await Promise.all(SUPPORTED_CURRENCIES.map(c => getOrCreateWallet(userId, c)));
};

const getWalletBalance = async (userId, currency) => {
  return await getOrCreateWallet(userId, currency);
};

const deposit = async (userId, currency, amount) => {
  if (currency !== 'USDT') {
    throw new Error('Direct deposit is available for USDT only. Other currencies are for internal use.');
  }
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const wallet = await getOrCreateWallet(userId, currency);
  const updated = await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: parseFloat(amount) } }
  });
  await prisma.auditLog.create({
    data: { userId, action: 'DEPOSIT', details: `${amount} ${currency} deposited` }
  });
  return updated;
};

const withdraw = async (userId, currency, amount) => {
  if (currency !== 'USDT') {
    throw new Error('Direct withdrawal is available for USDT only. Other currencies are for internal use.');
  }
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const wallet = await getOrCreateWallet(userId, currency);
  if (parseFloat(wallet.balance) < parseFloat(amount)) throw new Error('Insufficient balance');

  const fee = parseFloat(amount) * WITHDRAW_FEE_PERCENT;
  const netAmount = parseFloat(amount) - fee;
  const { walletId: feeWalletId } = await getFeeCollectorWallet(currency);

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: parseFloat(amount) } } });
    await tx.wallet.update({ where: { id: feeWalletId }, data: { balance: { increment: fee } } });
    await tx.auditLog.create({
      data: { userId, action: 'FEE_COLLECTED', details: `${fee.toFixed(8)} ${currency} fee from WITHDRAW` }
    });
    await tx.auditLog.create({
      data: { userId, action: 'WITHDRAW', details: `${amount} ${currency} withdrawn (fee: ${fee.toFixed(8)}, net: ${netAmount.toFixed(8)})` }
    });
  });

  return { amount: parseFloat(amount), fee, netAmount };
};

// ── TRC-20 USDT Deposit Flow ──────────────────────────────────

const getDepositAddress = () => {
  const address = process.env.USDT_TRC20_DEPOSIT_ADDRESS || 'REPLACE_WITH_YOUR_TRC20_USDT_ADDRESS';
  return { currency: 'USDT', network: 'TRC-20', address };
};

const createDepositRequest = async (userId, { amount, txid }) => {
  if (!amount || parseFloat(amount) <= 0) throw new Error('Amount must be greater than zero');
  const tid = (txid || '').trim();
  if (!tid) throw new Error('Transaction hash (txid) is required');

  const existing = await prisma.depositRequest.findUnique({ where: { txid: tid } });
  if (existing) throw new Error('This transaction hash has already been submitted');

  const request = await prisma.depositRequest.create({
    data: { userId, amount: parseFloat(amount), txid: tid, status: 'PENDING' }
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'DEPOSIT_REQUESTED',
      details: `${amount} USDT deposit requested (txid: ${tid})`
    }
  });

  return request;
};

const getUserDepositRequests = async (userId) => {
  return await prisma.depositRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
};

// ── TRC-20 USDT Withdraw Flow ─────────────────────────────────

const isTronAddress = (addr) => typeof addr === 'string' && addr.startsWith('T') && addr.length >= 33 && addr.length <= 35;

const createWithdrawRequest = async (userId, { amount, toAddress }) => {
  if (!amount || parseFloat(amount) <= 0) throw new Error('Amount must be greater than zero');
  const addr = (toAddress || '').trim();
  if (!addr) throw new Error('Destination address is required');
  if (!isTronAddress(addr)) throw new Error('Invalid Tron address (must start with T, length ~34)');

  const fee = parseFloat((parseFloat(amount) * WITHDRAW_FEE_PERCENT).toFixed(8));
  const totalDeduct = parseFloat(amount) + fee;

  const wallet = await getOrCreateWallet(userId, 'USDT');
  if (parseFloat(wallet.balance) < totalDeduct) {
    throw new Error(`Insufficient USDT balance. Need ${totalDeduct.toFixed(8)} USDT (${parseFloat(amount).toFixed(8)} + ${fee.toFixed(8)} fee)`);
  }

  const { walletId: feeWalletId } = await getFeeCollectorWallet('USDT');

  return await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: totalDeduct } }
    });
    await tx.wallet.update({
      where: { id: feeWalletId },
      data: { balance: { increment: fee } }
    });
    const req = await tx.withdrawRequest.create({
      data: { userId, amount: parseFloat(amount), fee, toAddress: addr, status: 'PENDING' }
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: 'WITHDRAW_REQUESTED',
        details: `${amount} USDT withdraw requested to ${addr} (fee: ${fee.toFixed(8)}, reserved: ${totalDeduct.toFixed(8)})`
      }
    });
    return req;
  });
};

const getUserWithdrawRequests = async (userId) => {
  return await prisma.withdrawRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
};

module.exports = {
  getAllWallets, getWalletBalance, deposit, withdraw,
  getDepositAddress, createDepositRequest, getUserDepositRequests,
  createWithdrawRequest, getUserWithdrawRequests,
};
