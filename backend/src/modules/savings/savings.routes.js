const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const { requireKyc } = require('../../middleware/requireKyc');
const { open, list, close } = require('./savings.controller');

router.use(protect);

router.post('/', requireKyc, open);
router.get('/', list);
router.delete('/:id', requireKyc, close);

module.exports = router;
