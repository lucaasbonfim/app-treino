const { Router } = require('express');
const controller = require('../controllers/schedule.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.get('/', controller.list);
router.get('/today', controller.today);
router.put('/workout/:workoutId', controller.setWorkoutDays);
router.put('/:dayOfWeek', controller.setDay);
router.delete('/:dayOfWeek', controller.removeDay);
router.post('/:dayOfWeek/sessions', controller.startDay);

module.exports = router;
