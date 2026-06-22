const walletService = require('./wallet.service');

const getAllWallets = async (req, res) => {
  try {
    res.json({ success: true, data: await walletService.getAllWallets(req.user.userId) });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getBalance = async (req, res) => {
  try {
    const wallet = await walletService.getWalletBalance(req.user.userId, req.params.currency.toUpperCase());
    res.json({ success: true, data: wallet });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const deposit = async (req, res) => {
  try {
    const { currency, amount } = req.body;
    const wallet = await walletService.deposit(req.user.userId, currency.toUpperCase(), amount);
    res.json({ success: true, data: wallet, message: 'Deposit successful' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const withdraw = async (req, res) => {
  try {
    const { currency, amount } = req.body;
    const result = await walletService.withdraw(req.user.userId, currency.toUpperCase(), amount);
    res.json({ success: true, data: result, message: 'Withdrawal successful' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── TRC-20 Deposit flow ───────────────────────────────────────

const getDepositAddress = (req, res) => {
  res.json({ success: true, data: walletService.getDepositAddress() });
};

const createDepositRequest = async (req, res) => {
  try {
    const result = await walletService.createDepositRequest(req.user.userId, req.body);
    res.status(201).json({ success: true, data: result, message: 'Deposit request submitted — pending admin review' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getUserDepositRequests = async (req, res) => {
  try {
    res.json({ success: true, data: await walletService.getUserDepositRequests(req.user.userId) });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ── TRC-20 Withdraw flow ──────────────────────────────────────

const createWithdrawRequest = async (req, res) => {
  try {
    const result = await walletService.createWithdrawRequest(req.user.userId, req.body);
    res.status(201).json({ success: true, data: result, message: 'Withdrawal request submitted — funds are held pending admin approval' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getUserWithdrawRequests = async (req, res) => {
  try {
    res.json({ success: true, data: await walletService.getUserWithdrawRequests(req.user.userId) });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

module.exports = {
  getAllWallets, getBalance, deposit, withdraw,
  getDepositAddress, createDepositRequest, getUserDepositRequests,
  createWithdrawRequest, getUserWithdrawRequests,
};
