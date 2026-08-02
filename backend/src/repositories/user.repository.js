const db = require('../db/connection');

const publicFields = [
    'id',
    'name',
    'email',
    'username',
    'weekly_goal_trainings',
    'created_at',
    'updated_at',
];

function findById(id) {
    return db('users').where({ id }).select(publicFields).first();
}

function findByIdWithPassword(id) {
    return db('users').where({ id }).first();
}

function findByEmail(email) {
    return db('users').where({ email }).first();
}

// O @ é guardado normalizado em minúsculo, então a busca é comparação exata —
// de propósito: nada de listar usuários por prefixo, senão o endpoint de
// adicionar amigo vira um enumerador de todo mundo do app.
function findByUsername(username) {
    return db('users').where({ username }).select(publicFields).first();
}

// Nomes já ocupados que começam pelo mesmo slug, para escolher um sufixo livre.
function findUsernamesStartingWith(base) {
    return db('users').where('username', 'like', `${base}%`).pluck('username');
}

async function create(data) {
    const [user] = await db('users').insert(data).returning(publicFields);
    return user;
}

async function update(id, data) {
    const [user] = await db('users')
        .where({ id })
        .update({ ...data, updated_at: db.fn.now() })
        .returning(publicFields);
    return user;
}

module.exports = {
    findById,
    findByIdWithPassword,
    findByEmail,
    findByUsername,
    findUsernamesStartingWith,
    create,
    update,
};
