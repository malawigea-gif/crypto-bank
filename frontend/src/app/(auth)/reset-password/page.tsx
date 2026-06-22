'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Suspense } from 'react';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset failed. The token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">🔒 New Password</h1>
          <p className="text-purple-300 mt-2">Enter your reset token and new password</p>
        </div>

        {success ? (
          <div className="bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl p-5 text-center">
            <p className="text-lg font-semibold mb-2">Password Reset!</p>
            <p className="text-sm">Redirecting to login...</p>
          </div>
        ) : (
          <>
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">Reset Token</label>
                <input type="text" value={token} onChange={e => setToken(e.target.value)}
                  className={inputClass} placeholder="Paste your token here" required />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1 block">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className={inputClass} placeholder="Minimum 8 characters" required minLength={8} />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1 block">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className={`${inputClass} ${confirmPassword && confirmPassword !== newPassword ? 'border-red-500/60' : ''}`}
                  placeholder="Repeat new password" required />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            <p className="text-center text-white/50 mt-6 text-sm">
              <a href="/login" className="text-purple-400 hover:text-purple-300">Back to Login</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
