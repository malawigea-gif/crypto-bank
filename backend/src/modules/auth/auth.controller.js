const authService = require('./auth.service');

const me = async (req, res) => {
  try {
    const data = await authService.getProfile(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const result = await authService.changePassword(req.user.userId, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Verification document is required' });
    const { email, note } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    await authService.forgotPassword({ email, documentPath: req.file.path, note });
    res.json({ success: true, message: 'If the account exists, your request has been submitted for review.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password are required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    await authService.resetPassword({ token, newPassword });
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { me, register, login, changePassword, forgotPassword, resetPassword };
