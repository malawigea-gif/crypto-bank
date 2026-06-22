const router = require('express').Router();
const { protect, adminOnly } = require('../../middleware/auth');
const { send, thread, adminList, adminThread, adminReply } = require('./message.controller');

router.use(protect);

// User endpoints
router.post('/', send);
router.get('/', thread);

// Admin endpoints
router.get('/admin/list', adminOnly, adminList);
router.get('/admin/:userId', adminOnly, adminThread);
router.post('/admin/:userId', adminOnly, adminReply);

module.exports = router;
