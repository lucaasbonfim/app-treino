const { Router } = require('express');
const controller = require('../controllers/workout.controller');
const muscleGroupController = require('../controllers/muscleGroup.controller');
const workoutSessionController = require('../controllers/workoutSession.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.put('/:id/archive', controller.archive);
router.put('/:id/reactivate', controller.reactivate);
router.delete('/:id', controller.remove);
router.post('/:workoutId/muscle-groups', muscleGroupController.create);
router.post('/:workoutId/sessions', workoutSessionController.start);

module.exports = router;
