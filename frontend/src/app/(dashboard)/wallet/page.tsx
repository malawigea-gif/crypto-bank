'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';

interface Wallet { id: number; currency: string; balance: string; address: string; }
interface DepositRequest { id: number; amount: string; txid: string; status: string; createdAt: string; adminNote?: string; }
interface WithdrawRequest { id: number; amount: string; fee: string; toAddress: string; status: string; txid?: string; createdAt: string; adminNote?: string; }

const WITHDRAW_FEE = 0.03;

const statusBadge = (s: string) =>
  s === 'APPROVED' || s === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
  s === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400';

export default function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selected, setSelected] = useState('USDT');

  // Deposit modal state
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAddress, setDepositAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositTxid, setDepositTxid] = useState('');
  const [depositMsg, setDepositMsg] = useState('');
  const [depositErr, setDepositErr] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [copied, setCopied] = useState(false);

  // Withdraw modal state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawErr, setWithdrawErr] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);

  const fetchWallets = useCallback(() => {
    api.get('/wallet').then(r => setWallets(r.data.data)).catch(() => {});
  }, []);

  const fetchDepositRequests = useCallback(() => {
    api.get('/wallet/deposit-requests').then(r => setDepositRequests(r.data.data)).catch(() => {});
  }, []);

  const fetchWithdrawRequests = useCallback(() => {
    api.get('/wallet/withdraw-requests').then(r => setWithdrawRequests(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchWallets();
    api.get('/wallet/usdt-deposit-address').then(r => setDepositAddress(r.data.data.address)).catch(() => {});
    fetchDepositRequests();
    fetchWithdrawRequests();
  }, []);

  const selectedWallet = wallets.find(w => w.currency === selected);
  const isUSDT = selected === 'USDT';
  const usdtBalance = parseFloat(selectedWallet?.balance ?? '0');

  const withdrawFee = withdrawAmount ? parseFloat((parseFloat(withdrawAmount) * WITHDRAW_FEE).toFixed(8)) : 0;
  const withdrawNet = withdrawAmount ? parseFloat((parseFloat(withdrawAmount) - withdrawFee).toFixed(8)) : 0;
  const withdrawTotal = withdrawAmount ? parseFloat(withdrawAmount) + withdrawFee : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDeposit = () => { setShowDeposit(true); setShowWithdraw(false); setDepositMsg(''); setDepositErr(''); };
  const openWithdraw = () => { setShowWithdraw(true); setShowDeposit(false); setWithdrawMsg(''); setWithdrawErr(''); };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositLoading(true); setDepositMsg(''); setDepositErr('');
    try {
      await api.post('/wallet/deposit-request', { amount: parseFloat(depositAmount), txid: depositTxid.trim() });
      setDepositMsg('Deposit request submitted! Awaiting admin review — balance will update after approval.');
      setDepositAmount(''); setDepositTxid('');
      fetchDepositRequests();
    } catch (err: any) {
      setDepositErr(err.response?.data?.message || 'An error occurred');
    } finally { setDepositLoading(false); }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawLoading(true); setWithdrawMsg(''); setWithdrawErr('');
    try {
      await api.post('/wallet/withdraw-request', { amount: parseFloat(withdrawAmount), toAddress: withdrawAddress.trim() });
      setWithdrawMsg(`Withdrawal request submitted! ${withdrawTotal.toFixed(8)} USDT is now reserved pending admin approval.`);
      setWithdrawAmount(''); setWithdrawAddress('');
      fetchWallets();
      fetchWithdrawRequests();
    } catch (err: any) {
      setWithdrawErr(err.response?.data?.message || 'An error occurred');
    } finally { setWithdrawLoading(false); }
  };

  const pendingDeposits = depositRequests.filter(r => r.status === 'PENDING');
  const pendingWithdrawals = withdrawRequests.filter(r => r.status === 'PENDING');

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-8">💰 Wallet</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Wallet Cards */}
        <div className="space-y-3">
          {wallets.map(w => (
            <div key={w.currency} onClick={() => setSelected(w.currency)}
              className={`bg-slate-800 rounded-xl p-4 cursor-pointer border-2 transition-colors ${
                selected === w.currency ? 'border-purple-500' : 'border-transparent hover:border-slate-600'
              }`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-white font-medium">{w.currency}</span>
                  {w.currency !== 'USDT' && (
                    <span className="ml-2 text-xs text-slate-500">internal only</span>
                  )}
                  {w.currency === 'USDT' && (
                    <span className="ml-2 text-xs text-green-500">TRC-20</span>
                  )}
                </div>
                <span className="text-white font-bold">{parseFloat(w.balance).toFixed(8)}</span>
              </div>
              <p className="text-slate-600 text-xs mt-1 truncate">{w.address}</p>
            </div>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm">Selected Wallet</p>
            <p className="text-white font-bold text-xl mt-1">{selected}</p>
            <p className="text-slate-300">Balance: <span className="text-white font-semibold">{(selectedWallet ? parseFloat(selectedWallet.balance) : 0).toFixed(8)}</span></p>
          </div>

          {isUSDT ? (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm font-semibold">USDT — TRC-20 (Tron Network)</p>
                <p className="text-blue-200/70 text-xs mt-1">
                  Deposits and withdrawals require TRC-20 (Tron) network. Admin must verify each transaction before balance updates.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={openDeposit}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors">
                  ⬇️ Deposit
                </button>
                <button onClick={openWithdraw}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors">
                  ⬆️ Withdraw
                </button>
              </div>
              {(pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-yellow-400 text-sm font-semibold">Pending Requests</p>
                  {pendingDeposits.length > 0 && (
                    <p className="text-yellow-300/80 text-xs mt-1">
                      {pendingDeposits.length} deposit request{pendingDeposits.length > 1 ? 's' : ''} awaiting admin review
                    </p>
                  )}
                  {pendingWithdrawals.length > 0 && (
                    <p className="text-yellow-300/80 text-xs mt-1">
                      {pendingWithdrawals.length} withdrawal request{pendingWithdrawals.length > 1 ? 's' : ''} — funds are held
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <p className="text-slate-300 text-sm font-semibold mb-2">On-chain deposit/withdraw not available</p>
              <p className="text-slate-500 text-sm">
                Real deposits and withdrawals are available for <span className="text-yellow-400 font-medium">USDT on TRC-20 (Tron)</span> only.
              </p>
              <p className="text-slate-600 text-xs mt-2">
                {selected} is for internal use only: exchange, savings, and transfers between accounts.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button disabled className="bg-slate-700 text-slate-600 font-semibold py-3 rounded-xl cursor-not-allowed">⬇️ Deposit</button>
                <button disabled className="bg-slate-700 text-slate-600 font-semibold py-3 rounded-xl cursor-not-allowed">⬆️ Withdraw</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Requests (always visible below when USDT selected) */}
      {isUSDT && (depositRequests.length > 0 || withdrawRequests.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {depositRequests.length > 0 && (
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <p className="text-slate-400 text-sm font-medium px-5 py-4 border-b border-slate-700">Recent Deposit Requests</p>
              <div className="divide-y divide-slate-700/50">
                {depositRequests.slice(0, 5).map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{parseFloat(r.amount).toFixed(2)} USDT</p>
                      <p className="text-slate-500 text-xs font-mono truncate">{r.txid.slice(0, 24)}…</p>
                      <p className="text-slate-600 text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded shrink-0 ${statusBadge(r.status)}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {withdrawRequests.length > 0 && (
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <p className="text-slate-400 text-sm font-medium px-5 py-4 border-b border-slate-700">Recent Withdrawal Requests</p>
              <div className="divide-y divide-slate-700/50">
                {withdrawRequests.slice(0, 5).map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{parseFloat(r.amount).toFixed(2)} USDT</p>
                      <p className="text-slate-500 text-xs font-mono truncate">{r.toAddress.slice(0, 20)}…</p>
                      <p className="text-slate-600 text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-1 rounded block ${statusBadge(r.status)}`}>{r.status}</span>
                      {r.status === 'PENDING' && (
                        <span className="text-yellow-500/70 text-xs mt-1 block">funds held</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Deposit Modal ────────────────────────────────────────── */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDeposit(false); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">Deposit USDT</h3>
                <p className="text-green-400 text-sm mt-0.5">TRC-20 (Tron Network)</p>
              </div>
              <button onClick={() => setShowDeposit(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>

            <div className="bg-red-600/20 border-2 border-red-500/80 rounded-xl p-4 mb-5">
              <p className="text-red-400 text-sm font-bold">⛔ DEMO ONLY — Do not send real funds</p>
              <p className="text-red-300/80 text-xs mt-1.5 leading-relaxed">
                This is a simulated demo project. Balances are not real. Any funds sent to any address shown here will be <strong>permanently lost</strong>.
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-4 mb-5">
              <p className="text-yellow-400 text-sm font-semibold">⚠ TRC-20 Network Only</p>
              <p className="text-yellow-300/80 text-xs mt-1.5 leading-relaxed">
                Send <strong>USDT on the TRC-20 (Tron) network only.</strong> Sending any other asset or using a different network (ERC-20, BEP-20, etc.) will result in <strong>permanent, unrecoverable loss</strong>.
              </p>
            </div>

            {depositAddress && (
              <div className="bg-slate-800 rounded-xl p-4 mb-5">
                <p className="text-red-400/90 text-xs mb-3 text-center font-semibold">⚠ DEMO address — for illustration only. Do not send real funds.</p>
                <div className="flex justify-center mb-3">
                  <div className="bg-white p-2 rounded-xl">
                    <QRCodeSVG value={depositAddress} size={160} level="M" />
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2.5">
                  <code className="text-yellow-300/70 text-xs flex-1 break-all leading-relaxed">[DEMO] {depositAddress}</code>
                  <button onClick={handleCopy}
                    className={`text-xs px-3 py-1.5 rounded-lg shrink-0 font-medium transition-colors ${
                      copied ? 'bg-green-600 text-white' : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                    }`}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-3">Confirm your deposit</p>
              {depositMsg && <div className="bg-green-500/20 text-green-300 rounded-lg p-3 mb-3 text-xs">{depositMsg}</div>}
              {depositErr && <div className="bg-red-500/20 text-red-300 rounded-lg p-3 mb-3 text-xs">{depositErr}</div>}

              <form onSubmit={handleDepositSubmit} className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Amount sent (USDT)</label>
                  <input type="number" step="0.01" min="1" value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400"
                    placeholder="0.00" required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Transaction hash (TxID)</label>
                  <input type="text" value={depositTxid} onChange={e => setDepositTxid(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-400"
                    placeholder="Tron transaction hash" required />
                  <p className="text-slate-600 text-xs mt-1">Find it in your wallet's transaction history on Tronscan</p>
                </div>
                <button type="submit" disabled={depositLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                  {depositLoading ? 'Submitting…' : '📤 Submit for Review'}
                </button>
              </form>
            </div>

            {depositRequests.length > 0 && (
              <div className="mt-4">
                <p className="text-slate-500 text-xs font-medium mb-2">Your deposit history</p>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {depositRequests.map(r => (
                    <div key={r.id} className="bg-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm">{parseFloat(r.amount).toFixed(2)} USDT</p>
                        <a href={`https://tronscan.org/#/transaction/${r.txid}`} target="_blank" rel="noopener"
                          className="text-blue-400 hover:underline text-xs font-mono">{r.txid.slice(0, 20)}…</a>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs px-2 py-1 rounded ${statusBadge(r.status)}`}>{r.status}</span>
                        <p className="text-slate-600 text-xs mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Withdraw Modal ───────────────────────────────────────── */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowWithdraw(false); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">Withdraw USDT</h3>
                <p className="text-red-400 text-sm mt-0.5">TRC-20 (Tron Network)</p>
              </div>
              <button onClick={() => setShowWithdraw(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 mb-4">
              <p className="text-slate-400 text-sm">Available USDT Balance</p>
              <p className="text-white font-bold text-2xl">{usdtBalance.toFixed(8)}</p>
              <p className="text-slate-500 text-xs mt-1">Note: funds are held (reserved) while a request is pending</p>
            </div>

            {withdrawMsg && <div className="bg-green-500/20 text-green-300 rounded-lg p-3 mb-4 text-xs">{withdrawMsg}</div>}
            {withdrawErr && <div className="bg-red-500/20 text-red-300 rounded-lg p-3 mb-4 text-xs">{withdrawErr}</div>}

            <form onSubmit={handleWithdrawSubmit} className="space-y-3 mb-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Amount (USDT)</label>
                <input type="number" step="0.01" min="1" value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400"
                  placeholder="0.00" required />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Destination TRC-20 Address</label>
                <input type="text" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-400"
                  placeholder="T… (Tron TRC-20 address)" required />
                <p className="text-slate-600 text-xs mt-1">Must start with T, ~34 characters (Tron TRC-20)</p>
              </div>

              {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                <div className="bg-slate-700 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Service fee (3%)</span>
                    <span className="text-red-400 font-medium">{withdrawFee.toFixed(8)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">You receive</span>
                    <span className="text-green-400 font-medium">{withdrawNet.toFixed(8)} USDT</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-600 pt-1 mt-1">
                    <span className="text-slate-300">Total reserved</span>
                    <span className="text-white font-semibold">{withdrawTotal.toFixed(8)} USDT</span>
                  </div>
                </div>
              )}

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-xs font-semibold">⚠ Double-check the destination address</p>
                <p className="text-red-300/70 text-xs mt-1 leading-relaxed">
                  Withdrawals are irreversible. Sending to a wrong address or wrong network results in permanent loss of funds. Only TRC-20 (Tron) USDT addresses are accepted.
                </p>
              </div>

              <button type="submit" disabled={withdrawLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                {withdrawLoading ? 'Submitting…' : '📤 Submit Withdrawal Request'}
              </button>
            </form>

            {withdrawRequests.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs font-medium mb-2">Your withdrawal history</p>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {withdrawRequests.map(r => (
                    <div key={r.id} className="bg-slate-800 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white text-sm">{parseFloat(r.amount).toFixed(2)} USDT</p>
                          <a href={`https://tronscan.org/#/address/${r.toAddress}`} target="_blank" rel="noopener"
                            className="text-slate-500 hover:text-blue-400 text-xs font-mono">
                            {r.toAddress.slice(0, 18)}…
                          </a>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs px-2 py-1 rounded block ${statusBadge(r.status)}`}>{r.status}</span>
                          <p className="text-slate-600 text-xs mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {r.txid && (
                        <p className="text-xs mt-1">
                          <a href={`https://tronscan.org/#/transaction/${r.txid}`} target="_blank" rel="noopener"
                            className="text-blue-400 hover:underline font-mono">{r.txid.slice(0, 20)}…</a>
                        </p>
                      )}
                      {r.adminNote && <p className="text-slate-500 text-xs mt-1 italic">{r.adminNote}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
