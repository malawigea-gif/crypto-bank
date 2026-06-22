const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { me, register, login, changePassword, forgotPassword, resetPassword } = require('./auth.controller');
const { protect } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimit');

const resetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/reset');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const resetUpload = multer({
  storage: resetStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

router.get('/me', protect, me);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/change-password', protect, changePassword);
router.post('/forgot-password', authLimiter, resetUpload.single('document'), forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
