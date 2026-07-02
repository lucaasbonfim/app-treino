const db = require('../db/connection');

// Treinos (blocos) atribuídos a cada dia, já com os dados do treino vinculado
// (título/ícone/status) para o serviço ignorar arquivados.
function findDayWorkouts(userId, connection = db) {
    return connection('schedule_day_workouts as s')
        .join('workouts as w', 'w.id', 's.workout_id')
        .where({ 's.user_id': userId })
        .select(
            's.day_of_week',
            's.workout_id',
            's.sort_order',
            'w.title as workout_title',
            'w.icon as workout_icon',
            'w.status as workout_status',
        )
        .orderBy([
            { column: 's.day_of_week', order: 'asc' },
            { column: 's.sort_order', order: 'asc' },
            { column: 's.workout_id', order: 'asc' },
        ]);
}

async function findRestDays(userId, connection = db) {
    const rows = await connection('schedule_rest_days')
        .where({ user_id: userId })
        .select('day_of_week');
    return rows.map((row) => row.day_of_week);
}

// Treinos ativos com o dia da semana definido no próprio treino. Base
// ("fallback") para a agenda quando o usuário ainda não configurou o dia.
function findActiveWorkoutsForFallback(userId, connection = db) {
    return connection('workouts')
        .where({ user_id: userId, status: 'active' })
        .select('id', 'title', 'icon', 'day_of_week')
        .orderBy([
            { column: 'day_of_week', order: 'asc' },
            { column: 'created_at', order: 'asc' },
        ]);
}

// Substitui a configuração de um dia de forma atômica: descanso OU uma lista de
// treinos. Descanso e treinos são mutuamente exclusivos.
function setDay(userId, dayOfWeek, workoutIds, isRest, connection = db) {
    return connection.transaction(async (trx) => {
        await trx('schedule_day_workouts')
            .where({ user_id: userId, day_of_week: dayOfWeek })
            .del();
        await trx('schedule_rest_days')
            .where({ user_id: userId, day_of_week: dayOfWeek })
            .del();

        if (isRest) {
            await trx('schedule_rest_days').insert({ user_id: userId, day_of_week: dayOfWeek });
            return;
        }

        if (workoutIds.length) {
            await trx('schedule_day_workouts').insert(workoutIds.map((workoutId, index) => ({
                user_id: userId,
                day_of_week: dayOfWeek,
                workout_id: workoutId,
                sort_order: index,
            })));
        }
    });
}

function clearDay(userId, dayOfWeek, connection = db) {
    return connection.transaction(async (trx) => {
        await trx('schedule_day_workouts')
            .where({ user_id: userId, day_of_week: dayOfWeek })
            .del();
        await trx('schedule_rest_days')
            .where({ user_id: userId, day_of_week: dayOfWeek })
            .del();
    });
}

// Define exatamente em quais dias um treino aparece (visão "por treino").
// Não mexe nos outros treinos dos dias; ao adicionar num dia de descanso,
// remove a marca de descanso.
function setWorkoutDays(userId, workoutId, days, connection = db) {
    return connection.transaction(async (trx) => {
        await trx('schedule_day_workouts')
            .where({ user_id: userId, workout_id: workoutId })
            .del();

        if (!days.length) return;

        await trx('schedule_rest_days')
            .where({ user_id: userId })
            .whereIn('day_of_week', days)
            .del();

        // Próxima posição em cada dia (após os treinos que já estão nele).
        const maxRows = await trx('schedule_day_workouts')
            .where({ user_id: userId })
            .whereIn('day_of_week', days)
            .select('day_of_week')
            .max('sort_order as max')
            .groupBy('day_of_week');
        const maxByDay = new Map(maxRows.map((row) => [row.day_of_week, Number(row.max)]));

        await trx('schedule_day_workouts').insert(days.map((day) => ({
            user_id: userId,
            day_of_week: day,
            workout_id: workoutId,
            sort_order: maxByDay.has(day) ? maxByDay.get(day) + 1 : 0,
        })));
    });
}

// Remove os vínculos de um treino na agenda (usado ao arquivar um treino).
function detachWorkout(userId, workoutId, connection = db) {
    return connection('schedule_day_workouts')
        .where({ user_id: userId, workout_id: workoutId })
        .del();
}

// Sessão concluída hoje que corresponde ao dia: ou uma sessão "do dia"
// (workout_id nulo) ou uma sessão de um dos blocos do dia. start/end são
// instantes (Date) do intervalo [meia-noite local, meia-noite local seguinte).
function findCompletedDaySession(userId, workoutIds, start, end, connection = db) {
    return connection('workout_sessions')
        .where({ user_id: userId, status: 'completed' })
        .andWhere('finished_at', '>=', start)
        .andWhere('finished_at', '<', end)
        .andWhere((builder) => {
            builder.whereNull('workout_id');
            if (workoutIds.length) builder.orWhereIn('workout_id', workoutIds);
        })
        .orderBy('finished_at', 'desc')
        .select('id', 'finished_at')
        .first();
}

module.exports = {
    findDayWorkouts,
    findRestDays,
    findActiveWorkoutsForFallback,
    setDay,
    clearDay,
    setWorkoutDays,
    detachWorkout,
    findCompletedDaySession,
};
