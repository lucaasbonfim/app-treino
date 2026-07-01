const db = require('../db/connection');

const fields = [
    'id',
    'name',
    'muscle_group',
    'description',
    'default_sets',
    'default_reps',
    'default_rest_time_seconds',
    'equipment',
    'created_at',
    'updated_at',
];

function list({ muscleGroup, search } = {}, connection = db) {
    const query = connection('exercise_library')
        .where({ is_active: true })
        .select(fields)
        .orderBy([
            { column: 'muscle_group', order: 'asc' },
            { column: 'name', order: 'asc' },
        ]);

    if (muscleGroup) query.andWhere('muscle_group', muscleGroup);
    if (search) query.andWhere('name', 'ilike', `%${search}%`);

    return query;
}

async function groups(connection = db) {
    // Ordena os grupos pela ordem em que foram cadastrados (menor id do grupo),
    // preservando a sequência definida no seed (Peito, Costas, ...).
    const rows = await connection('exercise_library')
        .where({ is_active: true })
        .groupBy('muscle_group')
        .min({ ord: 'id' })
        .select('muscle_group')
        .orderBy('ord', 'asc');
    return rows.map((row) => row.muscle_group);
}

function findActiveById(id, connection = db) {
    return connection('exercise_library')
        .where({ id, is_active: true })
        .select(fields)
        .first();
}

module.exports = { list, groups, findActiveById };
