/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    if (!await knex.schema.hasColumn('workout_session_exercises', 'exercise_library_id')) {
        await knex.schema.alterTable('workout_session_exercises', (table) => {
            table.integer('exercise_library_id').unsigned().nullable()
                .references('id').inTable('exercise_library').onDelete('SET NULL');
            table.index(['exercise_library_id']);
        });
    }

    if (!await knex.schema.hasColumn('workout_session_exercises', 'last_performed_at')) {
        await knex.schema.alterTable('workout_session_exercises', (table) => {
            table.timestamp('last_performed_at', { useTz: true }).nullable();
        });
    }

    if (!await knex.schema.hasColumn('workout_session_sets', 'previous_performed_reps')) {
        await knex.schema.alterTable('workout_session_sets', (table) => {
            table.string('previous_performed_reps', 30).nullable();
        });
    }

    if (!await knex.schema.hasColumn('workout_session_sets', 'previous_performed_weight')) {
        await knex.schema.alterTable('workout_session_sets', (table) => {
            table.decimal('previous_performed_weight', 8, 2).nullable();
        });
    }

    if (!await knex.schema.hasColumn('workout_session_sets', 'has_previous_performance')) {
        await knex.schema.alterTable('workout_session_sets', (table) => {
            table.boolean('has_previous_performance').notNullable().defaultTo(false);
        });
    }

    // Preserva a identidade da biblioteca em snapshots criados antes desta migration.
    await knex.raw(`
        UPDATE workout_session_exercises AS session_exercise
        SET exercise_library_id = workout_exercise.exercise_library_id
        FROM workout_exercises AS workout_exercise
        WHERE session_exercise.workout_exercise_id = workout_exercise.id
          AND session_exercise.exercise_library_id IS NULL
          AND workout_exercise.exercise_library_id IS NOT NULL
    `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    if (await knex.schema.hasColumn('workout_session_sets', 'has_previous_performance')) {
        await knex.schema.alterTable('workout_session_sets', (table) => {
            table.dropColumn('has_previous_performance');
        });
    }
    if (await knex.schema.hasColumn('workout_session_sets', 'previous_performed_weight')) {
        await knex.schema.alterTable('workout_session_sets', (table) => {
            table.dropColumn('previous_performed_weight');
        });
    }
    if (await knex.schema.hasColumn('workout_session_sets', 'previous_performed_reps')) {
        await knex.schema.alterTable('workout_session_sets', (table) => {
            table.dropColumn('previous_performed_reps');
        });
    }
    if (await knex.schema.hasColumn('workout_session_exercises', 'last_performed_at')) {
        await knex.schema.alterTable('workout_session_exercises', (table) => {
            table.dropColumn('last_performed_at');
        });
    }
    if (await knex.schema.hasColumn('workout_session_exercises', 'exercise_library_id')) {
        await knex.schema.alterTable('workout_session_exercises', (table) => {
            table.dropColumn('exercise_library_id');
        });
    }
};
