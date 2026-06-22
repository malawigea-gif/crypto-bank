'use client';
import { useState } from 'react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Please attach a verification document');
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('email', email);
      fd.append('document', file);
      if (note) fd.append('note', note);
      await api.post('/auth/forgot-password', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(true);
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">🔑 Reset Password</h1>
          <p className="text-purple-300 mt-2">Submit a request for admin review</p>
        </div>

        {submitted ? (
          <div className="bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl p-5 text-center">
            <p className="text-lg font-semibold mb-2">Request Submitted</p>
            <p className="text-sm">If the account exists, your request has been submitted for review. An admin will verify your document and provide a reset token via your in-app messages.</p>
            <a href="/login" className="inline-block mt-4 text-purple-400 hover:text-purple-300 text-sm">Back to Login</a>
          </div>
        ) : (
          <>
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">Account Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
                  placeholder="email@example.com" required />
              </div>

              <div>
                <label className="text-white/70 text-sm mb-1 block">Identity Document <span className="text-white/40">(ID / Passport / Licence)</span></label>
                <input type="file" accept="image/*,.pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full text-white/70 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer" required />
              </div>

              <div>
                <label className="text-white/70 text-sm mb-1 block">Note <span className="text-white/40">(optional)</span></label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 resize-none"
                  placeholder="Any additional info for the admin..." rows={3} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
                {loading ? 'Submitting...' : 'Submit Request'}
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
