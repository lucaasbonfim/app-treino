const repository = require('../repositories/workout.repository');
const { requiredText, optionalText, integer, id } = require('../utils/validation');
const { badRequest, notFound } = require('../utils/httpError');

const workoutIcons = new Set([
    'fitness_center',
    'directions_run',
    'sports_gymnastics',
    'self_improvement',
    'sports_martial_arts',
    'hiking',
    'favorite',
    'local_fire_department',
]);

function validate(payload) {
    const icon = String(payload.icon || 'fitness_center');
    if (!workoutIcons.has(icon)) throw badRequest('Selecione um ícone válido para o treino.');

    return {
        title: requiredText(payload.title, 'Nome do treino', 120),
        icon,
        day_of_week: integer(payload.day_of_week, 'Dia da semana', { min: 0, max: 6 }),
        notes: optionalText(payload.notes, 'Observações', 2000),
    };
}

const WORKOUT_STATUSES = new Set(['active', 'archived']);

function normalizeStatus(value) {
    if (value === undefined || value === null || value === '') return 'active';
    const status = String(value).trim().toLowerCase();
    if (!WORKOUT_STATUSES.has(status)) throw badRequest('Status de treino inválido.');
    return status;
}

function list(userId, status) {
    return repository.findAllByUser(userId, normalizeStatus(status));
}

async function get(workoutId, userId) {
    const workout = await repository.findByIdForUser(id(workoutId), userId);
    if (!workout) throw notFound('Treino não encontrado.');
    return workout;
}

async function create(payload, userId) {
    const workout = await repository.create({ ...validate(payload), user_id: userId });
    return { ...workout, muscle_groups: [] };
}

async function update(workoutId, payload, userId) {
    const targetId = id(workoutId);
    const current = await repository.findByIdForUser(targetId, userId);
    if (!current) throw notFound('Treino não encontrado.');
    if (current.status === 'archived') {
        throw badRequest('Este treino está arquivado. Reative-o para editar.');
    }

    const workout = await repository.updateForUser(targetId, userId, validate(payload));
    if (!workout) throw notFound('Treino não encontrado.');
    return get(workout.id, userId);
}

async function archive(workoutId, userId) {
    const targetId = id(workoutId);
    const current = await repository.findByIdForUser(targetId, userId);
    if (!current) throw notFound('Treino não encontrado.');
    if (current.status === 'archived') return current;

    await repository.updateForUser(targetId, userId, {
        status: 'archived',
        archived_at: repository.now(),
    });
    return get(targetId, userId);
}

async function reactivate(workoutId, userId) {
    const targetId = id(workoutId);
    const current = await repository.findByIdForUser(targetId, userId);
    if (!current) throw notFound('Treino não encontrado.');
    if (current.status === 'active') return current;

    await repository.updateForUser(targetId, userId, {
        status: 'active',
        archived_at: null,
        reactivated_at: repository.now(),
    });
    return get(targetId, userId);
}

async function remove(workoutId, userId) {
    const removed = await repository.removeForUser(id(workoutId), userId);
    if (!removed) throw notFound('Treino não encontrado.');
}

module.exports = { list, get, create, update, archive, reactivate, remove };
