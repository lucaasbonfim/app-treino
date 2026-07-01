/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const sessionsExist = await knex.schema.hasTable('workout_sessions');
    if (!sessionsExist) {
        await knex.schema.createTable('workout_sessions', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.integer('workout_id').unsigned().nullable()
                .references('id').inTable('workouts').onDelete('SET NULL');
            table.string('workout_name', 120).notNullable();
            table.timestamp('started_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('finished_at', { useTz: true }).nullable();
            table.string('status', 20).notNullable().defaultTo('in_progress');
            table.text('notes').nullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

            table.index(['user_id', 'status', 'started_at']);
            table.index(['user_id', 'workout_id']);
            table.check("?? in ('in_progress', 'completed')", ['status']);
        });

        await knex.raw(`
            CREATE UNIQUE INDEX workout_sessions_one_active_per_workout
            ON workout_sessions (user_id, workout_id)
            WHERE status = 'in_progress' AND workout_id IS NOT NULL
        `);
    }

    const exercisesExist = await knex.schema.hasTable('workout_session_exercises');
    if (!exercisesExist) {
        await knex.schema.createTable('workout_session_exercises', (table) => {
            table.increments('id').primary();
            table.integer('workout_session_id').unsigned().notNullable()
                .references('id').inTable('workout_sessions').onDelete('CASCADE');
            table.integer('workout_exercise_id').unsigned().nullable()
                .references('id').inTable('workout_exercises').onDelete('SET NULL');
            table.string('muscle_group_name', 80).notNullable();
            table.string('exercise_name', 120).notNullable();
            table.smallint('planned_sets').nullable();
            table.string('planned_reps', 30).nullable();
            table.decimal('planned_weight', 8, 2).nullable();
            table.smallint('performed_sets').nullable();
            table.string('performed_reps', 30).nullable();
            table.decimal('performed_weight', 8, 2).nullable();
            table.boolean('completed').notNullable().defaultTo(false);
            table.text('notes').nullable();
            table.integer('sort_order').notNullable().defaultTo(0);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

            table.index(['workout_session_id', 'sort_order']);
            table.check('?? is null or ?? between 1 and 100', ['performed_sets', 'performed_sets']);
            table.check('?? is null or ?? >= 0', ['performed_weight', 'performed_weight']);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    await knex.schema.dropTableIfExists('workout_session_exercises');
    await knex.schema.dropTableIfExists('workout_sessions');
};
