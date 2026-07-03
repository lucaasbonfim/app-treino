/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const hasAbandonedAt = await knex.schema.hasColumn('workout_sessions', 'abandoned_at');
    if (!hasAbandonedAt) {
        await knex.schema.alterTable('workout_sessions', (table) => {
            table.timestamp('abandoned_at', { useTz: true }).nullable();
        });
    }

    await knex.raw(`
        ALTER TABLE workout_sessions
        DROP CONSTRAINT IF EXISTS workout_sessions_status_check
    `);
    await knex.raw(`
        ALTER TABLE workout_sessions
        ADD CONSTRAINT workout_sessions_status_check
        CHECK (status IN ('in_progress', 'completed', 'abandoned'))
    `);

    // A regra anterior permitia uma sessão aberta por treino. Mantém a sessão
    // mais recente de cada usuário e abandona as demais antes de criar o novo índice.
    await knex.raw(`
        WITH ranked_sessions AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id
                    ORDER BY started_at DESC, id DESC
                ) AS position
            FROM workout_sessions
            WHERE status = 'in_progress'
        )
        UPDATE workout_sessions
        SET
            status = 'abandoned',
            abandoned_at = NOW(),
            updated_at = NOW()
        WHERE id IN (
            SELECT id
            FROM ranked_sessions
            WHERE position > 1
        )
    `);

    await knex.raw('DROP INDEX IF EXISTS workout_sessions_one_active_per_workout');
    await knex.raw(`
        CREATE UNIQUE INDEX workout_sessions_one_active_per_user
        ON workout_sessions (user_id)
        WHERE status = 'in_progress'
    `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    await knex.raw('DROP INDEX IF EXISTS workout_sessions_one_active_per_user');

    await knex('workout_sessions')
        .where({ status: 'abandoned' })
        .update({
            status: 'completed',
            finished_at: knex.raw('COALESCE(finished_at, abandoned_at, NOW())'),
            updated_at: knex.fn.now(),
        });

    await knex.raw(`
        ALTER TABLE workout_sessions
        DROP CONSTRAINT IF EXISTS workout_sessions_status_check
    `);
    await knex.raw(`
        ALTER TABLE workout_sessions
        ADD CONSTRAINT workout_sessions_status_check
        CHECK (status IN ('in_progress', 'completed'))
    `);

    if (await knex.schema.hasColumn('workout_sessions', 'abandoned_at')) {
        await knex.schema.alterTable('workout_sessions', (table) => {
            table.dropColumn('abandoned_at');
        });
    }

    await knex.raw(`
        CREATE UNIQUE INDEX workout_sessions_one_active_per_workout
        ON workout_sessions (user_id, workout_id)
        WHERE status = 'in_progress' AND workout_id IS NOT NULL
    `);
};
