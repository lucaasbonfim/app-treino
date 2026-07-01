const db = require('../db/connection');

async function create(data, connection = db) {
    const [record] = await connection('email_verifications')
        .insert(data)
        .returning(['id', 'email', 'expires_at', 'created_at']);
    return record;
}

function findByEmail(email, connection = db) {
    return connection('email_verifications')
        .where({ email })
        .orderBy('created_at', 'desc')
        .first();
}

function removeByEmail(email, connection = db) {
    return connection('email_verifications').where({ email }).del();
}

module.exports = { create, findByEmail, removeByEmail };
