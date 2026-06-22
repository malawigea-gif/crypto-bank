const router = require('express').Router();
const { protect, adminOnly } = require('../../middleware/auth');
const {
  stats, users, updateKYC, toggleUser, transactions, auditLogs,
  kycList, kycApprove, kycReject, kycFile,
  resetList, resetApprove, resetReject, resetFile,
  feeWallet,
  depositList, depositApprove, depositReject,
  withdrawList, withdrawApprove, withdrawReject,
  processReferralCommissions, referralStats,
} = require('./admin.controller');

router.use(protect, adminOnly);

// Existing
router.get('/stats', stats);
router.get('/users', users);
router.patch('/users/:userId/kyc', updateKYC);
router.patch('/users/:userId/toggle', toggleUser);
router.get('/transactions', transactions);
router.get('/audit-logs', auditLogs);

// KYC review
router.get('/kyc', kycList);
router.get('/kyc/:userId/file/:which', kycFile);
router.patch('/kyc/:userId/approve', kycApprove);
router.patch('/kyc/:userId/reject', kycReject);

// Fee wallet
router.get('/fee-wallet', feeWallet);

// Deposit requests (TRC-20 USDT)
router.get('/deposit-requests', depositList);
router.patch('/deposit-requests/:id/approve', depositApprove);
router.patch('/deposit-requests/:id/reject', depositReject);

// Withdraw requests (TRC-20 USDT)
router.get('/withdraw-requests', withdrawList);
router.patch('/withdraw-requests/:id/approve', withdrawApprove);
router.patch('/withdraw-requests/:id/reject', withdrawReject);

// Password reset requests
router.get('/reset-requests', resetList);
router.get('/reset-requests/:id/file', resetFile);
router.patch('/reset-requests/:id/approve', resetApprove);
router.patch('/reset-requests/:id/reject', resetReject);

// Referral commissions
router.post('/process-referral-commissions', processReferralCommissions);
router.get('/referral-stats', referralStats);

module.exports = router;
