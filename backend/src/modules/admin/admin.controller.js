const adminService = require('./admin.service');
const fs = require('fs');
const path = require('path');

const stats = async (req, res) => {
  try { res.json({ success: true, data: await adminService.getDashboardStats() }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const users = async (req, res) => {
  try { res.json({ success: true, data: await adminService.getAllUsers(req.query) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const updateKYC = async (req, res) => {
  try {
    const user = await adminService.updateUserKYC(req.params.userId, req.body.kycStatus);
    res.json({ success: true, data: user, message: 'KYC status updated' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const toggleUser = async (req, res) => {
  try {
    const user = await adminService.toggleUserStatus(req.params.userId);
    res.json({ success: true, data: user, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const transactions = async (req, res) => {
  try { res.json({ success: true, data: await adminService.getAllTransactions(req.query) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const auditLogs = async (req, res) => {
  try { res.json({ success: true, data: await adminService.getAuditLogs(req.query) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── KYC Review ────────────────────────────────────────────────

const kycList = async (req, res) => {
  try { res.json({ success: true, data: await adminService.listKycSubmissions(req.query) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const kycApprove = async (req, res) => {
  try {
    await adminService.approveKyc(req.params.userId, req.user.userId);
    res.json({ success: true, message: 'KYC approved' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const kycReject = async (req, res) => {
  try {
    await adminService.rejectKyc(req.params.userId, req.user.userId, req.body.reason);
    res.json({ success: true, message: 'KYC rejected' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const kycFile = async (req, res) => {
  try {
    const filePath = await adminService.getKycFilePath(req.params.userId, req.params.which);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
    res.sendFile(path.resolve(filePath));
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── Reset Requests ────────────────────────────────────────────

const resetList = async (req, res) => {
  try { res.json({ success: true, data: await adminService.listResetRequests(req.query) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const resetApprove = async (req, res) => {
  try {
    const result = await adminService.approveResetRequest(req.params.id, req.user.userId);
    res.json({ success: true, data: result, message: 'Request approved. Share the token with the user.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const resetReject = async (req, res) => {
  try {
    await adminService.rejectResetRequest(req.params.id, req.user.userId);
    res.json({ success: true, message: 'Request rejected' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const resetFile = async (req, res) => {
  try {
    const filePath = await adminService.getResetDocPath(req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
    res.sendFile(path.resolve(filePath));
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── Fee Wallet ────────────────────────────────────────────────

const feeWallet = async (req, res) => {
  try { res.json({ success: true, data: await adminService.getFeeWallet() }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Deposit Requests ──────────────────────────────────────────

const depositList = async (req, res) => {
  try { res.json({ success: true, data: await adminService.getDepositRequests(req.query) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const depositApprove = async (req, res) => {
  try {
    await adminService.approveDepositRequest(req.params.id, req.user.userId);
    res.json({ success: true, message: 'Deposit approved — USDT credited to user' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const depositReject = async (req, res) => {
  try {
    await adminService.rejectDepositRequest(req.params.id, req.user.userId, req.body.adminNote);
    res.json({ success: true, message: 'Deposit request rejected' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── Withdraw Requests ─────────────────────────────────────────

const withdrawList = async (req, res) => {
  try { res.json({ success: true, data: await adminService.getWithdrawRequests(req.query) }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const withdrawApprove = async (req, res) => {
  try {
    await adminService.approveWithdrawRequest(req.params.id, req.user.userId, req.body.txid);
    res.json({ success: true, message: 'Withdrawal marked COMPLETED' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const withdrawReject = async (req, res) => {
  try {
    await adminService.rejectWithdrawRequest(req.params.id, req.user.userId, req.body.adminNote);
    res.json({ success: true, message: 'Withdrawal rejected — funds refunded to user' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── Referral Commissions ──────────────────────────────────────

const processReferralCommissions = async (req, res) => {
  try {
    const result = await adminService.processReferralCommissions();
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const referralStats = async (req, res) => {
  try {
    const data = await adminService.getReferralStats();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = {
  stats, users, updateKYC, toggleUser, transactions, auditLogs,
  kycList, kycApprove, kycReject, kycFile,
  resetList, resetApprove, resetReject, resetFile,
  feeWallet,
  depositList, depositApprove, depositReject,
  withdrawList, withdrawApprove, withdrawReject,
  processReferralCommissions, referralStats,
};
