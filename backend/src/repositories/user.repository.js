const db = require('../db/connection');

const publicFields = ['id', 'name', 'email', 'weekly_goal_trainings', 'created_at', 'updated_at'];

function findById(id) {
    return db('users').where({ id }).select(publicFields).first();
}

function findByIdWithPassword(id) {
    return db('users').where({ id }).first();
}

function findByEmail(email) {
    return db('users').where({ email }).first();
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
    create,
    update,
};
