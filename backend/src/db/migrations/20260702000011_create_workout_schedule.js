/**
 * Agenda semanal: um treino (ou dia de descanso) por dia da semana, por usuário.
 * day_of_week segue a convenção do JS (0 = Domingo ... 6 = Sábado), igual à
 * coluna workouts.day_of_week.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const hasTable = await knex.schema.hasTable('workout_schedule');
    if (hasTable) return;

    await knex.schema.createTable('workout_schedule', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');
        table.smallint('day_of_week').notNullable();
        // Se o treino vinculado for excluído, o dia volta a ficar vazio.
        table.integer('workout_id').unsigned().nullable()
            .references('id').inTable('workouts').onDelete('SET NULL');
        table.boolean('is_rest_day').notNullable().defaultTo(false);
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

        // No máximo um registro por usuário por dia da semana.
        table.unique(['user_id', 'day_of_week']);
        table.index(['user_id']);
        table.check('?? between 0 and 6', ['day_of_week']);
    });

    // Descanso e treino são mutuamente exclusivos: se for descanso, não há treino.
    await knex.raw(`
        ALTER TABLE workout_schedule
        ADD CONSTRAINT workout_schedule_rest_check
        CHECK (NOT (is_rest_day AND workout_id IS NOT NULL))
    `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    await knex.schema.dropTableIfExists('workout_schedule');
};
