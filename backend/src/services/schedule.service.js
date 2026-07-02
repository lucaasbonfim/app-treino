const repository = require('../repositories/schedule.repository');
const { integer, id } = require('../utils/validation');
const { badRequest } = require('../utils/httpError');

// 0 = Domingo ... 6 = Sábado (mesma convenção de Date.getDay() e do front).
const WEEKDAYS = [
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
];

function todayDayOfWeek() {
    return new Date().getDay();
}

// Início e fim do dia de hoje como instantes (meia-noite local → meia-noite
// local seguinte). Comparar a coluna timestamptz com estes instantes independe
// do fuso da sessão do banco, mantendo o mesmo "hoje" usado nos check-ins.
function todayBounds() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
}

function toBlock(row) {
    return {
        id: row.workout_id ?? row.id,
        title: row.workout_title ?? row.title,
        icon: row.workout_icon ?? row.icon,
    };
}

// Monta a configuração de um dia.
// Precedência:
//   1. descanso explícito → descanso;
//   2. treinos escolhidos manualmente para o dia → esses blocos (source 'schedule');
//   3. treinos cujo próprio day_of_week é esse dia → herdados (source 'workout_day');
//   4. nada → dia vazio.
function resolveEntry(explicitRows, isRest, fallbackWorkouts, dayOfWeek, todayDow) {
    const meta = WEEKDAYS[dayOfWeek];
    const base = {
        day_of_week: dayOfWeek,
        label: meta.label,
        short: meta.short,
        is_today: dayOfWeek === todayDow,
        is_rest_day: false,
        workouts: [],
        source: 'empty',
    };

    if (isRest) return { ...base, is_rest_day: true, source: 'rest' };
    if (explicitRows.length) {
        return { ...base, source: 'schedule', workouts: explicitRows.map(toBlock) };
    }
    if (fallbackWorkouts.length) {
        return { ...base, source: 'workout_day', workouts: fallbackWorkouts.map(toBlock) };
    }
    return base;
}

// Resolve os 7 dias combinando a agenda explícita (vários treinos/dia + descanso)
// com o dia que cada treino já traz em workouts.day_of_week.
async function resolveWeek(userId) {
    const [dayWorkouts, restDays, activeWorkouts] = await Promise.all([
        repository.findDayWorkouts(userId),
        repository.findRestDays(userId),
        repository.findActiveWorkoutsForFallback(userId),
    ]);

    const restSet = new Set(restDays);

    // Treinos explícitos por dia (só os ativos).
    const explicitByDay = new Map();
    const scheduledIds = new Set();
    for (const row of dayWorkouts) {
        if (row.workout_status !== 'active') continue;
        scheduledIds.add(row.workout_id);
        const list = explicitByDay.get(row.day_of_week) || [];
        list.push(row);
        explicitByDay.set(row.day_of_week, list);
    }

    // Fallback: treinos ativos ainda não colocados manualmente em nenhum dia.
    const fallbackByDay = new Map();
    for (const workout of activeWorkouts) {
        if (scheduledIds.has(workout.id)) continue;
        const list = fallbackByDay.get(workout.day_of_week) || [];
        list.push(workout);
        fallbackByDay.set(workout.day_of_week, list);
    }

    const todayDow = todayDayOfWeek();
    return WEEKDAYS.map((meta) => resolveEntry(
        explicitByDay.get(meta.value) || [],
        restSet.has(meta.value),
        fallbackByDay.get(meta.value) || [],
        meta.value,
        todayDow,
    ));
}

async function list(userId) {
    const days = await resolveWeek(userId);
    const planned = days.filter((day) => day.workouts.length > 0).length;
    const rest = days.filter((day) => day.is_rest_day).length;

    return {
        today_day_of_week: todayDayOfWeek(),
        days,
        summary: { planned, rest },
    };
}

// Resumo para a tela de progresso (planejado / concluído / pendente / descanso).
async function planSummary(userId, completedThisWeek) {
    const days = await resolveWeek(userId);
    const planned = days.filter((day) => day.workouts.length > 0).length;
    const rest = days.filter((day) => day.is_rest_day).length;

    const completed = Math.min(Number(completedThisWeek) || 0, planned);
    const pending = Math.max(planned - completed, 0);
    return { planned, completed, pending, rest };
}

// Versão enxuta de um dia para os vizinhos (ontem / amanhã) do card "Hoje".
function neighbor(entry) {
    return {
        day_of_week: entry.day_of_week,
        label: entry.label,
        short: entry.short,
        is_rest_day: entry.is_rest_day,
        workouts: entry.workouts,
        source: entry.source,
    };
}

async function today(userId) {
    const todayDow = todayDayOfWeek();
    const days = await resolveWeek(userId);
    const entry = days[todayDow];

    let status = 'empty';
    if (entry.is_rest_day) status = 'rest';
    else if (entry.workouts.length) status = 'workout';

    let completed = false;
    let sessionId = null;
    if (entry.workouts.length) {
        const { start, end } = todayBounds();
        const session = await repository.findCompletedDaySession(
            userId,
            entry.workouts.map((workout) => workout.id),
            start,
            end,
        );
        if (session) {
            completed = true;
            sessionId = session.id;
        }
    }

    return {
        day_of_week: todayDow,
        label: entry.label,
        short: entry.short,
        status,
        source: entry.source,
        is_rest_day: entry.is_rest_day,
        workouts: entry.workouts,
        completed,
        session_id: sessionId,
        previous: neighbor(days[(todayDow + 6) % 7]),
        next: neighbor(days[(todayDow + 1) % 7]),
    };
}

function resolveDay(userId, dayOfWeek) {
    return resolveWeek(userId).then((days) => days[dayOfWeek]);
}

function parseWorkoutIds(payload) {
    const raw = Array.isArray(payload.workout_ids)
        ? payload.workout_ids
        : (payload.workout_id !== undefined ? [payload.workout_id] : []);
    const ids = raw.map((value) => id(value, 'Treino'));
    return [...new Set(ids)];
}

async function setDay(userId, dayOfWeekValue, payload = {}) {
    const dayOfWeek = integer(dayOfWeekValue, 'Dia da semana', { min: 0, max: 6 });
    const isRest = payload.is_rest_day === true || payload.is_rest_day === 'true';

    if (isRest) {
        await repository.setDay(userId, dayOfWeek, [], true);
        return resolveDay(userId, dayOfWeek);
    }

    const workoutIds = parseWorkoutIds(payload);
    if (!workoutIds.length) {
        // Sem treinos e sem descanso: limpa o dia.
        await repository.clearDay(userId, dayOfWeek);
        return resolveDay(userId, dayOfWeek);
    }

    const activeIds = new Set(
        (await repository.findActiveWorkoutsForFallback(userId)).map((workout) => workout.id),
    );
    for (const workoutId of workoutIds) {
        if (!activeIds.has(workoutId)) {
            throw badRequest('Apenas treinos ativos podem ser adicionados à agenda.');
        }
    }

    await repository.setDay(userId, dayOfWeek, workoutIds, false);
    return resolveDay(userId, dayOfWeek);
}

async function removeDay(userId, dayOfWeekValue) {
    const dayOfWeek = integer(dayOfWeekValue, 'Dia da semana', { min: 0, max: 6 });
    await repository.clearDay(userId, dayOfWeek);
    return resolveDay(userId, dayOfWeek);
}

// Visão "por treino": define em quais dias da semana o treino é feito.
async function setWorkoutDays(userId, workoutIdValue, payload = {}) {
    const workoutId = id(workoutIdValue, 'Treino');
    const activeIds = new Set(
        (await repository.findActiveWorkoutsForFallback(userId)).map((workout) => workout.id),
    );
    if (!activeIds.has(workoutId)) {
        throw badRequest('Apenas treinos ativos podem ser agendados.');
    }

    const raw = Array.isArray(payload.days) ? payload.days : [];
    const days = [...new Set(raw.map((value) => integer(value, 'Dia da semana', { min: 0, max: 6 })))];

    await repository.setWorkoutDays(userId, workoutId, days);
    return { workout_id: workoutId, days };
}

// Resolve o que iniciar num dia: lista de treinos (blocos) + nome combinado.
// Só usa repositórios, evitando dependência circular com workoutSession.service.
async function resolveStartPlan(userId, dayOfWeekValue) {
    const dayOfWeek = integer(dayOfWeekValue, 'Dia da semana', { min: 0, max: 6 });
    const days = await resolveWeek(userId);
    const entry = days[dayOfWeek];

    if (entry.is_rest_day) throw badRequest('Dia de descanso não tem treino para iniciar.');
    if (!entry.workouts.length) throw badRequest('Nenhum treino definido para este dia.');

    const workoutIds = entry.workouts.map((workout) => workout.id);
    const name = entry.workouts.map((workout) => workout.title).join(' + ');
    return { workoutIds, name };
}

module.exports = {
    list,
    today,
    setDay,
    removeDay,
    setWorkoutDays,
    planSummary,
    resolveStartPlan,
};
