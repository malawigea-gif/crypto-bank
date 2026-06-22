const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FEE_COLLECTOR_EMAIL = process.env.FEE_COLLECTOR_EMAIL || 'admin@cryptobank.com';

/**
 * Returns the fee-collector wallet ID for a given currency.
 * Creates the wallet with a deterministic address if it doesn't exist yet.
 * Call this BEFORE starting a prisma.$transaction — then use the returned
 * walletId inside the transaction with the tx client.
 */
const getFeeCollectorWallet = async (currency) => {
  const collector = await prisma.user.findUnique({ where: { email: FEE_COLLECTOR_EMAIL } });
  if (!collector) {
    console.error(`[fees] Collector account '${FEE_COLLECTOR_EMAIL}' not found`);
    throw new Error('Fee collector account not configured — cannot process fee');
  }

  // Deterministic address makes upsert safe under concurrent calls
  const address = `fee_${collector.id}_${currency}`;
  const wallet = await prisma.wallet.upsert({
    where: { address },
    create: { userId: collector.id, currency, balance: 0, address },
    update: {}
  });

  return { walletId: wallet.id, collectorId: collector.id };
};

module.exports = { getFeeCollectorWallet, FEE_COLLECTOR_EMAIL };
