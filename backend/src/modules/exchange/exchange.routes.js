const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const { requireKyc } = require('../../middleware/requireKyc');
const { getRates, exchange } = require('./exchange.controller');

router.use(protect);

router.get('/rates', getRates);
router.post('/', requireKyc, exchange);

module.exports = router;
