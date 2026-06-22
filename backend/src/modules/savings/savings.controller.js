const savingsService = require('./savings.service');

const open = async (req, res) => {
  try {
    const result = await savingsService.openSavingsAccount(req.user.userId, req.body);
    res.status(201).json({ success: true, data: result, message: 'Savings account opened successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const list = async (req, res) => {
  try {
    const accounts = await savingsService.getSavingsAccounts(req.user.userId);
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const close = async (req, res) => {
  try {
    const result = await savingsService.closeSavingsAccount(req.user.userId, req.params.id);
    res.json({ success: true, data: result, message: 'Account closed and balance transferred to wallet' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { open, list, close };
