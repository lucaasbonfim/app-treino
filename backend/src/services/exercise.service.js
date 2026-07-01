const exerciseRepository = require('../repositories/exercise.repository');
const groupRepository = require('../repositories/muscleGroup.repository');
const libraryRepository = require('../repositories/exerciseLibrary.repository');
const { requiredText, optionalText, integer, decimal, id } = require('../utils/validation');
const { badRequest, notFound } = require('../utils/httpError');

const REST_TIMES = new Set([30, 45, 60, 90, 120]);

function restTime(value) {
    const seconds = integer(value ?? 60, 'Tempo de descanso', { min: 30, max: 120 });
    if (!REST_TIMES.has(seconds)) {
        throw badRequest('Selecione um tempo de descanso válido.');
    }
    return seconds;
}

function validate(payload, includeOrder = true) {
    const result = {
        name: requiredText(payload.name, 'Exercício', 120),
        sets: integer(payload.sets, 'Séries', { min: 1, max: 100, optional: true }),
        reps: optionalText(payload.reps, 'Repetições', 30),
        weight: decimal(payload.weight, 'Carga', { min: 0, max: 999999.99, optional: true }),
        rest_time_seconds: restTime(payload.rest_time_seconds),
        notes: optionalText(payload.notes, 'Observações', 2000),
    };

    if (includeOrder && payload.sort_order !== undefined) {
        result.sort_order = integer(payload.sort_order, 'Ordem', { min: 0 });
    }
    return result;
}

async function create(groupIdValue, payload, userId) {
    const muscleGroupId = id(groupIdValue, 'ID do grupo');
    const group = await groupRepository.findForUser(muscleGroupId, userId);
    if (!group) throw notFound('Grupo muscular não encontrado.');

    const data = validate(payload);
    if (data.sort_order === undefined) {
        data.sort_order = await exerciseRepository.nextOrder(muscleGroupId);
    }

    return exerciseRepository.create({ ...data, muscle_group_id: muscleGroupId });
}

function pick(value, fallback) {
    return value === undefined || value === null || value === '' ? fallback : value;
}

async function createFromLibrary(groupIdValue, payload, userId) {
    const muscleGroupId = id(groupIdValue, 'ID do grupo');
    const group = await groupRepository.findForUser(muscleGroupId, userId);
    if (!group) throw notFound('Grupo muscular não encontrado.');

    const libraryId = id(payload.exercise_library_id, 'ID do exercício da biblioteca');
    const libraryExercise = await libraryRepository.findActiveById(libraryId);
    if (!libraryExercise) throw notFound('Exercício da biblioteca não encontrado.');

    // O nome sempre vem da biblioteca para manter a compatibilidade com o
    // histórico/evolução. As demais informações usam o padrão da biblioteca,
    // mas o usuário pode ajustar antes de salvar.
    const data = validate({
        name: libraryExercise.name,
        sets: pick(payload.sets, libraryExercise.default_sets),
        reps: pick(payload.reps, libraryExercise.default_reps),
        weight: payload.weight,
        rest_time_seconds: pick(payload.rest_time_seconds, libraryExercise.default_rest_time_seconds),
        notes: payload.notes,
    });
    data.exercise_library_id = libraryExercise.id;
    data.sort_order = await exerciseRepository.nextOrder(muscleGroupId);

    return exerciseRepository.create({ ...data, muscle_group_id: muscleGroupId });
}

async function update(exerciseIdValue, payload, userId) {
    const exerciseId = id(exerciseIdValue, 'ID do exercício');
    const exercise = await exerciseRepository.updateForUser(
        exerciseId,
        userId,
        validate(payload),
    );
    if (!exercise) throw notFound('Exercício não encontrado.');
    return exercise;
}

async function remove(exerciseIdValue, userId) {
    const removed = await exerciseRepository.removeForUser(
        id(exerciseIdValue, 'ID do exercício'),
        userId,
    );
    if (!removed) throw notFound('Exercício não encontrado.');
}

module.exports = { create, createFromLibrary, update, remove };
