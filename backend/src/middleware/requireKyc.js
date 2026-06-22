const requireKyc = (req, res, next) => {
  if (req.user?.role === 'ADMIN') return next();
  if (req.user?.kycStatus !== 'VERIFIED') {
    return res.status(403).json({
      success: false,
      message: 'Account verification pending. Transactions are disabled until an admin approves your documents.',
    });
  }
  next();
};

module.exports = { requireKyc };
