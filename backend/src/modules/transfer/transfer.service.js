const { PrismaClient } = require('@prisma/client');
const { getFeeCollectorWallet } = require('../fees/fees.service');
const prisma = new PrismaClient();

const TRANSFER_FEE_PERCENT = 0.001; // 0.1%

const sendTransfer = async (senderId, { receiverEmail, currency, amount, note }) => {
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const receiver = await prisma.user.findUnique({ where: { email: receiverEmail } });
  if (!receiver) throw new Error('Receiver not found');
  if (receiver.id === senderId) throw new Error('Cannot transfer to yourself');

  const fee = parseFloat(amount) * TRANSFER_FEE_PERCENT;
  const totalDeduct = parseFloat(amount) + fee;

  const senderWallet = await prisma.wallet.findFirst({
    where: { userId: senderId, currency, isActive: true }
  });
  if (!senderWallet || parseFloat(senderWallet.balance) < totalDeduct) {
    throw new Error('Insufficient balance');
  }

  const { walletId: feeWalletId } = await getFeeCollectorWallet(currency);

  const transfer = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: senderWallet.id },
      data: { balance: { decrement: totalDeduct } }
    });
    await tx.wallet.upsert({
      where: { address: `recv_${receiver.id}_${currency}` },
      create: {
        userId: receiver.id,
        currency,
        balance: parseFloat(amount),
        address: `recv_${receiver.id}_${currency}`
      },
      update: { balance: { increment: parseFloat(amount) } }
    });
    await tx.wallet.update({
      where: { id: feeWalletId },
      data: { balance: { increment: fee } }
    });
    await tx.auditLog.create({
      data: {
        userId: senderId,
        action: 'FEE_COLLECTED',
        details: `${fee.toFixed(8)} ${currency} fee from TRANSFER`
      }
    });
    return await tx.transfer.create({
      data: {
        senderId,
        receiverId: receiver.id,
        currency,
        amount: parseFloat(amount),
        fee,
        status: 'COMPLETED',
        note
      }
    });
  });

  return transfer;
};

const getHistory = async (userId) => {
  return await prisma.transfer.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    include: {
      sender: { select: { fullName: true, email: true } },
      receiver: { select: { fullName: true, email: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
};

module.exports = { sendTransfer, getHistory };
