const exchangeService = require('./exchange.service');

const getRates = async (req, res) => {
  try {
    const rates = await exchangeService.getExchangeRates();
    res.json({ success: true, data: rates });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const exchange = async (req, res) => {
  try {
    const result = await exchangeService.exchangeCrypto(req.user.userId, req.body);
    res.json({ success: true, data: result, message: 'Exchange successful' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getRates, exchange };
