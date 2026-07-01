const { Router } = require('express');
const controller = require('../controllers/exerciseLibrary.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.get('/', controller.list);
router.get('/groups', controller.groups);
router.get('/:id', controller.get);

module.exports = router;
