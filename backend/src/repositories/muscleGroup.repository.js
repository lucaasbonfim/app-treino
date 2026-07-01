const db = require('../db/connection');

const fields = [
    'workout_muscle_groups.id',
    'workout_muscle_groups.workout_id',
    'workout_muscle_groups.name',
    'workout_muscle_groups.sort_order',
    'workout_muscle_groups.created_at',
    'workout_muscle_groups.updated_at',
];

function findForUser(id, userId) {
    return db('workout_muscle_groups')
        .join('workouts', 'workouts.id', 'workout_muscle_groups.workout_id')
        .where({ 'workout_muscle_groups.id': id, 'workouts.user_id': userId })
        .select(fields)
        .first();
}

async function nextOrder(workoutId) {
    const result = await db('workout_muscle_groups')
        .where({ workout_id: workoutId })
        .max('sort_order as max')
        .first();
    return Number(result?.max ?? -1) + 1;
}

async function create(data) {
    const [group] = await db('workout_muscle_groups').insert(data).returning('*');
    return { ...group, exercises: [] };
}

async function updateForUser(id, userId, data) {
    const owned = await findForUser(id, userId);
    if (!owned) return null;

    const [group] = await db('workout_muscle_groups')
        .where({ id })
        .update({ ...data, updated_at: db.fn.now() })
        .returning('*');
    return group;
}

async function removeForUser(id, userId) {
    const owned = await findForUser(id, userId);
    if (!owned) return 0;
    return db('workout_muscle_groups').where({ id }).del();
}

module.exports = { findForUser, nextOrder, create, updateForUser, removeForUser };

