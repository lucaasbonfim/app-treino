const { Router } = require('express');
const controller = require('../controllers/friend.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
// As rotas fixas vêm antes de qualquer parâmetro para não serem capturadas por ele.
router.get('/ranking', controller.ranking);
router.get('/requests', controller.requests);
router.get('/search', controller.search);
router.post('/requests', controller.sendRequest);
router.patch('/requests/:id', controller.respondRequest);
router.get('/', controller.list);
router.delete('/:userId', controller.remove);

module.exports = router;
