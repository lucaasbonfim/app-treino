const { badRequest } = require('./httpError');

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9]([a-z0-9._]*[a-z0-9])?$/;

// O @ é sempre guardado em minúsculo: a busca por amigos precisa ser
// case-insensitive sem depender de citext nem de índice funcional.
function normalizeUsername(value) {
    return String(value ?? '').trim().replace(/^@+/, '').toLowerCase();
}

function validateUsername(value) {
    const username = normalizeUsername(value);
    if (!username) throw badRequest('Informe um nome de usuário.');
    if (username.length < MIN_LENGTH) {
        throw badRequest(`O nome de usuário deve ter pelo menos ${MIN_LENGTH} caracteres.`);
    }
    if (username.length > MAX_LENGTH) {
        throw badRequest(`O nome de usuário deve ter no máximo ${MAX_LENGTH} caracteres.`);
    }
    if (!USERNAME_PATTERN.test(username)) {
        throw badRequest(
            'Use apenas letras, números, ponto e underline — sem começar ou terminar com símbolo.',
        );
    }
    return username;
}

// Gera um @ válido a partir de um texto qualquer (e-mail ou nome), usado para
// dar um nome de usuário automático a quem acabou de criar a conta.
function slugifyUsername(seed) {
    const base = String(seed ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9._]+/g, '.')
        .replace(/[._]{2,}/g, '.')
        .replace(/^[._]+|[._]+$/g, '')
        .slice(0, MAX_LENGTH);
    return base.length >= MIN_LENGTH ? base : `atleta${base}`.slice(0, MAX_LENGTH);
}

// Acrescenta um sufixo mantendo o limite de tamanho da coluna.
function withSuffix(base, suffix) {
    const text = String(suffix);
    return `${base.slice(0, MAX_LENGTH - text.length)}${text}`;
}

module.exports = {
    MIN_LENGTH,
    MAX_LENGTH,
    normalizeUsername,
    validateUsername,
    slugifyUsername,
    withSuffix,
};
