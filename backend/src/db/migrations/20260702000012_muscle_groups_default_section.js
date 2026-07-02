/**
 * Torna a "seção" (grupo muscular) opcional. Cada treino passa a ter uma seção
 * "default" (invisível na UI) que segura os exercícios soltos, acabando com a
 * repetição "Peito / Peito". Seções nomeadas continuam existindo para dividir
 * treinos grandes (ex.: Superiores / Inferiores).
 *
 * Backfill:
 *   - treino com exatamente 1 grupo  → esse grupo vira default;
 *   - treino sem nenhum grupo         → cria um grupo default (nome = título);
 *   - treino com vários grupos        → mantém como está (seções nomeadas).
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const hasColumn = await knex.schema.hasColumn('workout_muscle_groups', 'is_default');
    if (!hasColumn) {
        await knex.schema.alterTable('workout_muscle_groups', (table) => {
            table.boolean('is_default').notNullable().defaultTo(false);
        });
    }

    // Quantos grupos cada treino tem.
    const counts = await knex('workout_muscle_groups')
        .select('workout_id')
        .count({ total: '*' })
        .groupBy('workout_id');
    const countByWorkout = new Map(counts.map((row) => [row.workout_id, Number(row.total)]));

    // Treinos com exatamente 1 grupo: marca esse grupo como default.
    const singleGroupWorkoutIds = [...countByWorkout.entries()]
        .filter(([, total]) => total === 1)
        .map(([workoutId]) => workoutId);

    if (singleGroupWorkoutIds.length) {
        await knex('workout_muscle_groups')
            .whereIn('workout_id', singleGroupWorkoutIds)
            .update({ is_default: true });
    }

    // Treinos sem nenhum grupo: cria um grupo default (nome = título do treino).
    const workouts = await knex('workouts').select('id', 'title');
    const missing = workouts.filter((workout) => !countByWorkout.has(workout.id));
    if (missing.length) {
        await knex('workout_muscle_groups').insert(missing.map((workout) => ({
            workout_id: workout.id,
            name: String(workout.title || 'Exercícios').slice(0, 80),
            sort_order: 0,
            is_default: true,
        })));
    }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    if (await knex.schema.hasColumn('workout_muscle_groups', 'is_default')) {
        await knex.schema.alterTable('workout_muscle_groups', (table) => {
            table.dropColumn('is_default');
        });
    }
};
