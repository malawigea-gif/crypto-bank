const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const { requireKyc } = require('../../middleware/requireKyc');
const { apply, list, repay } = require('./loan.controller');

router.use(protect);

router.post('/apply', requireKyc, apply);
router.get('/', list);
router.post('/:id/repay', requireKyc, repay);

module.exports = router;
