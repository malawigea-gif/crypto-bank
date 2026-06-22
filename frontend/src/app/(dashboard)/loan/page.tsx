'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function LoanPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [form, setForm] = useState({ collateralCurrency: 'BTC', collateralAmount: '', loanAmountUSDT: '' });
  const [repayAmount, setRepayAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLoans = () => {
    api.get('/loan').then(res => setLoans(res.data.data));
  };

  useEffect(() => { fetchLoans(); }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(''); setError('');
    try {
      const res = await api.post('/loan/apply', {
        ...form,
        collateralAmount: parseFloat(form.collateralAmount),
        loanAmountUSDT: parseFloat(form.loanAmountUSDT)
      });
      setMessage(res.data.message);
      fetchLoans();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async (loanId: number) => {
    try {
      const res = await api.post(`/loan/${loanId}/repay`, { amount: parseFloat(repayAmount) });
      setMessage(res.data.message);
      fetchLoans();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-4">💳 Loan</h2>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
        <h3 className="text-blue-400 font-semibold mb-2">Loan Eligibility Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-slate-300">✅ Account age: minimum 6 months</div>
          <div className="text-slate-300">✅ Minimum collateral: 200 USDT</div>
          <div className="text-slate-300">✅ LTV ratio: 60% of collateral value</div>
        </div>
        <p className="text-slate-400 text-xs mt-2">⚠️ Interest rate: 12% p.a. | Loan term: 12 months</p>
      </div>

      {message && <div className="bg-green-500/20 text-green-300 rounded-lg p-3 mb-4 text-sm">{message}</div>}
      {error && <div className="bg-red-500/20 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Apply for Loan</h3>
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Collateral Currency</label>
              <select
                value={form.collateralCurrency}
                onChange={e => setForm({ ...form, collateralCurrency: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
              >
                {['BTC', 'ETH', 'BNB', 'SOL'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Collateral Amount ({form.collateralCurrency})</label>
              <input
                type="number"
                step="0.00000001"
                value={form.collateralAmount}
                onChange={e => setForm({ ...form, collateralAmount: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none"
                placeholder="0.00000000"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Loan Amount (USDT)</label>
              <input
                type="number"
                step="0.01"
                value={form.loanAmountUSDT}
                onChange={e => setForm({ ...form, loanAmountUSDT: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none"
                placeholder="0.00"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg"
            >
              {loading ? 'Processing...' : '💳 Apply for Loan'}
            </button>
          </form>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">My Loans</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loans.length === 0 ? (
              <p className="text-slate-500 text-sm">No active loans</p>
            ) : loans.map((loan: any) => (
              <div key={loan.id} className="bg-slate-700 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-white font-medium">{loan.loanAmountUSDT} USDT</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    loan.status === 'ACTIVE' ? 'bg-yellow-500/20 text-yellow-400' :
                    loan.status === 'REPAID' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{loan.status}</span>
                </div>
                <p className="text-slate-400 text-sm">Collateral: {loan.collateralAmount} {loan.collateralCurrency}</p>
                <p className="text-slate-400 text-sm">Interest: {loan.interestRate}% p.a.</p>
                {loan.dueDate && (
                  <p className="text-slate-400 text-xs">Due: {new Date(loan.dueDate).toLocaleDateString()}</p>
                )}
                {loan.status === 'ACTIVE' && (
                  <div className="flex gap-2 mt-3">
                    <input
                      type="number"
                      step="0.01"
                      value={repayAmount}
                      onChange={e => setRepayAmount(e.target.value)}
                      className="flex-1 bg-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                      placeholder="Repayment amount (USDT)"
                    />
                    <button
                      onClick={() => handleRepay(loan.id)}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
                    >
                      Repay
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
