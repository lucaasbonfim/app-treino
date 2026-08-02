const db = require('../db/connection');

const DATE_COLUMN = db.raw("to_char(checkin_date, 'YYYY-MM-DD') as checkin_date");

function findByUserAndDate(userId, date, connection = db) {
    return connection('workout_checkins')
        .where({ user_id: userId, checkin_date: date })
        .first();
}

// Insere ignorando conflito (um por usuário por dia). Retorna a linha criada
// ou null caso já existisse um check-in para o dia.
async function insertIgnore(data, connection = db) {
    const [row] = await connection('workout_checkins')
        .insert(data)
        .onConflict(['user_id', 'checkin_date'])
        .ignore()
        .returning('*');
    return row || null;
}

async function findDatesInRange(userId, start, end, connection = db) {
    const rows = await connection('workout_checkins')
        .where({ user_id: userId })
        .andWhere('checkin_date', '>=', start)
        .andWhere('checkin_date', '<=', end)
        .select(DATE_COLUMN)
        .orderBy('checkin_date', 'asc');
    return rows.map((row) => row.checkin_date);
}

async function findAllDates(userId, connection = db) {
    const rows = await connection('workout_checkins')
        .where({ user_id: userId })
        .select(DATE_COLUMN)
        .orderBy('checkin_date', 'asc');
    return rows.map((row) => row.checkin_date);
}

// Datas de várias pessoas de uma vez, usadas para calcular a sequência de cada
// participante do ranking sem uma query por amigo.
async function findDatesForUsers(userIds, start, end, connection = db) {
    if (!userIds.length) return [];
    const rows = await connection('workout_checkins')
        .whereIn('user_id', userIds)
        .andWhere('checkin_date', '>=', start)
        .andWhere('checkin_date', '<=', end)
        .select('user_id', DATE_COLUMN)
        .orderBy('checkin_date', 'asc');
    return rows;
}

module.exports = {
    findByUserAndDate,
    insertIgnore,
    findDatesInRange,
    findAllDates,
    findDatesForUsers,
};
