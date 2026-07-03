const db = require('../db/connection');

const sessionFields = [
    'id',
    'user_id',
    'workout_id',
    'workout_name',
    'started_at',
    'finished_at',
    'abandoned_at',
    'status',
    'notes',
    'created_at',
    'updated_at',
];

async function hydrate(sessions, connection = db) {
    if (!sessions.length) return [];

    const sessionIds = sessions.map(({ id }) => id);
    const exercises = await connection('workout_session_exercises')
        .whereIn('workout_session_id', sessionIds)
        .orderBy([
            { column: 'workout_session_id', order: 'asc' },
            { column: 'sort_order', order: 'asc' },
            { column: 'id', order: 'asc' },
        ]);

    const exerciseIds = exercises.map(({ id }) => id);
    const sets = exerciseIds.length
        ? await connection('workout_session_sets')
            .whereIn('workout_session_exercise_id', exerciseIds)
            .orderBy([
                { column: 'workout_session_exercise_id', order: 'asc' },
                { column: 'set_number', order: 'asc' },
                { column: 'id', order: 'asc' },
            ])
        : [];

    const setsByExercise = new Map();
    for (const set of sets) {
        const current = setsByExercise.get(set.workout_session_exercise_id) || [];
        current.push(set);
        setsByExercise.set(set.workout_session_exercise_id, current);
    }

    const bySession = new Map();
    for (const exercise of exercises) {
        const current = bySession.get(exercise.workout_session_id) || [];
        current.push({
            ...exercise,
            sets: setsByExercise.get(exercise.id) || [],
        });
        bySession.set(exercise.workout_session_id, current);
    }

    // Status atual do treino de origem (para o histórico marcar treinos arquivados).
    const workoutIds = [...new Set(sessions.map((s) => s.workout_id).filter(Boolean))];
    const workoutRows = workoutIds.length
        ? await connection('workouts').whereIn('id', workoutIds).select('id', 'status')
        : [];
    const statusByWorkout = new Map(workoutRows.map((row) => [row.id, row.status]));

    return sessions.map((session) => ({
        ...session,
        workout_status: session.workout_id ? statusByWorkout.get(session.workout_id) || null : null,
        exercises: bySession.get(session.id) || [],
    }));
}

async function findCurrent(userId, connection = db) {
    const session = await connection('workout_sessions')
        .where({ user_id: userId, status: 'in_progress' })
        .select(sessionFields)
        .orderBy('started_at', 'desc')
        .orderBy('id', 'desc')
        .first();
    if (!session) return null;
    const [hydrated] = await hydrate([session], connection);
    return hydrated;
}

async function findByIdForUser(id, userId, connection = db) {
    const session = await connection('workout_sessions')
        .where({ id, user_id: userId })
        .select(sessionFields)
        .first();
    if (!session) return null;
    const [hydrated] = await hydrate([session], connection);
    return hydrated;
}

async function findByIdForUserForUpdate(id, userId, connection = db) {
    const session = await connection('workout_sessions')
        .where({ id, user_id: userId })
        .select(sessionFields)
        .forUpdate()
        .first();
    if (!session) return null;
    const [hydrated] = await hydrate([session], connection);
    return hydrated;
}

async function findHistory(userId, connection = db) {
    const sessions = await connection('workout_sessions')
        .where({ user_id: userId, status: 'completed' })
        .select(sessionFields)
        .orderBy('finished_at', 'desc')
        .limit(100);
    return hydrate(sessions, connection);
}

async function getSummary(userId, connection = db) {
    const [sessions, sets, exercises, last] = await Promise.all([
        connection('workout_sessions')
            .where({ user_id: userId, status: 'completed' })
            .count({ count: '*' })
            .first(),
        connection('workout_session_sets as s')
            .join('workout_sessions as ws', 'ws.id', 's.workout_session_id')
            .where({ 'ws.user_id': userId, 'ws.status': 'completed', 's.completed': true })
            .count({ count: '*' })
            .first(),
        connection('workout_session_exercises as e')
            .join('workout_sessions as ws', 'ws.id', 'e.workout_session_id')
            .where({ 'ws.user_id': userId, 'ws.status': 'completed', 'e.completed': true })
            .count({ count: '*' })
            .first(),
        connection('workout_sessions')
            .where({ user_id: userId, status: 'completed' })
            .orderBy('finished_at', 'desc')
            .select('workout_name', 'finished_at')
            .first(),
    ]);

    return {
        workouts_done: Number(sessions?.count) || 0,
        sets_completed: Number(sets?.count) || 0,
        exercises_completed: Number(exercises?.count) || 0,
        last_workout_name: last?.workout_name || null,
        last_finished_at: last?.finished_at || null,
    };
}

async function create(data, connection = db) {
    const [session] = await connection('workout_sessions')
        .insert(data)
        .returning(sessionFields);
    return session;
}

function createExercises(exercises, connection = db) {
    if (!exercises.length) return [];
    return connection('workout_session_exercises').insert(exercises).returning('*');
}

function createSets(sets, connection = db) {
    if (!sets.length) return [];
    return connection('workout_session_sets').insert(sets).returning('*');
}

async function updateForUser(id, userId, data, connection = db) {
    const [session] = await connection('workout_sessions')
        .where({ id, user_id: userId })
        .update({ ...data, updated_at: connection.fn.now() })
        .returning(sessionFields);
    return session;
}

function findExerciseForUser(exerciseId, sessionId, userId, connection = db) {
    return connection('workout_session_exercises')
        .join(
            'workout_sessions',
            'workout_sessions.id',
            'workout_session_exercises.workout_session_id',
        )
        .where({
            'workout_session_exercises.id': exerciseId,
            'workout_session_exercises.workout_session_id': sessionId,
            'workout_sessions.user_id': userId,
        })
        .select('workout_session_exercises.*', 'workout_sessions.status as session_status')
        .first();
}

async function updateExerciseForUser(
    exerciseId,
    sessionId,
    userId,
    data,
    connection = db,
) {
    const owned = await findExerciseForUser(exerciseId, sessionId, userId, connection);
    if (!owned) return null;
    if (owned.session_status !== 'in_progress') {
        return { exercise: null, sessionStatus: owned.session_status };
    }

    const [exercise] = await connection('workout_session_exercises')
        .where({ id: exerciseId, workout_session_id: sessionId })
        .update({ ...data, updated_at: connection.fn.now() })
        .returning('*');
    return { exercise, sessionStatus: owned.session_status };
}

function findSetForUser(setId, sessionId, userId, connection = db) {
    return connection('workout_session_sets')
        .join(
            'workout_sessions',
            'workout_sessions.id',
            'workout_session_sets.workout_session_id',
        )
        .where({
            'workout_session_sets.id': setId,
            'workout_session_sets.workout_session_id': sessionId,
            'workout_sessions.user_id': userId,
        })
        .select('workout_session_sets.*', 'workout_sessions.status as session_status')
        .first();
}

async function updateSet(setId, data, connection = db) {
    const [set] = await connection('workout_session_sets')
        .where({ id: setId })
        .update({ ...data, updated_at: connection.fn.now() })
        .returning('*');
    return set;
}

function findSetsByExercise(sessionExerciseId, connection = db) {
    return connection('workout_session_sets')
        .where({ workout_session_exercise_id: sessionExerciseId })
        .orderBy('set_number', 'asc');
}

async function syncExerciseFromSets(sessionExerciseId, sessionId, connection = db) {
    const sets = await findSetsByExercise(sessionExerciseId, connection);
    const completedSets = sets.filter((set) => set.completed);
    const allCompleted = sets.length > 0 && completedSets.length === sets.length;
    const last = completedSets.length
        ? completedSets[completedSets.length - 1]
        : null;

    await connection('workout_session_exercises')
        .where({ id: sessionExerciseId, workout_session_id: sessionId })
        .update({
            performed_sets: completedSets.length || null,
            performed_reps: last ? last.performed_reps : null,
            performed_weight: last ? last.performed_weight : null,
            completed: allCompleted,
            updated_at: connection.fn.now(),
        });
}

module.exports = {
    findCurrent,
    findByIdForUser,
    findByIdForUserForUpdate,
    findHistory,
    getSummary,
    create,
    createExercises,
    createSets,
    updateForUser,
    updateExerciseForUser,
    findSetForUser,
    updateSet,
    findSetsByExercise,
    syncExerciseFromSets,
};
