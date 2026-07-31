const service = require('../services/auth.service');

async function register(req, res) {
    res.status(201).json(await service.register(req.body));
}

async function verifyRegisterCode(req, res) {
    res.status(201).json(await service.verifyRegisterCode(req.body));
}

async function login(req, res) {
    res.json(await service.login(req.body));
}

async function googleLogin(req, res) {
    res.json(await service.googleLogin(req.body));
}

function me(req, res) {
    res.json({ user: req.user });
}

async function updateName(req, res) {
    res.json(await service.updateName(req.user.id, req.body));
}

async function changePassword(req, res) {
    res.json(await service.changePassword(req.user.id, req.body));
}

async function requestEmailChange(req, res) {
    res.json(await service.requestEmailChange(req.user.id, req.body));
}

async function confirmEmailChange(req, res) {
    res.json(await service.confirmEmailChange(req.user.id, req.body));
}

module.exports = {
    register,
    verifyRegisterCode,
    login,
    googleLogin,
    me,
    updateName,
    changePassword,
    requestEmailChange,
    confirmEmailChange,
};
