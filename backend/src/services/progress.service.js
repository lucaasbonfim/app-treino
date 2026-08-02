const checkinRepository = require('../repositories/checkin.repository');
const userRepository = require('../repositories/user.repository');
const scheduleService = require('./schedule.service');
const { integer } = require('../utils/validation');
const { conflict } = require('../utils/httpError');
const {
    isoDate,
    dateOnly,
    addDays,
    currentStreak,
    bestStreak,
} = require('../utils/streak');

const WEEKDAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Segunda-feira como início da semana.
function startOfWeek(today) {
    const date = dateOnly(today);
    const offset = (date.getDay() + 6) % 7;
    return addDays(date, -offset);
}

// Quantos treinos ainda cabem na semana: os dias que restam até domingo,
// descontando hoje quando o check-in de hoje já foi feito.
function remainingOpportunities(today, todayCheckedIn) {
    const daysLeft = 7 - ((dateOnly(today).getDay() + 6) % 7);
    return Math.max(daysLeft - (todayCheckedIn ? 1 : 0), 0);
}

// A mensagem precisa saber quantos dias ainda cabem na semana: dizer "ainda dá
// tempo" no domingo, com o treino do dia já feito, é falso.
function motivationalMessage({ completed, goal, streak, opportunities }) {
    const missing = Math.max(goal - completed, 0);
    if (missing === 0) return 'Meta semanal batida';
    if (opportunities === 0) return 'Semana encerrada. Bora pra próxima';
    if (missing > opportunities) {
        return opportunities === 1
            ? 'Último dia da semana, bora treinar'
            : 'A meta ficou apertada, mas todo treino conta';
    }
    if (completed === 0) return 'Bora começar a semana?';
    if (streak >= 3) return 'Sequência boa, mantém o foco';
    if (missing === opportunities) return 'Precisa treinar todos os dias que faltam';
    return 'Você tá no ritmo';
}

// Estado de cada dia da semana, cruzando os check-ins com o formato da agenda.
// "Não treinou" só vira falta quando havia treino planejado: marcar falta num
// dia que a própria pessoa definiu como descanso é cobrança indevida.
function buildWeekDays(weekStart, dateSet, today, planDays = []) {
    const todayIso = isoDate(dateOnly(today));
    const shapeByDow = new Map(planDays.map((day) => [day.day_of_week, day]));

    return Array.from({ length: 7 }, (unused, index) => {
        const date = addDays(weekStart, index);
        const iso = isoDate(date);
        const shape = shapeByDow.get(date.getDay()) || {};
        const isRestDay = Boolean(shape.is_rest_day);
        const hasWorkout = Boolean(shape.has_workout);

        let status;
        if (dateSet.has(iso)) status = 'done';
        else if (isRestDay) status = 'rest';
        else if (iso === todayIso) status = 'today';
        else if (iso > todayIso) status = 'future';
        else status = hasWorkout ? 'missed' : 'free';

        return {
            date: iso,
            label: WEEKDAY_LABELS[index],
            short: WEEKDAY_SHORT[index],
            status,
            is_today: iso === todayIso,
            is_rest_day: isRestDay,
            has_workout: hasWorkout,
        };
    });
}

// A meta fica gravada em users.weekly_goal_trainings mesmo quando é derivada:
// o ranking entre amigos lê essa coluna direto, e derivar só aqui faria a Home
// e o ranking mostrarem metas diferentes.
async function syncGoalWithSchedule(userId, user, plannedDays) {
    const stored = Number(user?.weekly_goal_trainings) || 3;
    if (plannedDays <= 0) return stored;

    // A coluna aceita de 1 a 7, que é exatamente o intervalo possível de dias.
    const derived = Math.min(Math.max(plannedDays, 1), 7);
    if (derived === stored) return stored;

    await userRepository.update(userId, { weekly_goal_trainings: derived });
    return derived;
}

async function weeklySummary(userId) {
    const [user, allDates] = await Promise.all([
        userRepository.findById(userId),
        checkinRepository.findAllDates(userId),
    ]);

    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    const dateSet = new Set(allDates);

    const weekStartIso = isoDate(weekStart);
    const weekEndIso = isoDate(weekEnd);
    const completed = allDates.filter((iso) => iso >= weekStartIso && iso <= weekEndIso).length;
    const plan = await scheduleService.planSummary(userId, completed);

    // Quem montou a agenda já disse quantos dias treina por semana: a meta passa
    // a ser esse número em vez de um segundo valor que ninguém mantém em dia.
    // Sem agenda (planned = 0) a meta continua sendo a escolhida na mão.
    const goal = await syncGoalWithSchedule(userId, user, plan.planned);
    const goalSource = plan.planned > 0 ? 'schedule' : 'manual';

    const progressPercent = goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;
    const streak = currentStreak(dateSet, today);
    const todayCheckedIn = dateSet.has(isoDate(dateOnly(today)));
    const opportunities = remainingOpportunities(today, todayCheckedIn);

    return {
        goal,
        goal_source: goalSource,
        completed,
        progress_percent: progressPercent,
        streak,
        best_streak: bestStreak(allDates),
        today_checked_in: todayCheckedIn,
        days_left: opportunities,
        week_start: weekStartIso,
        week_end: weekEndIso,
        week_days: buildWeekDays(weekStart, dateSet, today, plan.days),
        // `days` alimenta o cálculo acima; o resumo em si só precisa dos totais.
        plan: {
            planned: plan.planned,
            completed: plan.completed,
            pending: plan.pending,
            rest: plan.rest,
        },
        message: motivationalMessage({
            completed, goal, streak, opportunities,
        }),
    };
}

async function monthlyCheckins(userId) {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const dates = await checkinRepository.findDatesInRange(
        userId,
        isoDate(monthStart),
        isoDate(monthEnd),
    );
    return {
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        count: dates.length,
        dates,
    };
}

async function createManualCheckin(userId) {
    const today = isoDate(new Date());
    const existing = await checkinRepository.findByUserAndDate(userId, today);
    if (existing) {
        return { created: false, message: 'Check-in de hoje já registrado' };
    }
    const checkin = await checkinRepository.insertIgnore({
        user_id: userId,
        checkin_date: today,
        source: 'manual',
    });
    return {
        created: Boolean(checkin),
        message: checkin ? 'Check-in registrado' : 'Check-in de hoje já registrado',
    };
}

async function updateWeeklyGoal(userId, payload) {
    const goal = integer(payload.weekly_goal_trainings, 'Meta semanal', { min: 1, max: 7 });

    // Com agenda montada a meta é derivada dela. Aceitar um valor manual aqui
    // seria enganoso: a próxima abertura da Home sobrescreveria em silêncio.
    const plan = await scheduleService.planSummary(userId, 0);
    if (plan.planned > 0) {
        throw conflict(
            'Sua meta acompanha a agenda semanal. Edite os dias de treino na agenda para mudá-la.',
        );
    }

    const user = await userRepository.update(userId, { weekly_goal_trainings: goal });
    return { weekly_goal_trainings: user.weekly_goal_trainings };
}

// Cria o check-in automático ao finalizar uma sessão (idempotente por dia).
// Recebe a connection da transação de finalização.
function checkinFromSession(userId, sessionId, connection) {
    return checkinRepository.insertIgnore({
        user_id: userId,
        workout_session_id: sessionId,
        checkin_date: isoDate(new Date()),
        source: 'session',
    }, connection);
}

module.exports = {
    motivationalMessage,
    remainingOpportunities,
    buildWeekDays,
    weeklySummary,
    monthlyCheckins,
    createManualCheckin,
    updateWeeklyGoal,
    checkinFromSession,
};
