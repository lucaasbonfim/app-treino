/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    await knex.schema.createTable('workouts', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');
        table.string('title', 120).notNullable();
        table.smallint('day_of_week').notNullable();
        table.text('notes').nullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.index(['user_id', 'day_of_week']);
        table.check('?? between 0 and 6', ['day_of_week']);
    });

    await knex.schema.createTable('workout_muscle_groups', (table) => {
        table.increments('id').primary();
        table.integer('workout_id').unsigned().notNullable()
            .references('id').inTable('workouts').onDelete('CASCADE');
        table.string('name', 80).notNullable();
        table.integer('sort_order').notNullable().defaultTo(0);
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.index(['workout_id', 'sort_order']);
    });

    await knex.schema.createTable('workout_exercises', (table) => {
        table.increments('id').primary();
        table.integer('muscle_group_id').unsigned().notNullable()
            .references('id').inTable('workout_muscle_groups').onDelete('CASCADE');
        table.string('name', 120).notNullable();
        table.smallint('sets').nullable();
        table.string('reps', 30).nullable();
        table.decimal('weight', 8, 2).nullable();
        table.text('notes').nullable();
        table.integer('sort_order').notNullable().defaultTo(0);
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.index(['muscle_group_id', 'sort_order']);
        table.check('?? is null or ?? between 1 and 100', ['sets', 'sets']);
        table.check('?? is null or ?? >= 0', ['weight', 'weight']);
    });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    await knex.schema.dropTableIfExists('workout_exercises');
    await knex.schema.dropTableIfExists('workout_muscle_groups');
    await knex.schema.dropTableIfExists('workouts');
};

