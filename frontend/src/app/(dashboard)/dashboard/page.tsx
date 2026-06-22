'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Wallet {
  currency: string;
  balance: string;
  address: string;
}

const CRYPTO_COLORS: Record<string, string> = {
  BTC: 'from-orange-500 to-yellow-500',
  ETH: 'from-blue-500 to-purple-500',
  USDT: 'from-green-500 to-teal-500',
  BNB: 'from-yellow-400 to-orange-400',
  SOL: 'from-purple-500 to-pink-500',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/wallet').then(res => {
      setWallets(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalUSDT = wallets.find(w => w.currency === 'USDT');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          Welcome, {user?.fullName}! 👋
        </h2>
        <p className="text-slate-400 mt-1">Your Crypto Bank Dashboard</p>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 mb-8">
        <p className="text-purple-200 text-sm">Total USDT Balance</p>
        <h3 className="text-4xl font-bold text-white mt-2">
          {totalUSDT ? parseFloat(totalUSDT.balance).toFixed(2) : '0.00'} USDT
        </h3>
      </div>

      <h3 className="text-lg font-semibold text-white mb-4">Your Wallets</h3>
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {wallets.map(wallet => (
            <div
              key={wallet.currency}
              className={`bg-gradient-to-br ${CRYPTO_COLORS[wallet.currency] || 'from-slate-600 to-slate-700'} rounded-xl p-5`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/70 text-sm">{wallet.currency}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {parseFloat(wallet.balance).toFixed(8)}
                  </p>
                </div>
                <span className="text-3xl">
                  {wallet.currency === 'BTC' ? '₿' :
                   wallet.currency === 'ETH' ? 'Ξ' :
                   wallet.currency === 'USDT' ? '₮' : '●'}
                </span>
              </div>
              <p className="text-white/50 text-xs mt-3 truncate">{wallet.address}</p>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Deposit', icon: '⬇️', href: '/wallet' },
          { label: 'Withdraw', icon: '⬆️', href: '/wallet' },
          { label: 'Transfer', icon: '↗️', href: '/transfer' },
          { label: 'Exchange', icon: '🔄', href: '/exchange' },
        ].map(action => (
          <a
            key={action.label}
            href={action.href}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 text-center transition-colors"
          >
            <span className="text-2xl">{action.icon}</span>
            <p className="text-white text-sm font-medium mt-2">{action.label}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
