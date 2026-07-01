const service = require('../services/workoutSession.service');

async function start(req, res) {
    const session = await service.start(req.params.workoutId, req.user.id);
    res.status(session.resumed ? 200 : 201).json(session);
}

async function list(req, res) {
    res.json(await service.history(req.user.id));
}

async function summary(req, res) {
    res.json(await service.summary(req.user.id));
}

async function evolution(req, res) {
    res.json(await service.evolution(req.user.id));
}

async function get(req, res) {
    res.json(await service.get(req.params.id, req.user.id));
}

async function update(req, res) {
    res.json(await service.update(req.params.id, req.body, req.user.id));
}

async function updateExercise(req, res) {
    res.json(await service.updateExercise(
        req.params.sessionId,
        req.params.exerciseId,
        req.body,
        req.user.id,
    ));
}

async function updateSet(req, res) {
    res.json(await service.updateSet(
        req.params.sessionId,
        req.params.setId,
        req.body,
        req.user.id,
    ));
}

async function finish(req, res) {
    res.json(await service.finish(req.params.id, req.body, req.user.id));
}

module.exports = {
    start,
    list,
    summary,
    evolution,
    get,
    update,
    updateExercise,
    updateSet,
    finish,
};
