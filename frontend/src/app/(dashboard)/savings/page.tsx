'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const ACCOUNT_TYPES = [
  { value: 'FLEXIBLE', label: 'Flexible', rate: '10%', desc: 'Withdraw anytime', earlyNote: null, color: 'from-blue-500 to-cyan-500' },
  { value: 'FIXED_6M', label: 'Fixed 6 Months', rate: '500%', desc: 'Close anytime — early exit pays 8% p.a.', earlyNote: 'Early closure: 8% p.a.', color: 'from-purple-500 to-pink-500' },
  { value: 'FIXED_1Y', label: 'Fixed 1 Year', rate: '1000%', desc: 'Close anytime — early exit pays 8% p.a.', earlyNote: 'Early closure: 8% p.a.', color: 'from-orange-500 to-red-500' },
];

export default function SavingsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [form, setForm] = useState({ currency: 'ETH', amount: '', accountType: 'FLEXIBLE' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAccounts = () => {
    api.get('/savings').then(res => setAccounts(res.data.data));
  };

  const fetchWallets = () => {
    api.get('/wallet').then(res => setWallets(res.data.data));
  };

  useEffect(() => {
    fetchAccounts();
    fetchWallets();
  }, []);

  const selectedWallet = wallets.find(w => w.currency === form.currency);
  const available = selectedWallet ? parseFloat(selectedWallet.balance) : 0;
  const enteredAmount = parseFloat(form.amount);
  const insufficient = form.amount !== '' && !isNaN(enteredAmount) && enteredAmount > available;

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (insufficient) return;
    setLoading(true);
    setMessage(''); setError('');
    try {
      const res = await api.post('/savings', { ...form, amount: enteredAmount });
      setMessage(res.data.message);
      setForm({ currency: 'ETH', amount: '', accountType: 'FLEXIBLE' });
      fetchAccounts();
      fetchWallets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: number) => {
    if (!confirm('Are you sure you want to close this account?')) return;
    try {
      const res = await api.delete(`/savings/${id}`);
      setMessage(res.data.message);
      fetchAccounts();
      fetchWallets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-8">🏦 Savings</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {ACCOUNT_TYPES.map(type => (
          <div
            key={type.value}
            onClick={() => setForm({ ...form, accountType: type.value })}
            className={`bg-gradient-to-br ${type.color} rounded-xl p-5 cursor-pointer border-2 transition-all ${
              form.accountType === type.value ? 'border-white scale-105' : 'border-transparent'
            }`}
          >
            <p className="text-white/80 text-sm">{type.label}</p>
            <p className="text-4xl font-bold text-white mt-1">{type.rate}</p>
            <p className="text-white/70 text-xs mt-2">Annual Interest (at maturity)</p>
            <p className="text-white/60 text-xs mt-1">{type.desc}</p>
            {type.earlyNote && (
              <p className="text-yellow-300/80 text-xs mt-2 font-medium">⚠ {type.earlyNote}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Open New Savings Account</h3>

          {message && <div className="bg-green-500/20 text-green-300 rounded-lg p-3 mb-4 text-sm">{message}</div>}
          {error && <div className="bg-red-500/20 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}

          <form onSubmit={handleOpen} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value, amount: '' })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                >
                  {['ETH', 'BTC', 'SOL'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-0.5 block">Amount</label>
                <p className="text-slate-400 text-xs mb-1">
                  Available: <span className="text-slate-300">{available.toFixed(8)} {form.currency}</span>
                  {available > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, amount: available.toFixed(8) })}
                      className="ml-1.5 text-purple-400 hover:text-purple-300 underline"
                    >
                      Max
                    </button>
                  )}
                </p>
                <input
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className={`w-full bg-slate-700 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                    insufficient ? 'border-red-500' : 'border-slate-600'
                  }`}
                  placeholder="0.00000000"
                  required
                />
                {insufficient && (
                  <p className="text-red-400 text-xs mt-1">Insufficient balance</p>
                )}
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-3 text-sm">
              <p className="text-slate-300">Account Type: <span className="text-purple-400 font-medium">{form.accountType}</span></p>
              <p className="text-slate-300">Interest Rate: <span className="text-green-400 font-medium">
                {ACCOUNT_TYPES.find(t => t.value === form.accountType)?.rate} p.a.
              </span></p>
            </div>

            <button
              type="submit"
              disabled={loading || insufficient}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg"
            >
              {loading ? 'Opening...' : '🏦 Open Savings Account'}
            </button>
          </form>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Active Accounts</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {accounts.length === 0 ? (
              <p className="text-slate-500 text-sm">No active savings accounts</p>
            ) : accounts.map((acc: any) => (
              <div key={acc.id} className="bg-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-white font-medium">{acc.accountType}</span>
                    <span className="text-slate-400 text-sm ml-2">({acc.currency})</span>
                  </div>
                  <span className="text-green-400 text-sm">{acc.interestRate}% p.a.</span>
                </div>
                <p className="text-white">Principal: {parseFloat(acc.principal).toFixed(4)} {acc.currency}</p>
                <p className="text-green-300 text-sm">+ Interest: {parseFloat(acc.accruedInterest).toFixed(8)}</p>
                <p className="text-purple-300 text-sm font-medium">Total: {parseFloat(acc.totalValue).toFixed(8)}</p>
                {acc.maturityDate && (
                  <p className="text-slate-400 text-xs mt-1">
                    Maturity: {new Date(acc.maturityDate).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={() => handleClose(acc.id)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300"
                >
                  Close Account
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
