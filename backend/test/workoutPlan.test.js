const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePlan, buildLibraryIndex, nameKey } = require('../src/utils/workoutPlan');

const library = buildLibraryIndex([
    {
        id: 7,
        name: 'Supino inclinado com halteres',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 90,
    },
]);

test('compara nomes ignorando acento, caixa e espaço extra', () => {
    assert.equal(nameKey('  Tríceps   TESTA '), 'triceps testa');
});

test('encaixa o plano da IA nas regras do app', () => {
    const { workouts } = normalizePlan({
        workouts: [{
            title: '  Treino A - Peito  ',
            icon: 'inexistente',
            days: [1, 1, 4, 9, 'x'],
            sections: [{
                name: 'Peito',
                exercises: [{
                    name: 'Supino reto',
                    sets: '4',
                    reps: '8 a 12',
                    weight: '40,5',
                    rest_time_seconds: 70,
                }],
            }],
        }],
    });

    const [workout] = workouts;
    assert.equal(workout.title, 'Treino A - Peito');
    assert.equal(workout.icon, 'fitness_center', 'ícone inválido cai no padrão');
    assert.deepEqual(workout.days, [1, 4], 'dias repetidos e inválidos somem');

    const [exercise] = workout.sections[0].exercises;
    assert.equal(exercise.sets, 4);
    assert.equal(exercise.reps, '8 a 12');
    assert.equal(exercise.weight, null, 'carga em formato não numérico é descartada');
    assert.equal(exercise.rest_time_seconds, 60, '70s cai no valor permitido mais próximo');
});

test('vincula o exercício à biblioteca sem inventar séries e repetições', () => {
    const { workouts } = normalizePlan({
        workouts: [{
            title: 'Peito',
            sections: [{ exercises: [{ name: 'supino INCLINADO com halteres' }] }],
        }],
    }, library);

    const [exercise] = workouts[0].sections[0].exercises;
    assert.equal(exercise.name, 'Supino inclinado com halteres', 'adota o nome oficial');
    assert.equal(exercise.exercise_library_id, 7);
    // Séries e reps ficam vazios de propósito: o padrão da biblioteca esconderia
    // o que a leitura não conseguiu tirar da ficha.
    assert.equal(exercise.sets, null);
    assert.equal(exercise.reps, null);
    assert.equal(exercise.rest_time_seconds, 90, 'só o descanso herda o padrão');
});

test('carga simbólica da IA não vira "0 kg" na ficha', () => {
    const { workouts } = normalizePlan({
        workouts: [{
            title: 'Peito',
            sections: [{ exercises: [
                { name: 'A', weight: 0 },
                { name: 'B', weight: 0.001 },
                { name: 'C', weight: -5 },
                { name: 'D', weight: 22.5 },
            ] }],
        }],
    });

    assert.deepEqual(
        workouts[0].sections[0].exercises.map((exercise) => exercise.weight),
        [null, null, null, 22.5],
    );
});

test('seção com o nome do próprio treino vira a seção default', () => {
    const { workouts } = normalizePlan({
        workouts: [{
            title: 'Costas',
            sections: [
                { name: 'costas', exercises: [{ name: 'Remada curvada' }] },
                { name: 'Bíceps', exercises: [{ name: 'Rosca direta' }] },
            ],
        }],
    });

    assert.equal(workouts[0].sections[0].name, null);
    assert.equal(workouts[0].sections[1].name, 'Bíceps');
});

test('descarta treino e seção sem exercício', () => {
    const { workouts } = normalizePlan({
        workouts: [
            { title: 'Vazio', sections: [{ name: 'Peito', exercises: [] }] },
            { title: '', sections: [{ exercises: [{ name: 'Agachamento' }] }] },
            { title: 'Pernas', sections: [{ exercises: [{ name: 'Agachamento' }] }] },
        ],
    });

    assert.deepEqual(workouts.map((workout) => workout.title), ['Pernas']);
});

test('descanso não convive com treino no mesmo dia', () => {
    const plan = normalizePlan({
        workouts: [{ title: 'Pernas', days: [3], sections: [{ exercises: [{ name: 'Agachamento' }] }] }],
        rest_days: [0, 3, 6],
    });

    assert.deepEqual(plan.rest_days, [0, 6]);
});

test('respeita os tetos de tamanho do plano', () => {
    const exercises = Array.from({ length: 80 }, (_, index) => ({ name: `Exercício ${index}` }));
    const plan = normalizePlan({
        workouts: Array.from({ length: 20 }, () => ({
            title: 'Treino',
            sections: [{ exercises }],
        })),
    });

    assert.equal(plan.workouts.length, 12);
    assert.equal(plan.workouts[0].sections[0].exercises.length, 60);
});
