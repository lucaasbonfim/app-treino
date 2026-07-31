const repository = require('../repositories/workout.repository');
const groupRepository = require('../repositories/muscleGroup.repository');
const scheduleRepository = require('../repositories/schedule.repository');
const { requiredText, optionalText, integer, id } = require('../utils/validation');
const { badRequest, notFound } = require('../utils/httpError');
const { WORKOUT_ICON_SET, DEFAULT_WORKOUT_ICON } = require('../utils/workoutOptions');

function validate(payload) {
    const icon = String(payload.icon || DEFAULT_WORKOUT_ICON);
    if (!WORKOUT_ICON_SET.has(icon)) throw badRequest('Selecione um ícone válido para o treino.');

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
    const data = validate(payload);
    const workout = await repository.create({ ...data, user_id: userId });
    // Toda ficha nasce com uma seção default (invisível) para os exercícios
    // soltos, evitando o passo "crie um grupo antes de adicionar exercícios".
    await groupRepository.create({
        workout_id: workout.id,
        name: data.title,
        sort_order: 0,
        is_default: true,
    });
    return get(workout.id, userId);
}

async function update(workoutId, payload, userId) {
    const targetId = id(workoutId);
    const current = await repository.findByIdForUser(targetId, userId);
    if (!current) throw notFound('Treino não encontrado.');
    if (current.status === 'archived') {
        throw badRequest('Este treino está arquivado. Reative-o para editar.');
    }

    const data = validate(payload);
    const workout = await repository.updateForUser(targetId, userId, data);
    if (!workout) throw notFound('Treino não encontrado.');
    // A seção default acompanha o título do treino.
    await groupRepository.renameDefault(targetId, data.title);
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
    // Um treino arquivado não pode ficar vinculado à agenda semanal.
    await scheduleRepository.detachWorkout(userId, targetId);
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
