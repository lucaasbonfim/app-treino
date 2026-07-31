const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');

const router = Router();

router.post('/register', controller.register);
router.post('/register/verify', controller.verifyRegisterCode);
router.post('/login', controller.login);
router.post('/google', controller.googleLogin);
router.get('/me', auth, controller.me);
router.put('/name', auth, controller.updateName);
router.post('/change-password', auth, controller.changePassword);
router.post('/email/request', auth, controller.requestEmailChange);
router.post('/email/confirm', auth, controller.confirmEmailChange);

module.exports = router;
