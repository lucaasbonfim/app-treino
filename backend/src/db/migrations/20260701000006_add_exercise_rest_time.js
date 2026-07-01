const REST_TIMES = [30, 45, 60, 90, 120];

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const exerciseHasColumn = await knex.schema.hasColumn(
        'workout_exercises',
        'rest_time_seconds',
    );
    if (!exerciseHasColumn) {
        await knex.schema.alterTable('workout_exercises', (table) => {
            table.smallint('rest_time_seconds').notNullable().defaultTo(60);
        });
    }
    await knex.raw(`
        ALTER TABLE workout_exercises
        DROP CONSTRAINT IF EXISTS workout_exercises_rest_time_check
    `);
    await knex.raw(`
        ALTER TABLE workout_exercises
        ADD CONSTRAINT workout_exercises_rest_time_check
        CHECK (rest_time_seconds IN (${REST_TIMES.join(', ')}))
    `);

    const sessionExerciseHasColumn = await knex.schema.hasColumn(
        'workout_session_exercises',
        'rest_time_seconds',
    );
    if (!sessionExerciseHasColumn) {
        await knex.schema.alterTable('workout_session_exercises', (table) => {
            table.smallint('rest_time_seconds').notNullable().defaultTo(60);
        });
    }
    await knex.raw(`
        ALTER TABLE workout_session_exercises
        DROP CONSTRAINT IF EXISTS workout_session_exercises_rest_time_check
    `);
    await knex.raw(`
        ALTER TABLE workout_session_exercises
        ADD CONSTRAINT workout_session_exercises_rest_time_check
        CHECK (rest_time_seconds IN (${REST_TIMES.join(', ')}))
    `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    if (await knex.schema.hasColumn('workout_session_exercises', 'rest_time_seconds')) {
        await knex.schema.alterTable('workout_session_exercises', (table) => {
            table.dropColumn('rest_time_seconds');
        });
    }
    if (await knex.schema.hasColumn('workout_exercises', 'rest_time_seconds')) {
        await knex.schema.alterTable('workout_exercises', (table) => {
            table.dropColumn('rest_time_seconds');
        });
    }
};
