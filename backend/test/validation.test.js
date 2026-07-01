const test = require('node:test');
const assert = require('node:assert/strict');
const { requiredText, optionalText, integer, decimal, id } = require('../src/utils/validation');
const { normalizeEmail } = require('../src/services/auth.service');

test('normaliza e-mail para autenticação', () => {
    assert.equal(normalizeEmail('  Pessoa@Exemplo.COM '), 'pessoa@exemplo.com');
});

test('limpa textos e converte campos opcionais vazios em null', () => {
    assert.equal(requiredText('  Treino A  ', 'Nome', 20), 'Treino A');
    assert.equal(optionalText('   ', 'Notas', 20), null);
});

test('valida inteiros, decimais e IDs', () => {
    assert.equal(integer('4', 'Séries', { min: 1, max: 10 }), 4);
    assert.equal(decimal('12.5', 'Carga', { min: 0 }), 12.5);
    assert.equal(id('42'), 42);
    assert.throws(() => integer(7, 'Dia', { min: 0, max: 6 }), /no máximo 6/);
    assert.throws(() => id(0), /no mínimo 1/);
});

