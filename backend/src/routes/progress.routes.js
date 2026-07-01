const { Router } = require('express');
const controller = require('../controllers/progress.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.use(auth);
router.get('/weekly-summary', controller.weeklySummary);
router.get('/monthly-checkins', controller.monthlyCheckins);
router.post('/checkin', controller.checkin);
router.put('/weekly-goal', controller.updateWeeklyGoal);

module.exports = router;
