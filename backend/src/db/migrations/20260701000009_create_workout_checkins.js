/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const hasGoal = await knex.schema.hasColumn('users', 'weekly_goal_trainings');
    if (!hasGoal) {
        await knex.schema.alterTable('users', (table) => {
            table.smallint('weekly_goal_trainings').notNullable().defaultTo(3);
        });
        await knex.raw(`
            ALTER TABLE users
            ADD CONSTRAINT users_weekly_goal_check
            CHECK (weekly_goal_trainings BETWEEN 1 AND 7)
        `);
    }

    const hasCheckins = await knex.schema.hasTable('workout_checkins');
    if (!hasCheckins) {
        await knex.schema.createTable('workout_checkins', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.integer('workout_session_id').unsigned().nullable()
                .references('id').inTable('workout_sessions').onDelete('SET NULL');
            table.date('checkin_date').notNullable();
            table.string('source', 20).notNullable().defaultTo('manual');
            table.text('notes').nullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

            // Um check-in por usuário por dia.
            table.unique(['user_id', 'checkin_date']);
            table.index(['user_id', 'checkin_date']);
            table.check("?? in ('session', 'manual')", ['source']);
        });

        // Backfill: gera check-ins a partir das sessões já finalizadas, um por
        // usuário por dia, reaproveitando os dados existentes.
        const sessions = await knex('workout_sessions')
            .where({ status: 'completed' })
            .whereNotNull('finished_at')
            .select('id', 'user_id', 'finished_at')
            .orderBy('finished_at', 'asc');

        const seen = new Set();
        const rows = [];
        for (const session of sessions) {
            const date = new Date(session.finished_at).toLocaleDateString('en-CA');
            const key = `${session.user_id}|${date}`;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({
                user_id: session.user_id,
                workout_session_id: session.id,
                checkin_date: date,
                source: 'session',
            });
        }
        if (rows.length) {
            await knex('workout_checkins')
                .insert(rows)
                .onConflict(['user_id', 'checkin_date'])
                .ignore();
        }
    }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    await knex.schema.dropTableIfExists('workout_checkins');
    if (await knex.schema.hasColumn('users', 'weekly_goal_trainings')) {
        await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_weekly_goal_check');
        await knex.schema.alterTable('users', (table) => {
            table.dropColumn('weekly_goal_trainings');
        });
    }
};
