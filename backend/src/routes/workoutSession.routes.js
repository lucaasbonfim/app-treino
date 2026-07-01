const { Router } = require('express');
const controller = require('../controllers/workoutSession.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.get('/', controller.list);
router.get('/summary', controller.summary);
router.get('/evolution', controller.evolution);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.post('/:id/finish', controller.finish);
router.put('/:sessionId/exercises/:exerciseId', controller.updateExercise);
router.put('/:sessionId/sets/:setId', controller.updateSet);

module.exports = router;
