const db = require('../db/connection');

const FRIEND_COLUMNS = ['u.id', 'u.name', 'u.username', 'u.weekly_goal_trainings'];

// O "outro lado" da amizade depende de quem está perguntando, por isso o join
// resolve o id do amigo com um CASE em vez de duas queries.
function joinOtherSide(userId) {
    return function join() {
        this.on(
            'u.id',
            '=',
            db.raw('CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END', [userId]),
        );
    };
}

function involvingUser(userId) {
    return function scope(builder) {
        builder.where('f.requester_id', userId).orWhere('f.addressee_id', userId);
    };
}

function findBetween(userA, userB, connection = db) {
    return connection('friendships')
        .where((builder) => {
            builder.where({ requester_id: userA, addressee_id: userB });
        })
        .orWhere((builder) => {
            builder.where({ requester_id: userB, addressee_id: userA });
        })
        .first();
}

function findById(id) {
    return db('friendships').where({ id }).first();
}

function listAccepted(userId) {
    return db('friendships as f')
        .join('users as u', joinOtherSide(userId))
        .where('f.status', 'accepted')
        .andWhere(involvingUser(userId))
        .select(...FRIEND_COLUMNS, 'f.id as friendship_id', 'f.responded_at')
        .orderBy('u.name', 'asc');
}

// Pedidos em aberto dos dois lados: a tela mostra "recebidos" (com ação) e
// "enviados" (só aguardando).
function listPending(userId) {
    return db('friendships as f')
        .join('users as u', joinOtherSide(userId))
        .where('f.status', 'pending')
        .andWhere(involvingUser(userId))
        .select(
            ...FRIEND_COLUMNS,
            'f.id as request_id',
            'f.requester_id',
            'f.created_at',
        )
        .orderBy('f.created_at', 'desc');
}

async function create(data) {
    const [row] = await db('friendships').insert(data).returning('*');
    return row;
}

async function accept(id) {
    const [row] = await db('friendships')
        .where({ id, status: 'pending' })
        .update({ status: 'accepted', responded_at: db.fn.now() })
        .returning('*');
    return row || null;
}

function remove(id) {
    return db('friendships').where({ id }).del();
}

// Ranking mensal: conta os check-ins de cada participante no intervalo. O LEFT
// JOIN é proposital — quem não treinou aparece com 0 dias em vez de sumir da
// lista, que é justamente quem precisa se ver atrás.
async function monthlyRanking(userId, start, end) {
    const { rows } = await db.raw(
        `
        WITH participantes AS (
            SELECT CASE WHEN requester_id = :me THEN addressee_id ELSE requester_id END AS user_id
              FROM friendships
             WHERE status = 'accepted'
               AND (requester_id = :me OR addressee_id = :me)
             UNION
            SELECT CAST(:me AS integer)
        )
        SELECT u.id,
               u.name,
               u.username,
               u.weekly_goal_trainings,
               COUNT(c.id)::int AS days,
               to_char(MAX(c.checkin_date), 'YYYY-MM-DD') AS reached_at
          FROM participantes p
          JOIN users u ON u.id = p.user_id
          LEFT JOIN workout_checkins c
                 ON c.user_id = u.id
                AND c.checkin_date BETWEEN :start AND :end
         GROUP BY u.id, u.name, u.username, u.weekly_goal_trainings
         ORDER BY days DESC, reached_at ASC NULLS LAST, u.id ASC
        `,
        { me: userId, start, end },
    );
    return rows;
}

module.exports = {
    findBetween,
    findById,
    listAccepted,
    listPending,
    create,
    accept,
    remove,
    monthlyRanking,
};
