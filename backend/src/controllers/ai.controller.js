const service = require('../services/workoutImport.service');

function status(req, res) {
    res.json(service.status());
}

async function previewWorkoutPlan(req, res) {
    res.json(await service.preview(req.body, req.user.id));
}

async function importWorkoutPlan(req, res) {
    res.status(201).json(await service.confirm(req.body, req.user.id));
}

module.exports = { status, previewWorkoutPlan, importWorkoutPlan };
