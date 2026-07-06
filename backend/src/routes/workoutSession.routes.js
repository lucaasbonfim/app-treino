const { Router } = require('express');
const controller = require('../controllers/workoutSession.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.get('/', controller.list);
router.get('/summary', controller.summary);
router.get('/evolution', controller.evolution);
router.get('/current', controller.current);
router.get('/:id/last-performance', controller.lastPerformance);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.post('/:id/finish', controller.finish);
router.patch('/:id/finish', controller.finish);
router.patch('/:id/abandon', controller.abandon);
router.put('/:sessionId/exercises/:exerciseId', controller.updateExercise);
router.put('/:sessionId/sets/:setId', controller.updateSet);

module.exports = router;
