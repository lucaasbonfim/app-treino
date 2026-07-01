const service = require('../services/exerciseLibrary.service');

async function list(req, res) {
    res.json(await service.list(req.query));
}

async function groups(req, res) {
    res.json(await service.groups());
}

async function get(req, res) {
    res.json(await service.get(req.params.id));
}

module.exports = { list, groups, get };
