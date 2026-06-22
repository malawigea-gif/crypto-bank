const transferService = require('./transfer.service');

const send = async (req, res) => {
  try {
    const transfer = await transferService.sendTransfer(req.user.userId, req.body);
    res.json({ success: true, data: transfer, message: 'Transfer successful' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const history = async (req, res) => {
  try {
    const transfers = await transferService.getHistory(req.user.userId);
    res.json({ success: true, data: transfers });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { send, history };
