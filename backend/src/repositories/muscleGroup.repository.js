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

// A seção "default" (invisível) que segura os exercícios soltos de um treino.
function findDefaultByWorkout(workoutId, connection = db) {
    return connection('workout_muscle_groups')
        .where({ workout_id: workoutId, is_default: true })
        .first();
}

// Mantém o nome da seção default igual ao título do treino (usado no snapshot
// das sessões / evolução).
function renameDefault(workoutId, name, connection = db) {
    return connection('workout_muscle_groups')
        .where({ workout_id: workoutId, is_default: true })
        .update({ name: String(name).slice(0, 80), updated_at: connection.fn.now() });
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

module.exports = {
    findForUser,
    nextOrder,
    findDefaultByWorkout,
    renameDefault,
    create,
    updateForUser,
    removeForUser,
};

