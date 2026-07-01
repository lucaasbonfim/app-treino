/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const exists = await knex.schema.hasTable('users');
    if (exists) return;

    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.string('email', 150).notNullable().unique();
        table.text('password').notNullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
    return knex.schema.dropTableIfExists('users');
};

