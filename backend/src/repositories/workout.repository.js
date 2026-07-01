const db = require('../db/connection');

const workoutFields = [
    'id', 'user_id', 'title', 'icon', 'day_of_week', 'notes',
    'status', 'archived_at', 'reactivated_at', 'created_at', 'updated_at',
];

async function hydrate(workouts) {
    if (!workouts.length) return [];

    const workoutIds = workouts.map(({ id }) => id);
    const groups = await db('workout_muscle_groups')
        .whereIn('workout_id', workoutIds)
        .orderBy([{ column: 'sort_order', order: 'asc' }, { column: 'id', order: 'asc' }]);
    const groupIds = groups.map(({ id }) => id);
    const exercises = groupIds.length
        ? await db('workout_exercises')
            .whereIn('muscle_group_id', groupIds)
            .orderBy([{ column: 'sort_order', order: 'asc' }, { column: 'id', order: 'asc' }])
        : [];

    const exercisesByGroup = new Map();
    for (const exercise of exercises) {
        const current = exercisesByGroup.get(exercise.muscle_group_id) || [];
        current.push(exercise);
        exercisesByGroup.set(exercise.muscle_group_id, current);
    }

    const groupsByWorkout = new Map();
    for (const group of groups) {
        const current = groupsByWorkout.get(group.workout_id) || [];
        current.push({
            ...group,
            exercises: exercisesByGroup.get(group.id) || [],
        });
        groupsByWorkout.set(group.workout_id, current);
    }

    return workouts.map((workout) => ({
        ...workout,
        muscle_groups: groupsByWorkout.get(workout.id) || [],
    }));
}

async function findAllByUser(userId, status) {
    const query = db('workouts')
        .where({ user_id: userId })
        .select(workoutFields);

    if (status) query.andWhere({ status });

    const workouts = await query.orderBy([
        { column: 'day_of_week', order: 'asc' },
        { column: 'created_at', order: 'asc' },
    ]);

    return hydrate(workouts);
}

async function findByIdForUser(id, userId) {
    const workout = await db('workouts')
        .where({ id, user_id: userId })
        .select(workoutFields)
        .first();
    if (!workout) return null;

    const [hydrated] = await hydrate([workout]);
    return hydrated;
}

async function create(data) {
    const [workout] = await db('workouts').insert(data).returning(workoutFields);
    return workout;
}

async function updateForUser(id, userId, data) {
    const [workout] = await db('workouts')
        .where({ id, user_id: userId })
        .update({ ...data, updated_at: db.fn.now() })
        .returning(workoutFields);
    return workout;
}

function removeForUser(id, userId) {
    return db('workouts').where({ id, user_id: userId }).del();
}

function now() {
    return db.fn.now();
}

module.exports = {
    findAllByUser,
    findByIdForUser,
    create,
    updateForUser,
    removeForUser,
    now,
};
