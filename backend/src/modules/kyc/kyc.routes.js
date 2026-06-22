const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { protect } = require('../../middleware/auth');
const { submit, status } = require('./kyc.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/kyc');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const kycFields = upload.fields([
  { name: 'docImage1', maxCount: 1 },
  { name: 'docImage2', maxCount: 1 },
  { name: 'facePhoto', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
]);

router.use(protect);
router.post('/submit', kycFields, submit);
router.get('/status', status);

module.exports = router;
