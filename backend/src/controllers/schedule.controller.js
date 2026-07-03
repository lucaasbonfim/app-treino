const service = require('../services/schedule.service');
const workoutSessionService = require('../services/workoutSession.service');

async function list(req, res) {
    res.json(await service.list(req.user.id));
}

async function today(req, res) {
    res.json(await service.today(req.user.id));
}

async function setDay(req, res) {
    res.json(await service.setDay(req.user.id, req.params.dayOfWeek, req.body));
}

async function removeDay(req, res) {
    res.json(await service.removeDay(req.user.id, req.params.dayOfWeek));
}

async function setWorkoutDays(req, res) {
    res.json(await service.setWorkoutDays(req.user.id, req.params.workoutId, req.body));
}

// Inicia o treino do dia (junta os blocos do dia numa sessão só).
async function startDay(req, res) {
    const plan = await service.resolveStartPlan(req.user.id, req.params.dayOfWeek);
    const session = await workoutSessionService.startForWorkouts(
        req.user.id,
        plan.workoutIds,
        plan.name,
    );
    res.status(session.resumed ? 200 : 201).json(session);
}

module.exports = { list, today, setDay, removeDay, setWorkoutDays, startDay };
