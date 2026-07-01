const { Router } = require('express');
const controller = require('../controllers/exercise.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;

