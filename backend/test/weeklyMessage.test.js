const test = require('node:test');
const assert = require('node:assert/strict');
const { motivationalMessage, remainingOpportunities } = require('../src/services/progress.service');

// A semana começa na segunda, então domingo é o último dia.
const MONDAY = new Date(2026, 7, 3);
const FRIDAY = new Date(2026, 7, 7);
const SUNDAY = new Date(2026, 7, 9);

test('conta os dias que ainda cabem na semana', () => {
    assert.equal(remainingOpportunities(MONDAY, false), 7);
    assert.equal(remainingOpportunities(MONDAY, true), 6);
    assert.equal(remainingOpportunities(FRIDAY, false), 3);
    assert.equal(remainingOpportunities(SUNDAY, false), 1);
    // Domingo com o treino de hoje já feito: não sobra nenhum dia na semana.
    assert.equal(remainingOpportunities(SUNDAY, true), 0);
});

test('não promete tempo que não existe mais no domingo', () => {
    const opportunities = remainingOpportunities(SUNDAY, true);
    const message = motivationalMessage({
        completed: 1, goal: 5, streak: 1, opportunities,
    });
    assert.equal(message, 'Semana encerrada. Bora pra próxima');
    assert.doesNotMatch(message, /ainda dá tempo/i);
});

test('domingo sem treino ainda chama para o último dia', () => {
    assert.equal(
        motivationalMessage({
            completed: 1, goal: 5, streak: 0, opportunities: remainingOpportunities(SUNDAY, false),
        }),
        'Último dia da semana, bora treinar',
    );
});

test('meta batida vence qualquer outro estado', () => {
    assert.equal(
        motivationalMessage({
            completed: 5, goal: 5, streak: 0, opportunities: 0,
        }),
        'Meta semanal batida',
    );
    assert.equal(
        motivationalMessage({
            completed: 6, goal: 5, streak: 0, opportunities: 3,
        }),
        'Meta semanal batida',
    );
});

test('avisa quando a meta virou matematicamente inviável', () => {
    // Faltam 4 treinos e só restam 3 dias.
    assert.equal(
        motivationalMessage({
            completed: 1, goal: 5, streak: 0, opportunities: 3,
        }),
        'A meta ficou apertada, mas todo treino conta',
    );
});

test('começo de semana e ritmo normal', () => {
    assert.equal(
        motivationalMessage({
            completed: 0, goal: 3, streak: 0, opportunities: 7,
        }),
        'Bora começar a semana?',
    );
    assert.equal(
        motivationalMessage({
            completed: 1, goal: 3, streak: 0, opportunities: 5,
        }),
        'Você tá no ritmo',
    );
    assert.equal(
        motivationalMessage({
            completed: 1, goal: 3, streak: 4, opportunities: 5,
        }),
        'Sequência boa, mantém o foco',
    );
});

test('avisa quando a meta exige treinar todos os dias restantes', () => {
    assert.equal(
        motivationalMessage({
            completed: 1, goal: 3, streak: 0, opportunities: 2,
        }),
        'Precisa treinar todos os dias que faltam',
    );
});
