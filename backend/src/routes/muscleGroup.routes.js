const { Router } = require('express');
const controller = require('../controllers/muscleGroup.controller');
const exerciseController = require('../controllers/exercise.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:muscleGroupId/exercises', exerciseController.create);
router.post('/:muscleGroupId/exercises/from-library', exerciseController.createFromLibrary);

module.exports = router;

