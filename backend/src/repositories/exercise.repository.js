const db = require('../db/connection');

const fields = [
    'workout_exercises.id',
    'workout_exercises.muscle_group_id',
    'workout_exercises.name',
    'workout_exercises.sets',
    'workout_exercises.reps',
    'workout_exercises.weight',
    'workout_exercises.rest_time_seconds',
    'workout_exercises.notes',
    'workout_exercises.exercise_library_id',
    'workout_exercises.sort_order',
    'workout_exercises.created_at',
    'workout_exercises.updated_at',
];

function findForUser(id, userId) {
    return db('workout_exercises')
        .join(
            'workout_muscle_groups',
            'workout_muscle_groups.id',
            'workout_exercises.muscle_group_id',
        )
        .join('workouts', 'workouts.id', 'workout_muscle_groups.workout_id')
        .where({ 'workout_exercises.id': id, 'workouts.user_id': userId })
        .select(fields)
        .first();
}

async function nextOrder(muscleGroupId) {
    const result = await db('workout_exercises')
        .where({ muscle_group_id: muscleGroupId })
        .max('sort_order as max')
        .first();
    return Number(result?.max ?? -1) + 1;
}

async function create(data) {
    const [exercise] = await db('workout_exercises').insert(data).returning('*');
    return exercise;
}

async function updateForUser(id, userId, data) {
    const owned = await findForUser(id, userId);
    if (!owned) return null;

    const [exercise] = await db('workout_exercises')
        .where({ id })
        .update({ ...data, updated_at: db.fn.now() })
        .returning('*');
    return exercise;
}

async function removeForUser(id, userId) {
    const owned = await findForUser(id, userId);
    if (!owned) return 0;
    return db('workout_exercises').where({ id }).del();
}

module.exports = { findForUser, nextOrder, create, updateForUser, removeForUser };
