const service = require('../services/progress.service');

async function weeklySummary(req, res) {
    res.json(await service.weeklySummary(req.user.id));
}

async function monthlyCheckins(req, res) {
    res.json(await service.monthlyCheckins(req.user.id));
}

async function checkin(req, res) {
    const result = await service.createManualCheckin(req.user.id);
    res.status(result.created ? 201 : 200).json(result);
}

async function updateWeeklyGoal(req, res) {
    res.json(await service.updateWeeklyGoal(req.user.id, req.body));
}

module.exports = { weeklySummary, monthlyCheckins, checkin, updateWeeklyGoal };
