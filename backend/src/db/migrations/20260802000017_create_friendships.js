/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const exists = await knex.schema.hasTable('friendships');
    if (exists) return;

    await knex.schema.createTable('friendships', (table) => {
        table.increments('id').primary();
        table.integer('requester_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');
        table.integer('addressee_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');
        table.string('status', 20).notNullable().defaultTo('pending');
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('responded_at', { useTz: true }).nullable();

        table.index(['addressee_id', 'status']);
        table.index(['requester_id', 'status']);
        table.check("?? in ('pending', 'accepted')", ['status']);
        table.check('?? <> ??', ['requester_id', 'addressee_id']);
    });

    // A amizade é uma relação única entre duas pessoas, independentemente de quem
    // enviou o pedido: normalizar o par evita que A→B e B→A coexistam.
    await knex.raw(`
        CREATE UNIQUE INDEX friendships_unique_pair
        ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
    `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
    return knex.schema.dropTableIfExists('friendships');
};
