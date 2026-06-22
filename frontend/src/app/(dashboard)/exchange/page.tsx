'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const CURRENCIES = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL'];

export default function ExchangePage() {
  const [from, setFrom] = useState('BTC');
  const [to, setTo] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [preview, setPreview] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cross-rates matrix returned by GET /exchange/rates:
  // { BTC: { ETH: x, USDT: x, ... }, ETH: {...}, ... }
  const [rates, setRates] = useState<Record<string, Record<string, number>>>({});
  const [ratesLoading, setRatesLoading] = useState(true);

  // currency -> balance string (Decimal(20,8) from Prisma)
  const [wallets, setWallets] = useState<Record<string, string>>({});

  const fetchRates = useCallback(async () => {
    try {
      const res = await api.get('/exchange/rates');
      setRates(res.data.data);
    } catch {
      // keep previously loaded rates visible on refresh failure
    } finally {
      setRatesLoading(false);
    }
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      const res = await api.get('/wallet');
      const map: Record<string, string> = {};
      for (const w of res.data.data) map[w.currency] = w.balance;
      setWallets(map);
    } catch {
      // ignore — balance display degrades gracefully to 0
    }
  }, []);

  useEffect(() => {
    fetchRates();
    fetchWallets();
  }, [fetchRates, fetchWallets]);

  // Recalculate preview whenever the form inputs or live rates change
  useEffect(() => {
    if (amount && from !== to && rates[from]?.[to]) {
      const rate = rates[from][to];
      const fee = parseFloat(amount) * 0.002;
      setPreview((parseFloat(amount) - fee) * rate);
    } else {
      setPreview(null);
    }
  }, [from, to, amount, rates]);

  const handleFromChange = (newFrom: string) => {
    setFrom(newFrom);
    // if the new from-currency matches the current to-currency, pick a different to
    if (newFrom === to) {
      setTo(CURRENCIES.find(c => c !== newFrom) ?? 'USDT');
    }
    setAmount('');
  };

  const handleToChange = (newTo: string) => {
    setTo(newTo);
    if (newTo === from) {
      setFrom(CURRENCIES.find(c => c !== newTo) ?? 'BTC');
      setAmount('');
    }
  };

  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/exchange', {
        fromCurrency: from,
        toCurrency: to,
        fromAmount: parseFloat(amount),
      });
      setMessage(
        `✅ ${res.data.data.fromAmount} ${from} → ${parseFloat(res.data.data.toAmount).toFixed(6)} ${to}`
      );
      setAmount('');
      fetchWallets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Exchange failed');
    } finally {
      setLoading(false);
    }
  };

  const fromBalance = wallets[from] ?? '0';

  // USD price for the rate table.
  // rates[c]['USDT'] == usd[c] / usd['USDT'] == usd[c] / 1 == USD price of c.
  // USDT itself is always $1.
  const usdPrice = (c: string): number | null =>
    c === 'USDT' ? 1 : (rates[c]?.['USDT'] ?? null);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-8">🔄 Exchange</h2>

      <div className="max-w-md mx-auto">
        <div className="bg-slate-800 rounded-xl p-6">
          {message && (
            <div className="bg-green-500/20 text-green-300 rounded-lg p-3 mb-4 text-sm">{message}</div>
          )}
          {error && (
            <div className="bg-red-500/20 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleExchange} className="space-y-4">
            <div>
              {/* From label row: label left, available balance + Max right */}
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 text-sm">From</label>
                <span className="text-xs text-slate-400">
                  Available:{' '}
                  <span className="text-white font-medium">
                    {parseFloat(fromBalance).toFixed(8)} {from}
                  </span>
                  {parseFloat(fromBalance) > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(parseFloat(fromBalance).toFixed(8))}
                      className="ml-2 text-purple-400 hover:text-purple-300 underline"
                    >
                      Max
                    </button>
                  )}
                </span>
              </div>

              <div className="flex gap-2">
                <select
                  value={from}
                  onChange={e => handleFromChange(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white w-32"
                >
                  {CURRENCIES.filter(c => c !== to).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.00000001"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none"
                  placeholder="0.00000000"
                  required
                />
              </div>
            </div>

            <div className="text-center text-2xl text-slate-400">⇅</div>

            <div>
              <label className="text-slate-400 text-sm mb-1 block">To</label>
              <select
                value={to}
                onChange={e => handleToChange(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
              >
                {CURRENCIES.filter(c => c !== from).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {preview !== null && rates[from]?.[to] && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm">You will receive</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ≈ {preview.toFixed(8)} {to}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Rate: 1 {from} = {rates[from][to].toFixed(6)} {to}
                </p>
                <p className="text-slate-500 text-xs">Fee: 0.2%</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || from === to}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg"
            >
              {loading ? 'Exchanging...' : '🔄 Exchange'}
            </button>
          </form>

          {/* Live rate table */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-sm">Current Rates (USD)</h3>
              {!ratesLoading && (
                <span className="text-xs text-green-400/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Live · Binance
                </span>
              )}
            </div>

            {ratesLoading ? (
              <p className="text-slate-500 text-xs">Loading rates...</p>
            ) : (
              <div className="space-y-2">
                {CURRENCIES.map(c => {
                  const price = usdPrice(c);
                  return (
                    <div key={c} className="flex justify-between text-sm">
                      <span className="text-slate-300">{c}</span>
                      <span className="text-white font-medium">
                        {price !== null
                          ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
