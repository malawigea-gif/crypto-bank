'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhoneInput, { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import type { CountryCode } from 'libphonenumber-js';
import en from 'react-phone-number-input/locale/en.json';
import 'react-phone-number-input/style.css';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const countries = getCountries();

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('LK');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setPromoCode(ref.toUpperCase());
  }, [searchParams]);

  const handleCountryChange = (code: string) => {
    setCountry(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (!phone) return setError('Phone number is required');

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        firstName,
        lastName,
        country,
        phoneCountry: country,
        phone,
        email,
        password,
        ...(promoCode.trim() ? { promoCode: promoCode.trim().toUpperCase() } : {}),
      });
      setAuth(res.data.data.token, res.data.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20 max-h-screen overflow-y-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">🏦 Crypto Bank</h1>
          <p className="text-purple-300 mt-2">Create a new account</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/70 text-sm mb-1 block">First Name</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                className={inputClass} placeholder="First name" required />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Last Name</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                className={inputClass} placeholder="Last name" required />
            </div>
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Country</label>
            <select
              value={country}
              onChange={e => handleCountryChange(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400"
              required
            >
              {countries.map(code => (
                <option key={code} value={code} className="bg-slate-800 text-white">
                  {(en as Record<string, string>)[code]} (+{getCountryCallingCode(code as CountryCode)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Phone Number</label>
            <div className="phone-input-wrapper">
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry={country as CountryCode}
                country={country as CountryCode}
                value={phone}
                onChange={(val) => setPhone(val || '')}
                className="phone-input"
              />
            </div>
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className={inputClass} placeholder="email@example.com" required />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className={inputClass} placeholder="Minimum 8 characters" required minLength={8} />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className={`${inputClass} ${confirmPassword && confirmPassword !== password ? 'border-red-500/60' : ''}`}
              placeholder="Repeat password" required />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Promotion Code <span className="text-white/40">(optional)</span></label>
            <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
              className={inputClass} placeholder="e.g. A62A23A4" maxLength={8} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-white/50 mt-6 text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-purple-400 hover:text-purple-300">Login</a>
        </p>
      </div>

      <style jsx global>{`
        .phone-input-wrapper .PhoneInput {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          gap: 0.5rem;
        }
        .phone-input-wrapper .PhoneInput:focus-within {
          border-color: #a855f7;
        }
        .phone-input-wrapper .PhoneInputInput {
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 1rem;
          width: 100%;
        }
        .phone-input-wrapper .PhoneInputInput::placeholder { color: rgba(255,255,255,0.3); }
        .phone-input-wrapper .PhoneInputCountrySelect { background: #1e293b; color: white; border: none; }
        .phone-input-wrapper .PhoneInputCountryIcon { border-radius: 2px; }
      `}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
