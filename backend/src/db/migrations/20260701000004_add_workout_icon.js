/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const exists = await knex.schema.hasColumn('workouts', 'icon');
    if (exists) return;

    await knex.schema.alterTable('workouts', (table) => {
        table.string('icon', 40).notNullable().defaultTo('fitness_center');
    });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    const exists = await knex.schema.hasColumn('workouts', 'icon');
    if (!exists) return;

    await knex.schema.alterTable('workouts', (table) => {
        table.dropColumn('icon');
    });
};
