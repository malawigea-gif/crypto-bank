'use client';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

type KYCStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

interface KycData {
  status: KYCStatus;
  submission?: {
    documentType: string;
    status: string;
    rejectionReason?: string;
    submittedAt: string;
  } | null;
}

const DOC_TYPES = [
  { value: 'NIC', label: 'National ID Card (NIC)' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: "Driver's Licence" },
  { value: 'OTHER', label: 'Other Government ID' },
];

const statusColors: Record<KYCStatus, string> = {
  PENDING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  VERIFIED: 'text-green-400 bg-green-500/10 border-green-500/30',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const statusIcons: Record<KYCStatus, string> = {
  PENDING: '⏳', VERIFIED: '✅', REJECTED: '❌',
};

export default function VerifyPage() {
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [docType, setDocType] = useState('NIC');
  const [files, setFiles] = useState<Record<string, File | null>>({ docImage1: null, docImage2: null, facePhoto: null, signature: null });
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/kyc/status').then(r => setKycData(r.data.data)).catch(() => {});
  }, []);

  const handleFile = (key: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [key]: file }));
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => ({ ...prev, [key]: e.target?.result as string }));
      reader.readAsDataURL(file);
    } else {
      setPreviews(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage('');
    const { docImage1, docImage2, facePhoto, signature } = files;
    if (!docImage1 || !docImage2 || !facePhoto || !signature) {
      return setError('All 4 files are required');
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('documentType', docType);
      fd.append('docImage1', docImage1);
      fd.append('docImage2', docImage2);
      fd.append('facePhoto', facePhoto);
      fd.append('signature', signature);
      await api.post('/kyc/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Documents submitted successfully. Awaiting admin review.');
      setKycData(prev => prev ? { ...prev, status: 'PENDING' } : { status: 'PENDING' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const FileInput = ({ label, fieldKey, hint }: { label: string; fieldKey: string; hint: string }) => (
    <div>
      <label className="text-slate-300 text-sm mb-1 block">{label} <span className="text-slate-500 text-xs">({hint})</span></label>
      <input type="file" accept="image/*,.pdf"
        onChange={e => handleFile(fieldKey, e.target.files?.[0] || null)}
        className="w-full text-slate-300 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer" />
      {previews[fieldKey] && (
        <img src={previews[fieldKey]} alt={label} className="mt-2 h-24 rounded border border-slate-600 object-cover" />
      )}
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-2">🪪 Account Verification</h2>
      <p className="text-slate-400 mb-6">Submit identity documents to enable transactions.</p>

      {kycData && (
        <div className={`rounded-xl border p-4 mb-6 ${statusColors[kycData.status]}`}>
          <p className="font-semibold text-lg">{statusIcons[kycData.status]} Verification Status: {kycData.status}</p>
          {kycData.status === 'PENDING' && <p className="text-sm mt-1 opacity-80">Your documents are under review. You will be notified once approved.</p>}
          {kycData.status === 'VERIFIED' && <p className="text-sm mt-1 opacity-80">Your account is fully verified. All transactions are enabled.</p>}
          {kycData.status === 'REJECTED' && (
            <p className="text-sm mt-1 opacity-80">
              Reason: {kycData.submission?.rejectionReason || 'No reason provided'}.
              You may re-submit below.
            </p>
          )}
        </div>
      )}

      {kycData?.status === 'VERIFIED' ? null : (
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Submit Documents</h3>

          {message && <div className="bg-green-500/20 text-green-300 rounded-lg p-3 mb-4 text-sm">{message}</div>}
          {error && <div className="bg-red-500/20 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm mb-1 block">Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400">
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <FileInput label="Document Image 1" fieldKey="docImage1" hint="front side / main page" />
            <FileInput label="Document Image 2" fieldKey="docImage2" hint="back side / second document" />
            <FileInput label="Face Photo" fieldKey="facePhoto" hint="clear selfie, face visible" />
            <FileInput label="Signature Photo" fieldKey="signature" hint="your signature on white paper" />

            <button type="submit" disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
