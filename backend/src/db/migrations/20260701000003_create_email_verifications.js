/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const exists = await knex.schema.hasTable('email_verifications');
    if (exists) return;

    await knex.schema.createTable('email_verifications', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.string('email', 150).notNullable().unique();
        table.text('password_hash').notNullable();
        table.string('code', 6).notNullable();
        table.timestamp('expires_at', { useTz: true }).notNullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.index(['email', 'code']);
    });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
    return knex.schema.dropTableIfExists('email_verifications');
};
