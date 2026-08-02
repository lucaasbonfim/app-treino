const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveMonth, goalPercent, rankEntries } = require('../src/services/friend.service');

test('resolve um mês fechado usando o mês inteiro', () => {
    const period = resolveMonth('2020-02');
    assert.equal(period.month, '2020-02');
    assert.equal(period.label, 'Fevereiro de 2020');
    assert.equal(period.start, '2020-02-01');
    assert.equal(period.end, '2020-02-29');
    assert.equal(period.is_current, false);
    assert.equal(period.elapsedDays, 29);
});

test('sem mês informado, usa o mês corrente', () => {
    const period = resolveMonth();
    assert.equal(period.is_current, true);
    assert.match(period.month, /^\d{4}-\d{2}$/);
    assert.equal(period.elapsedDays, new Date().getDate());
});

test('recusa mês em formato inválido', () => {
    assert.throws(() => resolveMonth('2026-13'), /AAAA-MM/);
    assert.throws(() => resolveMonth('agosto'), /AAAA-MM/);
    assert.throws(() => resolveMonth('2026-1'), /AAAA-MM/);
});

test('percentual da meta usa só os dias já decorridos do mês', () => {
    // Meta de 3x por semana em 14 dias decorridos = 6 treinos esperados.
    assert.equal(goalPercent(6, 3, 14), 100);
    assert.equal(goalPercent(3, 3, 14), 50);
    assert.equal(goalPercent(9, 3, 14), 150);
    assert.equal(goalPercent(0, 3, 14), 0);
});

test('percentual da meta não divide por zero', () => {
    assert.equal(goalPercent(5, 0, 14), 0);
    assert.equal(goalPercent(5, 3, 0), 0);
});

test('empate em dias divide a mesma posição', () => {
    const rows = [
        { id: 1, name: 'Bia', username: 'bia', weekly_goal_trainings: 3, days: 15, reached_at: '2026-08-20' },
        { id: 2, name: 'Lucas', username: 'lucas', weekly_goal_trainings: 6, days: 12, reached_at: '2026-08-19' },
        { id: 3, name: 'Ana', username: 'ana', weekly_goal_trainings: 4, days: 12, reached_at: '2026-08-25' },
        { id: 4, name: 'Téo', username: 'teo', weekly_goal_trainings: 3, days: 4, reached_at: '2026-08-10' },
    ];

    const entries = rankEntries(rows, { userId: 2, elapsedDays: 28 });

    assert.deepEqual(entries.map((entry) => entry.position), [1, 2, 2, 4]);
    assert.deepEqual(entries.map((entry) => entry.is_me), [false, true, false, false]);
});

test('quem não treinou continua na lista com zero dias', () => {
    const rows = [
        { id: 1, name: 'Bia', username: 'bia', weekly_goal_trainings: 3, days: 2, reached_at: '2026-08-03' },
        { id: 2, name: 'Lucas', username: 'lucas', weekly_goal_trainings: 3, days: 0, reached_at: null },
    ];

    const entries = rankEntries(rows, { userId: 2, elapsedDays: 7 });

    assert.equal(entries.length, 2);
    assert.equal(entries[1].days, 0);
    assert.equal(entries[1].goal_percent, 0);
    assert.equal(entries[1].position, 2);
});

test('sequência fica nula quando o mês não tem janela de streak carregada', () => {
    const rows = [{ id: 1, name: 'Bia', username: 'bia', weekly_goal_trainings: 3, days: 5, reached_at: '2026-07-30' }];
    const [entry] = rankEntries(rows, { userId: 9, elapsedDays: 31 });
    assert.equal(entry.streak, null);
});

test('sequência é calculada a partir das datas do participante', () => {
    const today = new Date(2026, 7, 20);
    const streakByUser = new Map([[1, new Set(['2026-08-18', '2026-08-19', '2026-08-20'])]]);
    const rows = [{ id: 1, name: 'Bia', username: 'bia', weekly_goal_trainings: 3, days: 3, reached_at: '2026-08-20' }];

    const [entry] = rankEntries(rows, { userId: 1, elapsedDays: 20, streakByUser, today });

    assert.equal(entry.streak, 3);
});
