const groupRepository = require('../repositories/muscleGroup.repository');
const workoutRepository = require('../repositories/workout.repository');
const { requiredText, integer, id } = require('../utils/validation');
const { notFound } = require('../utils/httpError');

async function create(workoutIdValue, payload, userId) {
    const workoutId = id(workoutIdValue, 'ID do treino');
    const workout = await workoutRepository.findByIdForUser(workoutId, userId);
    if (!workout) throw notFound('Treino não encontrado.');

    const sortOrder = payload.sort_order === undefined
        ? await groupRepository.nextOrder(workoutId)
        : integer(payload.sort_order, 'Ordem', { min: 0 });

    return groupRepository.create({
        workout_id: workoutId,
        name: requiredText(payload.name, 'Grupo muscular', 80),
        sort_order: sortOrder,
    });
}

async function update(groupIdValue, payload, userId) {
    const groupId = id(groupIdValue, 'ID do grupo');
    const data = {
        name: requiredText(payload.name, 'Grupo muscular', 80),
    };
    if (payload.sort_order !== undefined) {
        data.sort_order = integer(payload.sort_order, 'Ordem', { min: 0 });
    }

    const group = await groupRepository.updateForUser(groupId, userId, data);
    if (!group) throw notFound('Grupo muscular não encontrado.');
    return group;
}

async function remove(groupIdValue, userId) {
    const removed = await groupRepository.removeForUser(id(groupIdValue, 'ID do grupo'), userId);
    if (!removed) throw notFound('Grupo muscular não encontrado.');
}

module.exports = { create, update, remove };

