const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWeekDays } = require('../src/services/progress.service');

// Semana de 27/07/2026 (segunda) a 02/08/2026 (domingo).
const WEEK_START = new Date(2026, 6, 27);
const FRIDAY = new Date(2026, 6, 31);

// day_of_week segue a convenção do JS: 0 = domingo.
const PLAN = [
    { day_of_week: 0, is_rest_day: true, has_workout: false },
    { day_of_week: 1, is_rest_day: false, has_workout: true },
    { day_of_week: 2, is_rest_day: true, has_workout: false },
    { day_of_week: 3, is_rest_day: false, has_workout: true },
    { day_of_week: 4, is_rest_day: false, has_workout: false },
    { day_of_week: 5, is_rest_day: false, has_workout: true },
    { day_of_week: 6, is_rest_day: true, has_workout: false },
];

function statuses(dates, plan = PLAN, today = FRIDAY) {
    return buildWeekDays(WEEK_START, new Set(dates), today, plan)
        .map((day) => day.status);
}

test('dia de descanso não é marcado como falta', () => {
    const result = statuses(['2026-07-27']);
    assert.deepEqual(result, [
        'done', // Seg: treinou
        'rest', // Ter: descanso
        'missed', // Qua: tinha treino e passou
        'free', // Qui: nada planejado
        'today', // Sex: hoje
        'rest', // Sáb: descanso
        'rest', // Dom: descanso
    ]);
});

test('treinar num dia de descanso conta como treino', () => {
    // Terça é descanso, mas houve check-in: o treino feito prevalece.
    const result = statuses(['2026-07-28']);
    assert.equal(result[1], 'done');
});

test('sem agenda nenhuma, dia passado sem treino não vira falta', () => {
    const semAgenda = PLAN.map((day) => ({ ...day, is_rest_day: false, has_workout: false }));
    const result = statuses([], semAgenda);
    assert.deepEqual(result, ['free', 'free', 'free', 'free', 'today', 'future', 'future']);
});

test('marca hoje separado do estado do dia', () => {
    const days = buildWeekDays(WEEK_START, new Set(), FRIDAY, PLAN);
    assert.deepEqual(days.map((day) => day.is_today), [
        false, false, false, false, true, false, false,
    ]);
});

test('hoje sendo dia de descanso mostra descanso, não cobrança', () => {
    const saturday = new Date(2026, 7, 1);
    const days = buildWeekDays(WEEK_START, new Set(), saturday, PLAN);
    assert.equal(days[5].status, 'rest');
    assert.equal(days[5].is_today, true);
});

test('devolve o formato do dia junto do estado', () => {
    const days = buildWeekDays(WEEK_START, new Set(), FRIDAY, PLAN);
    assert.equal(days[2].has_workout, true);
    assert.equal(days[1].is_rest_day, true);
});
