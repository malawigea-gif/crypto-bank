const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const { requireKyc } = require('../../middleware/requireKyc');
const {
  getAllWallets, getBalance, deposit, withdraw,
  getDepositAddress, createDepositRequest, getUserDepositRequests,
  createWithdrawRequest, getUserWithdrawRequests,
} = require('./wallet.controller');

router.use(protect);

router.get('/', getAllWallets);

// Specific GET routes MUST be declared before /:currency wildcard
router.get('/usdt-deposit-address', getDepositAddress);
router.get('/deposit-requests', getUserDepositRequests);
router.get('/withdraw-requests', getUserWithdrawRequests);

router.post('/deposit', requireKyc, deposit);
router.post('/withdraw', requireKyc, withdraw);
router.post('/deposit-request', requireKyc, createDepositRequest);
router.post('/withdraw-request', requireKyc, createWithdrawRequest);

// Wildcard last to avoid shadowing specific routes
router.get('/:currency', getBalance);

module.exports = router;
