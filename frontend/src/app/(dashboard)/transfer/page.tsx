'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Transfer {
  id: number;
  currency: string;
  amount: string;
  fee: string;
  status: string;
  createdAt: string;
  note: string;
  sender: { fullName: string; email: string };
  receiver: { fullName: string; email: string };
}

export default function TransferPage() {
  const [form, setForm] = useState({ receiverEmail: '', currency: 'USDT', amount: '', note: '' });
  const [history, setHistory] = useState<Transfer[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHistory = () => {
    api.get('/transfer/history').then(res => setHistory(res.data.data));
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/transfer/send', {
        ...form,
        amount: parseFloat(form.amount)
      });
      setMessage(res.data.message);
      setForm({ receiverEmail: '', currency: 'USDT', amount: '', note: '' });
      fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-8">↗️ Transfer</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Send Crypto</h3>

          {message && <div className="bg-green-500/20 text-green-300 rounded-lg p-3 mb-4 text-sm">{message}</div>}
          {error && <div className="bg-red-500/20 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Receiver Email</label>
              <input
                type="email"
                value={form.receiverEmail}
                onChange={e => setForm({ ...form, receiverEmail: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400"
                placeholder="receiver@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none"
                >
                  {['BTC', 'ETH', 'USDT', 'BNB', 'SOL'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Amount</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1 block">Note (Optional)</label>
              <input
                type="text"
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none"
                placeholder="Transfer note..."
              />
            </div>

            <div className="bg-slate-700 rounded-lg p-3 text-sm text-slate-400">
              ⚠️ Fee: 0.1% | Please verify transfer details before sending
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : '↗️ Send'}
            </button>
          </form>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Transfer History</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-slate-500 text-sm">No transfer history</p>
            ) : history.map(tx => (
              <div key={tx.id} className="bg-slate-700 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-white text-sm font-medium">
                      {tx.amount} {tx.currency}
                    </span>
                    <p className="text-slate-400 text-xs mt-1">→ {tx.receiver?.email}</p>
                    {tx.note && <p className="text-slate-500 text-xs">{tx.note}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    tx.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {tx.status}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
