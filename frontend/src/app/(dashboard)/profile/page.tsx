'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface RewardByCurrency {
  currency: string;
  total: string;
}

interface ProfileData {
  referralCode: string;
  referralCount: number;
  rewardsByCurrency: RewardByCurrency[];
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(res => setProfile(res.data.data)).catch(() => {});
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setMessage('Password changed successfully');
      setCurrentPassword(''); setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const copyCode = () => {
    if (!profile?.referralCode) return;
    navigator.clipboard.writeText(profile.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareLink = typeof window !== 'undefined' && profile?.referralCode
    ? `${window.location.origin}/register?ref=${profile.referralCode}`
    : '';

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-8">Profile & Settings</h2>

      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">Account Information</h3>
        <div className="space-y-3">
          {[
            { label: 'Full Name', value: user?.fullName },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">{item.label}</span>
              <span className="text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Referral / Promotion Code */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">Your Promotion Code</h3>
        {profile ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-mono font-bold tracking-widest text-purple-300 bg-slate-700 px-5 py-3 rounded-lg">
                {profile.referralCode}
              </span>
              <button
                onClick={copyCode}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {shareLink && (
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-1">Share link</p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 text-xs bg-slate-700 px-3 py-2 rounded-lg truncate flex-1">
                    {shareLink}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(shareLink)}
                    className="text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-slate-400 transition-colors"
                  >
                    Copy link
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{profile.referralCount}</p>
                <p className="text-slate-400 text-sm mt-1">People referred</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Total rewards earned</p>
                {profile.rewardsByCurrency.length === 0 ? (
                  <p className="text-slate-500 text-sm">None yet</p>
                ) : profile.rewardsByCurrency.map(r => (
                  <div key={r.currency} className="flex justify-between text-sm">
                    <span className="text-slate-300">{r.currency}</span>
                    <span className="text-green-400 font-medium">{r.total}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-slate-500 text-xs mt-4">
              Earn 3% on flexible savings and 10% on fixed savings opened by referred users. After 10 referrals, also earn 25% of their monthly interest.
            </p>
          </>
        ) : (
          <p className="text-slate-500 text-sm">Loading...</p>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Change Password</h3>
        {message && <div className="bg-green-500/20 text-green-300 rounded-lg p-3 mb-4 text-sm">{message}</div>}
        {error && <div className="bg-red-500/20 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-1 block">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400"
              required
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-1 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
