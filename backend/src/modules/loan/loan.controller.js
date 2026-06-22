const loanService = require('./loan.service');

const apply = async (req, res) => {
  try {
    const loan = await loanService.applyLoan(req.user.userId, req.body);
    res.status(201).json({ success: true, data: loan, message: 'Loan approved successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const list = async (req, res) => {
  try {
    const loans = await loanService.getLoans(req.user.userId);
    res.json({ success: true, data: loans });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const repay = async (req, res) => {
  try {
    const result = await loanService.repayLoan(req.user.userId, req.params.id, req.body.amount);
    res.json({ success: true, data: result, message: 'Repayment successful' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { apply, list, repay };
