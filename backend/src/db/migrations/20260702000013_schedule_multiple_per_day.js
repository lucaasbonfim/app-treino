/**
 * Agenda passa a aceitar VÁRIOS treinos (blocos) por dia + marca de descanso.
 * Substitui a tabela workout_schedule (1 treino por dia) por:
 *   - schedule_day_workouts: dia da semana → N treinos, com ordem;
 *   - schedule_rest_days:    dia marcado como descanso.
 * A tabela antiga era recente e só guardava overrides, então é recriada no
 * rollback sem perda relevante.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    await knex.schema.dropTableIfExists('workout_schedule');

    if (!(await knex.schema.hasTable('schedule_day_workouts'))) {
        await knex.schema.createTable('schedule_day_workouts', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.smallint('day_of_week').notNullable();
            table.integer('workout_id').unsigned().notNullable()
                .references('id').inTable('workouts').onDelete('CASCADE');
            table.integer('sort_order').notNullable().defaultTo(0);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

            table.unique(['user_id', 'day_of_week', 'workout_id']);
            table.index(['user_id', 'day_of_week']);
            table.check('?? between 0 and 6', ['day_of_week']);
        });
    }

    if (!(await knex.schema.hasTable('schedule_rest_days'))) {
        await knex.schema.createTable('schedule_rest_days', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.smallint('day_of_week').notNullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

            table.unique(['user_id', 'day_of_week']);
            table.check('?? between 0 and 6', ['day_of_week']);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    await knex.schema.dropTableIfExists('schedule_day_workouts');
    await knex.schema.dropTableIfExists('schedule_rest_days');

    if (!(await knex.schema.hasTable('workout_schedule'))) {
        await knex.schema.createTable('workout_schedule', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.smallint('day_of_week').notNullable();
            table.integer('workout_id').unsigned().nullable()
                .references('id').inTable('workouts').onDelete('SET NULL');
            table.boolean('is_rest_day').notNullable().defaultTo(false);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

            table.unique(['user_id', 'day_of_week']);
            table.index(['user_id']);
            table.check('?? between 0 and 6', ['day_of_week']);
        });
        await knex.raw(`
            ALTER TABLE workout_schedule
            ADD CONSTRAINT workout_schedule_rest_check
            CHECK (NOT (is_rest_day AND workout_id IS NOT NULL))
        `);
    }
};
