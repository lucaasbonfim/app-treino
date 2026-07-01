/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const libraryExists = await knex.schema.hasTable('exercise_library');
    if (!libraryExists) {
        await knex.schema.createTable('exercise_library', (table) => {
            table.increments('id').primary();
            table.string('name', 120).notNullable();
            table.string('muscle_group', 80).notNullable();
            table.text('description').nullable();
            table.smallint('default_sets').nullable();
            table.string('default_reps', 30).nullable();
            table.smallint('default_rest_time_seconds').notNullable().defaultTo(60);
            table.string('equipment', 60).nullable();
            table.boolean('is_active').notNullable().defaultTo(true);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

            table.unique(['name', 'muscle_group']);
            table.index(['muscle_group', 'is_active']);
            table.check('?? is null or ?? between 1 and 100', ['default_sets', 'default_sets']);
        });
    }

    // Vincula o exercício do treino ao cadastro original da biblioteca (opcional).
    // Exercícios manuais continuam com a coluna nula.
    const hasLink = await knex.schema.hasColumn('workout_exercises', 'exercise_library_id');
    if (!hasLink) {
        await knex.schema.alterTable('workout_exercises', (table) => {
            table.integer('exercise_library_id').unsigned().nullable()
                .references('id').inTable('exercise_library').onDelete('SET NULL');
            table.index(['exercise_library_id']);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    if (await knex.schema.hasColumn('workout_exercises', 'exercise_library_id')) {
        await knex.schema.alterTable('workout_exercises', (table) => {
            table.dropColumn('exercise_library_id');
        });
    }
    await knex.schema.dropTableIfExists('exercise_library');
};
