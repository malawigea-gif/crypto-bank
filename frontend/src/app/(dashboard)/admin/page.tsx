'use client';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

type Tab = 'overview' | 'users' | 'transactions' | 'logs' | 'kyc' | 'messages' | 'resets' | 'feeWallet' | 'deposits' | 'withdrawals';

interface Stats {
  users: { total: number; active: number; pendingKYC: number };
  transactions: { totalTransfers: number; transferVolume: number };
  loans: { activeLoans: number; totalLoanVolume: number };
  savings: { activeSavingsAccounts: number };
}

interface AdminUser {
  id: number; fullName?: string; firstName?: string; lastName?: string;
  email: string; phone: string; kycStatus: string; role: string; isActive: boolean; createdAt: string;
  _count: { wallets: number; loans: number; savingsAccounts: number };
}

interface KycSubmission {
  id: number; userId: number; documentType: string; status: string;
  rejectionReason?: string; submittedAt: string;
  user: { id: number; fullName?: string; firstName?: string; lastName?: string; email: string; phone: string; createdAt: string };
}

interface UserThread { id: number; displayName: string; email: string; unreadCount: number; }
interface Message { id: number; sender: 'USER' | 'ADMIN'; body: string; createdAt: string; }

interface ResetRequest {
  id: number; email: string; note?: string; status: string;
  createdAt: string; reviewedAt?: string; resetToken?: string;
}

const userName = (u: { fullName?: string; firstName?: string; lastName?: string; email: string }) =>
  u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : (u.fullName || u.email);

export default function AdminPage() {
  const { user, _hasHydrated } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // KYC
  const [kycSubs, setKycSubs] = useState<KycSubmission[]>([]);
  const [kycFilter, setKycFilter] = useState('PENDING');
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [kycImages, setKycImages] = useState<Record<string, string>>({});

  // Messages
  const [threads, setThreads] = useState<UserThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<UserThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const msgBottomRef = useRef<HTMLDivElement>(null);

  // Resets
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [resetFilter, setResetFilter] = useState('PENDING');
  const [shownToken, setShownToken] = useState<Record<number, string>>({});

  // Deposit Requests
  const [adminDeposits, setAdminDeposits] = useState<any[]>([]);
  const [depositFilter, setDepositFilter] = useState('PENDING');
  const [rejectingDepositId, setRejectingDepositId] = useState<number | null>(null);
  const [depositRejectNote, setDepositRejectNote] = useState('');

  // Withdraw Requests
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState('PENDING');
  const [approvingWithdrawId, setApprovingWithdrawId] = useState<number | null>(null);
  const [withdrawApprovalTxid, setWithdrawApprovalTxid] = useState('');
  const [rejectingWithdrawId, setRejectingWithdrawId] = useState<number | null>(null);
  const [withdrawRejectNote, setWithdrawRejectNote] = useState('');

  // Fee Wallet
  const [feeWallet, setFeeWallet] = useState<{
    wallets: { currency: string; balance: string; usdValue: number }[];
    totalUSD: number;
    collectorEmail: string;
  } | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (user?.role !== 'ADMIN') { router.push('/dashboard'); return; }
    fetchStats(); fetchUsers();
  }, [_hasHydrated, user?.role]);

  const fetchStats = () => api.get('/admin/stats').then(r => setStats(r.data.data));
  const fetchUsers = (q = '') => api.get(`/admin/users?search=${q}`).then(r => setUsers(r.data.data.users));
  const fetchTransactions = () => api.get('/admin/transactions').then(r => setTransactions(r.data.data.transfers));
  const fetchLogs = () => api.get('/admin/audit-logs').then(r => setLogs(r.data.data.logs));
  const fetchKyc = (s = kycFilter) => api.get(`/admin/kyc?status=${s}`).then(r => setKycSubs(r.data.data));
  const fetchThreads = () => api.get('/messages/admin/list').then(r => setThreads(r.data.data));
  const fetchThreadMessages = (uid: number) =>
    api.get(`/messages/admin/${uid}`).then(r => {
      setThreadMessages(r.data.data);
      setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
  const fetchResets = (s = resetFilter) => api.get(`/admin/reset-requests?status=${s}`).then(r => setResets(r.data.data));
  const fetchFeeWallet = () => api.get('/admin/fee-wallet').then(r => setFeeWallet(r.data.data));
  const fetchAdminDeposits = (s = depositFilter) => api.get(`/admin/deposit-requests?status=${s}`).then(r => setAdminDeposits(r.data.data));
  const fetchAdminWithdrawals = (s = withdrawalFilter) => api.get(`/admin/withdraw-requests?status=${s}`).then(r => setAdminWithdrawals(r.data.data));

  const loadKycImages = async (userId: number) => {
    const keys = ['doc1', 'doc2', 'face', 'signature'];
    const urls: Record<string, string> = {};
    await Promise.all(keys.map(async key => {
      try {
        const res = await api.get(`/admin/kyc/${userId}/file/${key}`, { responseType: 'blob' });
        urls[key] = URL.createObjectURL(res.data);
      } catch { /* file may not exist */ }
    }));
    setKycImages(urls);
  };

  const handleKYC = (userId: number, kycStatus: string) =>
    api.patch(`/admin/users/${userId}/kyc`, { kycStatus }).then(() => fetchUsers(search));
  const handleToggle = (userId: number) =>
    api.patch(`/admin/users/${userId}/toggle`).then(() => fetchUsers(search));

  const handleKycApprove = async (userId: number) => {
    await api.patch(`/admin/kyc/${userId}/approve`);
    setSelectedKyc(null); setKycImages({});
    fetchKyc();
  };

  const handleKycReject = async (userId: number) => {
    await api.patch(`/admin/kyc/${userId}/reject`, { reason: rejectReason });
    setSelectedKyc(null); setRejectReason(''); setKycImages({});
    fetchKyc();
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyBody.trim()) return;
    await api.post(`/messages/admin/${selectedThread.id}`, { body: replyBody });
    setReplyBody('');
    fetchThreadMessages(selectedThread.id);
  };

  const handleResetApprove = async (id: number) => {
    const res = await api.patch(`/admin/reset-requests/${id}/approve`);
    setShownToken(prev => ({ ...prev, [id]: res.data.data.resetToken }));
    fetchResets();
  };

  const handleResetReject = async (id: number) => {
    await api.patch(`/admin/reset-requests/${id}/reject`);
    fetchResets();
  };

  const viewResetDoc = async (id: number) => {
    try {
      const res = await api.get(`/admin/reset-requests/${id}/file`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch { alert('File not found'); }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'users', label: '👥 Users' },
    { key: 'kyc', label: '🪪 KYC Review' },
    { key: 'messages', label: '💬 Messages' },
    { key: 'resets', label: '🔑 Reset Requests' },
    { key: 'transactions', label: '↗️ Transactions' },
    { key: 'logs', label: '📋 Audit Logs' },
    { key: 'feeWallet', label: '💰 Fee Wallet' },
    { key: 'deposits', label: '⬇️ Deposits' },
    { key: 'withdrawals', label: '⬆️ Withdrawals' },
  ];

  const handleTabClick = (key: Tab) => {
    setActiveTab(key);
    if (key === 'transactions') fetchTransactions();
    if (key === 'logs') fetchLogs();
    if (key === 'kyc') fetchKyc(kycFilter);
    if (key === 'messages') fetchThreads();
    if (key === 'resets') fetchResets(resetFilter);
    if (key === 'feeWallet') fetchFeeWallet();
    if (key === 'deposits') fetchAdminDeposits(depositFilter);
    if (key === 'withdrawals') fetchAdminWithdrawals(withdrawalFilter);
  };

  if (!_hasHydrated) {
    return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Loading...</p></div>;
  }

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-2">⚙️ Admin Panel</h2>
      <p className="text-slate-400 mb-8">System Administration Dashboard</p>

      <div className="flex gap-2 mb-8 border-b border-slate-700 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => handleTabClick(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.users.total, icon: '👥', color: 'from-blue-600 to-blue-700' },
              { label: 'Pending KYC', value: stats.users.pendingKYC, icon: '🔍', color: 'from-yellow-600 to-yellow-700' },
              { label: 'Total Transfers', value: stats.transactions.totalTransfers, icon: '↗️', color: 'from-green-600 to-green-700' },
              { label: 'Active Loans', value: stats.loans.activeLoans, icon: '💳', color: 'from-purple-600 to-purple-700' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-5`}>
                <span className="text-2xl">{s.icon}</span>
                <p className="text-3xl font-bold text-white mt-2">{s.value}</p>
                <p className="text-white/70 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Transfer Volume</h3>
              <p className="text-3xl font-bold text-green-400">{parseFloat(String(stats.transactions.transferVolume)).toFixed(4)} USDT</p>
              <p className="text-slate-400 text-sm mt-1">Total completed transfers</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Loan Portfolio</h3>
              <p className="text-3xl font-bold text-purple-400">{parseFloat(String(stats.loans.totalLoanVolume)).toFixed(2)} USDT</p>
              <p className="text-slate-400 text-sm mt-1">Total loan disbursements</p>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div>
          <div className="flex gap-3 mb-6">
            <input type="text" value={search}
              onChange={e => { setSearch(e.target.value); fetchUsers(e.target.value); }}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
              placeholder="Search by name, email, or phone..." />
          </div>
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>{['User', 'Contact', 'KYC', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-300 text-sm font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{userName(u)}</p>
                      <p className="text-slate-400 text-xs">{u.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300 text-sm">{u.email}</p>
                      <p className="text-slate-500 text-xs">{u.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select value={u.kycStatus} onChange={e => handleKYC(u.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded border-0 ${
                          u.kycStatus === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
                          u.kycStatus === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        <option value="PENDING">PENDING</option>
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${u.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(u.id)}
                        className={`text-xs px-3 py-1 rounded ${u.isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KYC Review */}
      {activeTab === 'kyc' && (
        <div>
          {selectedKyc ? (
            <div className="bg-slate-800 rounded-xl p-6">
              <button onClick={() => { setSelectedKyc(null); setKycImages({}); }}
                className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1">
                ← Back to list
              </button>
              <h3 className="text-white font-semibold text-lg mb-1">{userName(selectedKyc.user)}</h3>
              <p className="text-slate-400 text-sm mb-4">{selectedKyc.user.email} · Doc: {selectedKyc.documentType} · Submitted: {new Date(selectedKyc.submittedAt).toLocaleString()}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {['doc1', 'doc2', 'face', 'signature'].map((key, i) => (
                  <div key={key} className="bg-slate-700 rounded-lg overflow-hidden">
                    <p className="text-slate-400 text-xs px-3 py-2">{['Document 1', 'Document 2', 'Face Photo', 'Signature'][i]}</p>
                    {kycImages[key]
                      ? <img src={kycImages[key]} alt={key} className="w-full h-40 object-contain bg-slate-900" />
                      : <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Loading...</div>
                    }
                  </div>
                ))}
              </div>

              <div className="flex gap-3 items-end">
                <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (required for reject)"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-red-400" />
                <button onClick={() => handleKycApprove(selectedKyc.userId)}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
                  Approve
                </button>
                <button onClick={() => rejectReason ? handleKycReject(selectedKyc.userId) : alert('Enter rejection reason')}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                {['PENDING', 'VERIFIED', 'REJECTED'].map(s => (
                  <button key={s} onClick={() => { setKycFilter(s); fetchKyc(s); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${kycFilter === s ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>{['User', 'Document', 'Submitted', 'Status', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-300 text-sm font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {kycSubs.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No submissions found</td></tr>
                    )}
                    {kycSubs.map(s => (
                      <tr key={s.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <p className="text-white text-sm">{userName(s.user)}</p>
                          <p className="text-slate-400 text-xs">{s.user.email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{s.documentType}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.submittedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            s.status === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
                            s.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setSelectedKyc(s); loadKycImages(s.userId); }}
                            className="text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-3 py-1 rounded">
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      {activeTab === 'messages' && (
        <div className="flex gap-4 h-96">
          <div className="w-64 bg-slate-800 rounded-xl overflow-y-auto">
            <p className="text-slate-400 text-xs px-4 py-3 border-b border-slate-700">User Threads</p>
            {threads.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No messages yet</p>}
            {threads.map(t => (
              <button key={t.id} onClick={() => { setSelectedThread(t); fetchThreadMessages(t.id); }}
                className={`w-full text-left px-4 py-3 border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${selectedThread?.id === t.id ? 'bg-slate-700/50' : ''}`}>
                <p className="text-white text-sm font-medium">{t.displayName}</p>
                <p className="text-slate-400 text-xs">{t.email}</p>
                {t.unreadCount > 0 && (
                  <span className="inline-block mt-1 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">{t.unreadCount} new</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col bg-slate-800 rounded-xl overflow-hidden">
            {!selectedThread ? (
              <p className="text-slate-500 text-sm m-auto">Select a conversation</p>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-white font-medium text-sm">{selectedThread.displayName}</p>
                  <p className="text-slate-400 text-xs">{selectedThread.email}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {threadMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.sender === 'ADMIN' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                        <p>{msg.body}</p>
                        <p className="text-xs mt-1 opacity-60">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={msgBottomRef} />
                </div>
                <div className="p-3 border-t border-slate-700 flex gap-2">
                  <input value={replyBody} onChange={e => setReplyBody(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                    placeholder="Type reply..." className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400" />
                  <button onClick={handleSendReply} disabled={!replyBody.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
                    Reply
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset Requests */}
      {activeTab === 'resets' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['PENDING', 'APPROVED', 'REJECTED', 'USED'].map(s => (
              <button key={s} onClick={() => { setResetFilter(s); fetchResets(s); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${resetFilter === s ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {resets.length === 0 && <p className="text-slate-500 text-sm py-8 text-center">No requests found</p>}
            {resets.map(r => (
              <div key={r.id} className="bg-slate-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">{r.email}</p>
                    <p className="text-slate-400 text-xs mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                    {r.note && <p className="text-slate-300 text-sm mt-2 italic">"{r.note}"</p>}
                    {shownToken[r.id] && (
                      <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-green-400 text-xs font-medium mb-1">Reset Token (share with user):</p>
                        <code className="text-green-300 text-xs break-all">{shownToken[r.id]}</code>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => viewResetDoc(r.id)}
                      className="text-xs bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg">
                      View Doc
                    </button>
                    <span className={`text-xs px-2 py-1 rounded ${
                      r.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                      r.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                      r.status === 'USED' ? 'bg-slate-500/20 text-slate-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>{r.status}</span>
                    {r.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleResetApprove(r.id)}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg">Approve</button>
                        <button onClick={() => handleResetReject(r.id)}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>{['ID', 'From', 'To', 'Amount', 'Currency', 'Fee', 'Status', 'Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-300 text-sm font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-slate-400 text-xs">#{tx.id}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{tx.sender?.email}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{tx.receiver?.email}</td>
                  <td className="px-4 py-3 text-white font-medium">{parseFloat(tx.amount).toFixed(6)}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{tx.currency}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{parseFloat(tx.fee).toFixed(6)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${tx.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{tx.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fee Wallet */}
      {activeTab === 'feeWallet' && (
        <div className="space-y-6">
          {!feeWallet ? (
            <p className="text-slate-400 text-sm">Loading fee wallet...</p>
          ) : (
            <>
              <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-xl p-6">
                <p className="text-green-200 text-sm font-medium">Total Fees Collected (USD)</p>
                <p className="text-4xl font-bold text-white mt-2">
                  ${feeWallet.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-green-200/70 text-xs mt-3">Collector: {feeWallet.collectorEmail}</p>
                <p className="text-green-200/50 text-xs mt-1">Exchange 0.2% · Withdraw 3% · Transfer 0.1%</p>
              </div>

              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="text-white font-semibold">Fee Wallet Balances</h3>
                  <button onClick={fetchFeeWallet}
                    className="text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                    ↻ Refresh
                  </button>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      {['Currency', 'Balance', 'USD Value'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-slate-300 text-sm font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {feeWallet.wallets.map(w => (
                      <tr key={w.currency} className="hover:bg-slate-700/50">
                        <td className="px-5 py-4">
                          <span className="text-white font-semibold">{w.currency}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-300 font-mono text-sm">
                          {parseFloat(w.balance).toFixed(8)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-medium ${w.usdValue > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                            ${w.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-slate-800 rounded-lg px-4 py-3 flex items-start gap-4">
              <span className="text-slate-500 text-xs mt-1 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</span>
              <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded whitespace-nowrap">{log.action}</span>
              <div>
                <p className="text-white text-sm">{log.details}</p>
                <p className="text-slate-500 text-xs mt-1">{log.user?.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deposit Requests */}
      {activeTab === 'deposits' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
              <button key={s} onClick={() => { setDepositFilter(s); fetchAdminDeposits(s); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${depositFilter === s ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>{['User', 'Amount', 'TxID', 'Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-300 text-sm font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {adminDeposits.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No requests found</td></tr>
                )}
                {adminDeposits.map(d => (
                  <tr key={d.id} className="hover:bg-slate-700/50 align-top">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{d.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-white font-medium text-sm">{parseFloat(d.amount).toFixed(2)} USDT</td>
                    <td className="px-4 py-3">
                      <a href={`https://tronscan.org/#/transaction/${d.txid}`} target="_blank" rel="noopener"
                        className="text-blue-400 hover:underline text-xs font-mono">
                        {d.txid.slice(0, 20)}…
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        d.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                        d.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{d.status}</span>
                      {d.adminNote && <p className="text-slate-500 text-xs mt-1 italic">{d.adminNote}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {d.status === 'PENDING' && (
                        rejectingDepositId === d.id ? (
                          <div className="flex flex-col gap-1.5">
                            <input value={depositRejectNote} onChange={e => setDepositRejectNote(e.target.value)}
                              placeholder="Rejection reason" autoFocus
                              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-red-400 w-40" />
                            <div className="flex gap-1">
                              <button onClick={async () => {
                                await api.patch(`/admin/deposit-requests/${d.id}/reject`, { adminNote: depositRejectNote });
                                setRejectingDepositId(null); setDepositRejectNote('');
                                fetchAdminDeposits(depositFilter);
                              }} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Confirm</button>
                              <button onClick={() => { setRejectingDepositId(null); setDepositRejectNote(''); }}
                                className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              await api.patch(`/admin/deposit-requests/${d.id}/approve`);
                              fetchAdminDeposits(depositFilter);
                            }} className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg">Approve</button>
                            <button onClick={() => { setRejectingDepositId(d.id); setDepositRejectNote(''); }}
                              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg">Reject</button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdraw Requests */}
      {activeTab === 'withdrawals' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['PENDING', 'COMPLETED', 'REJECTED'].map(s => (
              <button key={s} onClick={() => { setWithdrawalFilter(s); fetchAdminWithdrawals(s); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${withdrawalFilter === s ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>{['User', 'Amount / Fee', 'To Address', 'Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-300 text-sm font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {adminWithdrawals.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No requests found</td></tr>
                )}
                {adminWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-slate-700/50 align-top">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{w.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium text-sm">{parseFloat(w.amount).toFixed(2)} USDT</p>
                      <p className="text-red-400 text-xs">fee: {parseFloat(w.fee).toFixed(8)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`https://tronscan.org/#/address/${w.toAddress}`} target="_blank" rel="noopener"
                        className="text-blue-400 hover:underline text-xs font-mono">
                        {w.toAddress.slice(0, 18)}…
                      </a>
                      {w.txid && (
                        <p className="text-xs mt-1">
                          <a href={`https://tronscan.org/#/transaction/${w.txid}`} target="_blank" rel="noopener"
                            className="text-green-400 hover:underline font-mono">{w.txid.slice(0, 14)}… ↗</a>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(w.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        w.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                        w.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{w.status}</span>
                      {w.adminNote && <p className="text-slate-500 text-xs mt-1 italic">{w.adminNote}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {w.status === 'PENDING' && (
                        approvingWithdrawId === w.id ? (
                          <div className="flex flex-col gap-1.5">
                            <input value={withdrawApprovalTxid} onChange={e => setWithdrawApprovalTxid(e.target.value)}
                              placeholder="On-chain TxID" autoFocus
                              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-green-400 w-44" />
                            <div className="flex gap-1">
                              <button onClick={async () => {
                                await api.patch(`/admin/withdraw-requests/${w.id}/approve`, { txid: withdrawApprovalTxid });
                                setApprovingWithdrawId(null); setWithdrawApprovalTxid('');
                                fetchAdminWithdrawals(withdrawalFilter);
                              }} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Confirm</button>
                              <button onClick={() => { setApprovingWithdrawId(null); setWithdrawApprovalTxid(''); }}
                                className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded">Cancel</button>
                            </div>
                          </div>
                        ) : rejectingWithdrawId === w.id ? (
                          <div className="flex flex-col gap-1.5">
                            <input value={withdrawRejectNote} onChange={e => setWithdrawRejectNote(e.target.value)}
                              placeholder="Rejection reason" autoFocus
                              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-red-400 w-40" />
                            <div className="flex gap-1">
                              <button onClick={async () => {
                                await api.patch(`/admin/withdraw-requests/${w.id}/reject`, { adminNote: withdrawRejectNote });
                                setRejectingWithdrawId(null); setWithdrawRejectNote('');
                                fetchAdminWithdrawals(withdrawalFilter);
                              }} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Confirm</button>
                              <button onClick={() => { setRejectingWithdrawId(null); setWithdrawRejectNote(''); }}
                                className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => { setApprovingWithdrawId(w.id); setWithdrawApprovalTxid(''); setRejectingWithdrawId(null); }}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg">Approve</button>
                            <button onClick={() => { setRejectingWithdrawId(w.id); setWithdrawRejectNote(''); setApprovingWithdrawId(null); }}
                              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg">Reject</button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
