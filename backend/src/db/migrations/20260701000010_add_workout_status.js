/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const hasStatus = await knex.schema.hasColumn('workouts', 'status');
    if (!hasStatus) {
        await knex.schema.alterTable('workouts', (table) => {
            table.string('status', 20).notNullable().defaultTo('active');
            table.timestamp('archived_at', { useTz: true }).nullable();
            table.timestamp('reactivated_at', { useTz: true }).nullable();
            table.index(['user_id', 'status']);
        });
        await knex.raw(`
            ALTER TABLE workouts
            ADD CONSTRAINT workouts_status_check
            CHECK (status IN ('active', 'archived'))
        `);
    }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    if (await knex.schema.hasColumn('workouts', 'status')) {
        await knex.raw('ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_status_check');
        await knex.schema.alterTable('workouts', (table) => {
            table.dropColumn('status');
            table.dropColumn('archived_at');
            table.dropColumn('reactivated_at');
        });
    }
};
