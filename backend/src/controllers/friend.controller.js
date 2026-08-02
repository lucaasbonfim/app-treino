const service = require('../services/friend.service');
const { id } = require('../utils/validation');

async function list(req, res) {
    res.json(await service.listFriends(req.user.id));
}

async function requests(req, res) {
    res.json(await service.listRequests(req.user.id));
}

async function search(req, res) {
    res.json(await service.searchByUsername(req.user.id, req.query.username));
}

async function sendRequest(req, res) {
    const result = await service.sendRequest(req.user.id, req.body);
    res.status(201).json(result);
}

async function respondRequest(req, res) {
    res.json(await service.respondRequest(req.user.id, id(req.params.id, 'Pedido'), req.body));
}

async function remove(req, res) {
    res.json(await service.removeFriend(req.user.id, id(req.params.userId, 'Usuário')));
}

async function ranking(req, res) {
    res.json(await service.monthlyRanking(req.user.id, req.query));
}

module.exports = { list, requests, search, sendRequest, respondRequest, remove, ranking };
