const checkinRepository = require('../repositories/checkin.repository');
const userRepository = require('../repositories/user.repository');
const { integer } = require('../utils/validation');

const WEEKDAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function isoDate(date) {
    return date.toLocaleDateString('en-CA');
}

function dateOnly(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Segunda-feira como início da semana.
function startOfWeek(today) {
    const date = dateOnly(today);
    const offset = (date.getDay() + 6) % 7;
    return addDays(date, -offset);
}

function motivationalMessage(progressPercent, streak) {
    if (progressPercent >= 100) return 'Meta semanal batida';
    if (streak >= 3) return 'Sequência boa, mantém o foco';
    if (progressPercent === 0) return 'Bora começar a semana?';
    if (progressPercent < 50) return 'Ainda dá tempo de buscar a meta';
    return 'Você tá no ritmo';
}

// Sequência atual: dias consecutivos com check-in terminando em hoje (ou ontem,
// caso o treino de hoje ainda não tenha acontecido).
function currentStreak(dateSet, today) {
    let cursor = dateOnly(today);
    if (!dateSet.has(isoDate(cursor))) {
        cursor = addDays(cursor, -1);
        if (!dateSet.has(isoDate(cursor))) return 0;
    }
    let streak = 0;
    while (dateSet.has(isoDate(cursor))) {
        streak += 1;
        cursor = addDays(cursor, -1);
    }
    return streak;
}

// Maior sequência de dias consecutivos em todo o histórico.
function bestStreak(sortedDates) {
    let best = 0;
    let run = 0;
    let previous = null;
    for (const iso of sortedDates) {
        const current = dateOnly(iso);
        if (previous && isoDate(addDays(previous, 1)) === iso) {
            run += 1;
        } else {
            run = 1;
        }
        if (run > best) best = run;
        previous = current;
    }
    return best;
}

function buildWeekDays(weekStart, dateSet, today) {
    const todayIso = isoDate(dateOnly(today));
    return Array.from({ length: 7 }, (unused, index) => {
        const date = addDays(weekStart, index);
        const iso = isoDate(date);
        let status = 'future';
        if (dateSet.has(iso)) status = 'done';
        else if (iso === todayIso) status = 'today';
        else if (iso < todayIso) status = 'pending';
        return {
            date: iso,
            label: WEEKDAY_LABELS[index],
            short: WEEKDAY_SHORT[index],
            status,
        };
    });
}

async function weeklySummary(userId) {
    const [user, allDates] = await Promise.all([
        userRepository.findById(userId),
        checkinRepository.findAllDates(userId),
    ]);

    const goal = Number(user?.weekly_goal_trainings) || 3;
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    const dateSet = new Set(allDates);

    const weekStartIso = isoDate(weekStart);
    const weekEndIso = isoDate(weekEnd);
    const completed = allDates.filter((iso) => iso >= weekStartIso && iso <= weekEndIso).length;
    const progressPercent = goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;
    const streak = currentStreak(dateSet, today);

    return {
        goal,
        completed,
        progress_percent: progressPercent,
        streak,
        best_streak: bestStreak(allDates),
        today_checked_in: dateSet.has(isoDate(dateOnly(today))),
        week_start: weekStartIso,
        week_end: weekEndIso,
        week_days: buildWeekDays(weekStart, dateSet, today),
        message: motivationalMessage(progressPercent, streak),
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
    weeklySummary,
    monthlyCheckins,
    createManualCheckin,
    updateWeeklyGoal,
    checkinFromSession,
};
