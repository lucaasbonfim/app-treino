const db = require('../db/connection');

// Coloca os treinos criados na agenda. Segue as mesmas regras do
// schedule.repository: descanso e treino são exclusivos no mesmo dia, e um
// treino novo entra depois dos que já estavam naquele dia.
async function applySchedule(trx, userId, created, restDays) {
    const busyDays = [...new Set(created.flatMap((workout) => workout.days))];

    if (busyDays.length) {
        await trx('schedule_rest_days')
            .where({ user_id: userId })
            .whereIn('day_of_week', busyDays)
            .del();

        const maxRows = await trx('schedule_day_workouts')
            .where({ user_id: userId })
            .whereIn('day_of_week', busyDays)
            .select('day_of_week')
            .max('sort_order as max')
            .groupBy('day_of_week');
        const nextByDay = new Map(maxRows.map((row) => [row.day_of_week, Number(row.max) + 1]));

        const rows = [];
        for (const workout of created) {
            for (const day of workout.days) {
                const sortOrder = nextByDay.get(day) ?? 0;
                nextByDay.set(day, sortOrder + 1);
                rows.push({
                    user_id: userId,
                    day_of_week: day,
                    workout_id: workout.id,
                    sort_order: sortOrder,
                });
            }
        }
        if (rows.length) await trx('schedule_day_workouts').insert(rows);
    }

    if (restDays.length) {
        await trx('schedule_day_workouts')
            .where({ user_id: userId })
            .whereIn('day_of_week', restDays)
            .del();
        await trx('schedule_rest_days')
            .insert(restDays.map((day) => ({ user_id: userId, day_of_week: day })))
            .onConflict(['user_id', 'day_of_week'])
            .ignore();
    }
}

async function createWorkout(trx, userId, plan) {
    const [workout] = await trx('workouts')
        .insert({
            user_id: userId,
            title: plan.title,
            icon: plan.icon,
            // A agenda guarda todos os dias; workouts.day_of_week continua sendo
            // só o fallback de quem não foi agendado à mão.
            day_of_week: plan.days[0] ?? 1,
            notes: plan.notes,
        })
        .returning(['id', 'title']);

    // Mesma regra de workout.service.create: toda ficha nasce com a seção
    // default (invisível) que segura os exercícios soltos.
    const [defaultGroup] = await trx('workout_muscle_groups')
        .insert({
            workout_id: workout.id,
            name: plan.title.slice(0, 80),
            sort_order: 0,
            is_default: true,
        })
        .returning(['id']);

    const exercises = [];
    const nextOrderByGroup = new Map();
    let nextSectionOrder = 1;

    for (const section of plan.sections) {
        let groupId = defaultGroup.id;
        if (section.name) {
            const [group] = await trx('workout_muscle_groups')
                .insert({
                    workout_id: workout.id,
                    name: section.name,
                    sort_order: nextSectionOrder,
                    is_default: false,
                })
                .returning(['id']);
            groupId = group.id;
            nextSectionOrder += 1;
        }

        let sortOrder = nextOrderByGroup.get(groupId) ?? 0;
        for (const exercise of section.exercises) {
            exercises.push({ ...exercise, muscle_group_id: groupId, sort_order: sortOrder });
            sortOrder += 1;
        }
        nextOrderByGroup.set(groupId, sortOrder);
    }

    if (exercises.length) await trx('workout_exercises').insert(exercises);

    return { id: workout.id, title: workout.title, days: plan.days };
}

// Grava o plano inteiro numa transação: ou entra tudo, ou nada. Meia ficha
// importada seria pior do que nenhuma.
function createPlan(userId, plan) {
    return db.transaction(async (trx) => {
        const created = [];
        for (const workout of plan.workouts) {
            created.push(await createWorkout(trx, userId, workout));
        }
        await applySchedule(trx, userId, created, plan.rest_days);
        return created;
    });
}

module.exports = { createPlan };
