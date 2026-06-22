const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const { requireKyc } = require('../../middleware/requireKyc');
const { send, history } = require('./transfer.controller');

router.use(protect);

router.post('/send', requireKyc, send);
router.get('/history', history);

module.exports = router;
