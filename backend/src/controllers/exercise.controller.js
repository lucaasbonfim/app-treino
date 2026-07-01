const service = require('../services/exercise.service');

async function create(req, res) {
    res.status(201).json(await service.create(req.params.muscleGroupId, req.body, req.user.id));
}

async function createFromLibrary(req, res) {
    res.status(201).json(await service.createFromLibrary(
        req.params.muscleGroupId,
        req.body,
        req.user.id,
    ));
}

async function update(req, res) {
    res.json(await service.update(req.params.id, req.body, req.user.id));
}

async function remove(req, res) {
    await service.remove(req.params.id, req.user.id);
    res.status(204).end();
}

module.exports = { create, createFromLibrary, update, remove };

