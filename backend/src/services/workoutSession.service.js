const db = require('../db/connection');
const repository = require('../repositories/workoutSession.repository');
const workoutRepository = require('../repositories/workout.repository');
const progressService = require('./progress.service');
const {
    optionalText,
    integer,
    decimal,
    id,
} = require('../utils/validation');
const { badRequest, notFound } = require('../utils/httpError');

function performanceData(payload) {
    const data = {
        performed_sets: integer(payload.performed_sets, 'Séries realizadas', {
            min: 1,
            max: 100,
            optional: true,
        }),
        performed_reps: optionalText(payload.performed_reps, 'Repetições realizadas', 30),
        performed_weight: decimal(payload.performed_weight, 'Carga realizada', {
            min: 0,
            max: 999999.99,
            optional: true,
        }),
        notes: optionalText(payload.notes, 'Observações do exercício', 1000),
    };

    if (typeof payload.completed !== 'boolean') {
        throw badRequest('O estado de conclusão do exercício é inválido.');
    }
    data.completed = payload.completed;
    return data;
}

function setPerformanceData(payload) {
    const data = {
        performed_reps: optionalText(payload.performed_reps, 'Repetições realizadas', 30),
        performed_weight: decimal(payload.performed_weight, 'Carga realizada', {
            min: 0,
            max: 999999.99,
            optional: true,
        }),
        notes: optionalText(payload.notes, 'Observação da série', 500),
    };

    if (typeof payload.completed !== 'boolean') {
        throw badRequest('O estado de conclusão da série é inválido.');
    }
    data.completed = payload.completed;
    return data;
}

// Monta os snapshots de exercícios a partir de um ou mais treinos, na ordem.
// A seção default de cada treino tem nome = título, então em uma sessão
// combinada os cabeçalhos ficam "Peito", "Ombro" etc.
function buildSnapshots(workouts) {
    const snapshots = [];
    let sortOrder = 0;
    for (const workout of workouts) {
        for (const group of workout.muscle_groups) {
            for (const exercise of group.exercises) {
                snapshots.push({
                    workout_exercise_id: exercise.id,
                    exercise_library_id: exercise.exercise_library_id || null,
                    muscle_group_name: group.name,
                    exercise_name: exercise.name,
                    planned_sets: exercise.sets,
                    planned_reps: exercise.reps,
                    planned_weight: exercise.weight,
                    rest_time_seconds: exercise.rest_time_seconds || 60,
                    performed_sets: exercise.sets,
                    performed_reps: exercise.reps,
                    performed_weight: exercise.weight,
                    completed: false,
                    notes: exercise.notes,
                    sort_order: sortOrder,
                });
                sortOrder += 1;
            }
        }
    }
    return snapshots;
}

function persistSession(userId, sessionData, snapshots) {
    return db.transaction(async (transaction) => {
        // Serializa o início por usuário. O índice único continua sendo a
        // garantia definitiva, inclusive para outros clientes da API.
        await transaction.raw(
            'SELECT pg_advisory_xact_lock(?, ?)',
            [20260702, Number(userId)],
        );

        const current = await repository.findCurrent(userId, transaction);
        if (current) {
            return {
                ...(await attachLastPerformances(userId, current, transaction)),
                resumed: true,
            };
        }

        const lastPerformances = await repository.findLastPerformances(
            userId,
            snapshots,
            transaction,
        );

        const session = await repository.create({
            user_id: userId,
            workout_id: sessionData.workoutId,
            workout_name: sessionData.workoutName,
            status: 'in_progress',
            notes: null,
        }, transaction);

        const createdExercises = await repository.createExercises(
            snapshots.map((exercise) => ({
                ...exercise,
                workout_session_id: session.id,
                last_performed_at: lastPerformances.get(
                    repository.performanceKey(exercise),
                )?.performed_at || null,
            })),
            transaction,
        );

        const sets = [];
        for (const exercise of createdExercises) {
            const setCount = Math.max(1, Number(exercise.planned_sets) || 1);
            const previousSets = lastPerformances.get(
                repository.performanceKey(exercise),
            )?.sets || [];
            const previousByNumber = new Map(
                previousSets.map((set) => [Number(set.set_number), set]),
            );
            for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
                const previous = previousByNumber.get(setNumber);
                sets.push({
                    workout_session_id: session.id,
                    workout_session_exercise_id: exercise.id,
                    workout_exercise_id: exercise.workout_exercise_id,
                    set_number: setNumber,
                    planned_reps: exercise.planned_reps,
                    planned_weight: exercise.planned_weight,
                    performed_reps: previous?.performed_reps ?? exercise.planned_reps,
                    performed_weight: previous?.performed_weight ?? exercise.planned_weight,
                    previous_performed_reps: previous?.performed_reps ?? null,
                    previous_performed_weight: previous?.performed_weight ?? null,
                    has_previous_performance: Boolean(previous),
                    completed: false,
                });
            }
        }
        await repository.createSets(sets, transaction);

        return repository.findByIdForUser(session.id, userId, transaction);
    });
}

async function attachLastPerformances(userId, session, connection = db) {
    if (!session || session.status !== 'in_progress') return session;
    const missing = session.exercises.filter((exercise) => !exercise.last_performance);
    if (!missing.length) return session;

    const lastPerformances = await repository.findLastPerformances(
        userId,
        missing,
        connection,
    );
    return {
        ...session,
        exercises: session.exercises.map((exercise) => ({
            ...exercise,
            last_performance: exercise.last_performance
                || lastPerformances.get(repository.performanceKey(exercise))
                || null,
        })),
    };
}

async function start(workoutIdValue, userId) {
    const workoutId = id(workoutIdValue, 'ID do treino');
    const current = await repository.findCurrent(userId);
    if (current) {
        return { ...(await attachLastPerformances(userId, current)), resumed: true };
    }

    const workout = await workoutRepository.findByIdForUser(workoutId, userId);
    if (!workout) throw notFound('Treino não encontrado.');
    if (workout.status === 'archived') {
        throw badRequest('Este treino está arquivado. Reative-o para iniciar.');
    }

    const snapshots = buildSnapshots([workout]);
    if (!snapshots.length) {
        throw badRequest('Adicione pelo menos um exercício antes de iniciar o treino.');
    }

    return persistSession(userId, { workoutId, workoutName: workout.title }, snapshots);
}

// Inicia o treino do dia. Um único bloco cai no fluxo normal. Vários blocos
// viram uma sessão combinada (workout_id nulo) com todos os exercícios.
async function startForWorkouts(userId, workoutIds, name) {
    const ids = [...new Set((workoutIds || []).map((value) => id(value, 'ID do treino')))];
    if (!ids.length) throw badRequest('Nenhum treino definido para iniciar.');

    const current = await repository.findCurrent(userId);
    if (current) {
        return { ...(await attachLastPerformances(userId, current)), resumed: true };
    }
    if (ids.length === 1) return start(ids[0], userId);

    const workouts = [];
    for (const workoutId of ids) {
        const workout = await workoutRepository.findByIdForUser(workoutId, userId);
        if (!workout) throw notFound('Treino não encontrado.');
        if (workout.status === 'archived') {
            throw badRequest('Há um treino arquivado neste dia. Ajuste a agenda antes de iniciar.');
        }
        workouts.push(workout);
    }

    const snapshots = buildSnapshots(workouts);
    if (!snapshots.length) {
        throw badRequest('Adicione exercícios aos treinos do dia antes de iniciar.');
    }

    const workoutName = String(name || workouts.map((w) => w.title).join(' + ')).slice(0, 120);
    return persistSession(userId, { workoutId: null, workoutName }, snapshots);
}

async function get(sessionIdValue, userId) {
    const session = await repository.findByIdForUser(
        id(sessionIdValue, 'ID da sessão'),
        userId,
    );
    if (!session) throw notFound('Sessão de treino não encontrada.');
    return attachLastPerformances(userId, session);
}

async function current(userId) {
    return attachLastPerformances(userId, await repository.findCurrent(userId));
}

async function lastPerformance(sessionIdValue, userId) {
    const session = await get(sessionIdValue, userId);
    return session.exercises.map((exercise) => ({
        exercise_id: exercise.id,
        workout_exercise_id: exercise.workout_exercise_id,
        exercise_library_id: exercise.exercise_library_id,
        exercise_name: exercise.exercise_name,
        last_performed_at: exercise.last_performance?.performed_at || null,
        sets: exercise.last_performance?.sets || [],
    }));
}

function history(userId) {
    return repository.findHistory(userId);
}

function summary(userId) {
    return repository.getSummary(userId);
}

function numeric(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

// Consolida cada execução de um exercício (a sessão em que ele aparece com
// pelo menos uma série concluída), reaproveitando os dados já hidratados.
function executionFromExercise(exercise, session) {
    const completedSets = (exercise.sets || []).filter((set) => set.completed);
    if (!completedSets.length) return null;

    const weights = completedSets
        .map((set) => numeric(set.performed_weight))
        .filter((weight) => weight !== null);
    const lastSet = completedSets[completedSets.length - 1];

    return {
        weight: weights.length ? Math.max(...weights) : numeric(exercise.performed_weight),
        reps: lastSet.performed_reps || exercise.performed_reps || null,
        sets_done: completedSets.length,
        done_at: session.finished_at || session.started_at,
    };
}

async function evolution(userId) {
    // findHistory já retorna as sessões concluídas ordenadas da mais recente
    // para a mais antiga, com exercícios e séries hidratados.
    const sessions = await repository.findHistory(userId);
    const byExercise = new Map();

    for (const session of sessions) {
        for (const exercise of session.exercises) {
            const execution = executionFromExercise(exercise, session);
            if (!execution) continue;

            const key = `${exercise.muscle_group_name}::${exercise.exercise_name}`;
            const entry = byExercise.get(key) || {
                exercise_name: exercise.exercise_name,
                muscle_group_name: exercise.muscle_group_name,
                executions: [],
            };
            entry.executions.push(execution);
            byExercise.set(key, entry);
        }
    }

    const items = [...byExercise.values()].map((entry) => {
        // executions estão da mais recente para a mais antiga.
        const [last, previous] = entry.executions;
        const weights = entry.executions
            .map((execution) => execution.weight)
            .filter((weight) => weight !== null && weight !== undefined);
        const delta = (last?.weight != null && previous?.weight != null)
            ? Number((last.weight - previous.weight).toFixed(2))
            : null;

        return {
            exercise_name: entry.exercise_name,
            muscle_group_name: entry.muscle_group_name,
            times_done: entry.executions.length,
            last_weight: last?.weight ?? null,
            last_reps: last?.reps ?? null,
            last_done_at: last?.done_at ?? null,
            previous_weight: previous?.weight ?? null,
            previous_reps: previous?.reps ?? null,
            max_weight: weights.length ? Math.max(...weights) : null,
            delta,
        };
    });

    items.sort((a, b) => new Date(b.last_done_at) - new Date(a.last_done_at));
    return items;
}

async function update(sessionIdValue, payload, userId) {
    const sessionId = id(sessionIdValue, 'ID da sessão');
    const session = await repository.findByIdForUser(sessionId, userId);
    if (!session) throw notFound('Sessão de treino não encontrada.');
    if (session.status !== 'in_progress') {
        throw badRequest('Esta sessão de treino não está mais em andamento.');
    }

    await repository.updateForUser(sessionId, userId, {
        notes: optionalText(payload.notes, 'Observações da sessão', 2000),
    });
    return get(sessionId, userId);
}

async function updateExercise(sessionIdValue, exerciseIdValue, payload, userId) {
    const sessionId = id(sessionIdValue, 'ID da sessão');
    const exerciseId = id(exerciseIdValue, 'ID do exercício da sessão');
    const result = await repository.updateExerciseForUser(
        exerciseId,
        sessionId,
        userId,
        performanceData(payload),
    );
    if (!result) throw notFound('Exercício da sessão não encontrado.');
    if (result.sessionStatus !== 'in_progress') {
        throw badRequest('Esta sessão de treino não está mais em andamento.');
    }
    return result.exercise;
}

async function updateSet(sessionIdValue, setIdValue, payload, userId) {
    const sessionId = id(sessionIdValue, 'ID da sessão');
    const setId = id(setIdValue, 'ID da série');
    const data = setPerformanceData(payload);

    return db.transaction(async (transaction) => {
        const owned = await repository.findSetForUser(setId, sessionId, userId, transaction);
        if (!owned) throw notFound('Série da sessão não encontrada.');
        if (owned.session_status !== 'in_progress') {
            throw badRequest('Esta sessão de treino não está mais em andamento.');
        }

        if (data.completed && !owned.completed) {
            data.completed_at = transaction.fn.now();
        } else if (!data.completed && owned.completed) {
            data.completed_at = null;
        }

        await repository.updateSet(setId, data, transaction);
        await repository.syncExerciseFromSets(
            owned.workout_session_exercise_id,
            sessionId,
            transaction,
        );

        return repository.findByIdForUser(sessionId, userId, transaction);
    });
}

async function finish(sessionIdValue, payload = {}, userId) {
    const sessionId = id(sessionIdValue, 'ID da sessão');
    const exercises = Array.isArray(payload.exercises) ? payload.exercises : [];
    return db.transaction(async (transaction) => {
        const currentSession = await repository.findByIdForUserForUpdate(
            sessionId,
            userId,
            transaction,
        );
        if (!currentSession) throw notFound('Sessão de treino não encontrada.');
        if (currentSession.status === 'completed') return currentSession;
        if (currentSession.status !== 'in_progress') {
            throw badRequest('Um treino abandonado não pode ser finalizado.');
        }

        for (const exercise of exercises) {
            const result = await repository.updateExerciseForUser(
                id(exercise.id, 'ID do exercício da sessão'),
                sessionId,
                userId,
                performanceData(exercise),
                transaction,
            );
            if (!result) throw notFound('Exercício da sessão não encontrado.');
        }

        await repository.updateForUser(sessionId, userId, {
            status: 'completed',
            finished_at: transaction.fn.now(),
            notes: optionalText(payload.notes, 'Observações da sessão', 2000),
        }, transaction);

        // Check-in automático do dia (não duplica se já existir um check-in hoje).
        await progressService.checkinFromSession(userId, sessionId, transaction);

        return repository.findByIdForUser(sessionId, userId, transaction);
    });
}

async function abandon(sessionIdValue, userId) {
    const sessionId = id(sessionIdValue, 'ID da sessão');

    return db.transaction(async (transaction) => {
        const currentSession = await repository.findByIdForUserForUpdate(
            sessionId,
            userId,
            transaction,
        );
        if (!currentSession) throw notFound('Sessão de treino não encontrada.');
        if (currentSession.status === 'abandoned') return currentSession;
        if (currentSession.status === 'completed') {
            throw badRequest('Um treino finalizado não pode ser abandonado.');
        }

        await repository.updateForUser(sessionId, userId, {
            status: 'abandoned',
            finished_at: null,
            abandoned_at: transaction.fn.now(),
        }, transaction);

        return repository.findByIdForUser(sessionId, userId, transaction);
    });
}

module.exports = {
    start,
    startForWorkouts,
    get,
    current,
    lastPerformance,
    history,
    summary,
    evolution,
    update,
    updateExercise,
    updateSet,
    finish,
    abandon,
};
