/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const exists = await knex.schema.hasTable('workout_session_sets');
    if (!exists) {
        await knex.schema.createTable('workout_session_sets', (table) => {
            table.increments('id').primary();
            table.integer('workout_session_id').unsigned().notNullable()
                .references('id').inTable('workout_sessions').onDelete('CASCADE');
            table.integer('workout_session_exercise_id').unsigned().notNullable()
                .references('id').inTable('workout_session_exercises').onDelete('CASCADE');
            table.integer('workout_exercise_id').unsigned().nullable()
                .references('id').inTable('workout_exercises').onDelete('SET NULL');
            table.smallint('set_number').notNullable();
            table.string('planned_reps', 30).nullable();
            table.decimal('planned_weight', 8, 2).nullable();
            table.string('performed_reps', 30).nullable();
            table.decimal('performed_weight', 8, 2).nullable();
            table.boolean('completed').notNullable().defaultTo(false);
            table.timestamp('completed_at', { useTz: true }).nullable();
            table.text('notes').nullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

            table.index(['workout_session_id']);
            table.index(['workout_session_exercise_id', 'set_number']);
            table.unique(['workout_session_exercise_id', 'set_number']);
            table.check('?? between 1 and 100', ['set_number']);
            table.check('?? is null or ?? >= 0', ['performed_weight', 'performed_weight']);
        });

        // Backfill: gera as séries das sessões já existentes a partir do snapshot
        // salvo em cada exercício da sessão, mantendo compatibilidade com sessões
        // criadas antes desta funcionalidade.
        const exercises = await knex('workout_session_exercises').select('*');
        const rows = [];
        for (const exercise of exercises) {
            const count = Math.max(
                1,
                Number(exercise.planned_sets) || Number(exercise.performed_sets) || 1,
            );
            for (let setNumber = 1; setNumber <= count; setNumber += 1) {
                rows.push({
                    workout_session_id: exercise.workout_session_id,
                    workout_session_exercise_id: exercise.id,
                    workout_exercise_id: exercise.workout_exercise_id,
                    set_number: setNumber,
                    planned_reps: exercise.planned_reps,
                    planned_weight: exercise.planned_weight,
                    performed_reps: exercise.performed_reps ?? exercise.planned_reps,
                    performed_weight: exercise.performed_weight ?? exercise.planned_weight,
                    completed: exercise.completed,
                    completed_at: exercise.completed ? exercise.updated_at : null,
                });
            }
        }
        if (rows.length) {
            await knex.batchInsert('workout_session_sets', rows, 500);
        }
    }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    await knex.schema.dropTableIfExists('workout_session_sets');
};
