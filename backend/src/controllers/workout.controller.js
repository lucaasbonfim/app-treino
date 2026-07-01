const service = require('../services/workout.service');

async function list(req, res) {
    res.json(await service.list(req.user.id, req.query.status));
}

async function archive(req, res) {
    res.json(await service.archive(req.params.id, req.user.id));
}

async function reactivate(req, res) {
    res.json(await service.reactivate(req.params.id, req.user.id));
}

async function get(req, res) {
    res.json(await service.get(req.params.id, req.user.id));
}

async function create(req, res) {
    res.status(201).json(await service.create(req.body, req.user.id));
}

async function update(req, res) {
    res.json(await service.update(req.params.id, req.body, req.user.id));
}

async function remove(req, res) {
    await service.remove(req.params.id, req.user.id);
    res.status(204).end();
}

module.exports = { list, get, create, update, archive, reactivate, remove };

