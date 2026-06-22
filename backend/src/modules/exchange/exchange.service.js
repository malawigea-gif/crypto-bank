const { PrismaClient } = require('@prisma/client');
const { getFeeCollectorWallet } = require('../fees/fees.service');
const prisma = new PrismaClient();

const FALLBACK = { BTC: 65000, ETH: 3500, USDT: 1, BNB: 580, SOL: 150 };

let cachedRates = null;
let cachedAt = 0;
const CACHE_MS = 15000;

const BINANCE_URL =
  'https://api.binance.com/api/v3/ticker/price?symbols=' +
  encodeURIComponent('["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"]');

const getRates = async () => {
  if (cachedRates && Date.now() - cachedAt < CACHE_MS) return cachedRates;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(BINANCE_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = await res.json();

    const usdMap = {};
    for (const { symbol, price } of data) {
      usdMap[symbol] = Number(price);
    }

    cachedRates = {
      BTC:  usdMap['BTCUSDT'],
      ETH:  usdMap['ETHUSDT'],
      BNB:  usdMap['BNBUSDT'],
      SOL:  usdMap['SOLUSDT'],
      USDT: 1,
    };
    cachedAt = Date.now();
    return cachedRates;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[exchange] rate fetch failed:', err.message);
    return cachedRates ?? FALLBACK;
  }
};

const getExchangeRates = async () => {
  const usd = await getRates();
  const currencies = Object.keys(usd);
  const rates = {};
  currencies.forEach(from => {
    rates[from] = {};
    currencies.forEach(to => {
      if (from !== to) rates[from][to] = usd[from] / usd[to];
    });
  });
  return rates;
};

const EXCHANGE_FEE = 0.002;

const exchangeCrypto = async (userId, { fromCurrency, toCurrency, fromAmount }) => {
  if (fromCurrency === toCurrency) throw new Error('Cannot exchange same currency');

  const fromWallet = await prisma.wallet.findFirst({
    where: { userId, currency: fromCurrency, isActive: true }
  });
  if (!fromWallet || parseFloat(fromWallet.balance) < parseFloat(fromAmount)) {
    throw new Error(`${fromCurrency} Insufficient balance`);
  }

  const usd = await getRates();
  const rate = usd[fromCurrency] / usd[toCurrency];
  const fee = parseFloat(fromAmount) * EXCHANGE_FEE;
  const toAmount = (parseFloat(fromAmount) - fee) * rate;

  let toWallet = await prisma.wallet.findFirst({
    where: { userId, currency: toCurrency, isActive: true }
  });
  if (!toWallet) {
    const crypto = require('crypto');
    toWallet = await prisma.wallet.create({
      data: {
        userId,
        currency: toCurrency,
        balance: 0,
        address: `0x${crypto.randomBytes(20).toString('hex')}`
      }
    });
  }

  const { walletId: feeWalletId } = await getFeeCollectorWallet(fromCurrency);

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: { balance: { decrement: parseFloat(fromAmount) } }
    });
    await tx.wallet.update({
      where: { id: toWallet.id },
      data: { balance: { increment: toAmount } }
    });
    await tx.wallet.update({
      where: { id: feeWalletId },
      data: { balance: { increment: fee } }
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: 'FEE_COLLECTED',
        details: `${fee.toFixed(8)} ${fromCurrency} fee from EXCHANGE`
      }
    });
  });

  return {
    fromCurrency, toCurrency,
    fromAmount: parseFloat(fromAmount),
    toAmount: toAmount.toFixed(8),
    rate: rate.toFixed(8),
    fee: fee.toFixed(8)
  };
};

module.exports = { getExchangeRates, exchangeCrypto, getRates };
