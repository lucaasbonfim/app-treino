const { Router } = require('express');
const controller = require('../controllers/ai.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.get('/status', controller.status);
router.post('/workout-plan/preview', controller.previewWorkoutPlan);
router.post('/workout-plan/import', controller.importWorkoutPlan);

module.exports = router;
