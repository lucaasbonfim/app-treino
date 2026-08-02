const test = require('node:test');
const assert = require('node:assert/strict');
const {
    normalizeUsername,
    validateUsername,
    slugifyUsername,
    withSuffix,
} = require('../src/utils/username');

test('normaliza o @ digitado pela pessoa', () => {
    assert.equal(normalizeUsername('  @Lucas.Bonfim '), 'lucas.bonfim');
    assert.equal(normalizeUsername('LUCAS'), 'lucas');
    assert.equal(normalizeUsername(null), '');
});

test('aceita nomes de usuário válidos', () => {
    assert.equal(validateUsername('@Lucas_Bonfim'), 'lucas_bonfim');
    assert.equal(validateUsername('bia.treino'), 'bia.treino');
    assert.equal(validateUsername('gym2026'), 'gym2026');
});

test('recusa nomes de usuário fora das regras', () => {
    assert.throws(() => validateUsername(''), /Informe um nome de usuário/);
    assert.throws(() => validateUsername('ab'), /pelo menos 3/);
    assert.throws(() => validateUsername('a'.repeat(21)), /no máximo 20/);
    assert.throws(() => validateUsername('.lucas'), /sem começar ou terminar/);
    assert.throws(() => validateUsername('lucas_'), /sem começar ou terminar/);
    assert.throws(() => validateUsername('lucas bonfim'), /sem começar ou terminar/);
    assert.throws(() => validateUsername('lucas@treino'), /sem começar ou terminar/);
});

test('gera um @ automático a partir do e-mail ou do nome', () => {
    assert.equal(slugifyUsername('lucas.bonfim'), 'lucas.bonfim');
    assert.equal(slugifyUsername('Renato Célli'), 'renato.celli');
    assert.equal(slugifyUsername('João'), 'joao');
    // Muito curto para virar @, então ganha um prefixo.
    assert.equal(slugifyUsername('ab'), 'atletaab');
    assert.equal(slugifyUsername(''), 'atleta');
    // Nunca ultrapassa o limite da coluna.
    assert.equal(slugifyUsername('a'.repeat(40)).length, 20);
});

test('o @ gerado automaticamente é sempre válido', () => {
    for (const seed of ['Renato Célli', 'ab', '', '...', 'a'.repeat(40), '@@@lucas@@@']) {
        assert.equal(validateUsername(slugifyUsername(seed)), slugifyUsername(seed));
    }
});

test('sufixo de desempate respeita o limite de 20 caracteres', () => {
    assert.equal(withSuffix('lucas', 2), 'lucas2');
    assert.equal(withSuffix('a'.repeat(20), 12).length, 20);
    assert.equal(withSuffix('a'.repeat(20), 12).endsWith('12'), true);
});
