// Biblioteca de exercícios pronta, organizada por grupo muscular.
// Cada grupo define padrões (séries, repetições e descanso) e cada exercício
// informa apenas nome e equipamento.
const GROUPS = [
    {
        muscle_group: 'Peito',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 90,
        exercises: [
            ['Supino reto', 'Barra'],
            ['Supino inclinado', 'Barra'],
            ['Supino declinado', 'Barra'],
            ['Supino máquina', 'Máquina'],
            ['Supino com halteres', 'Halteres'],
            ['Crucifixo', 'Halteres'],
            ['Crossover', 'Polia'],
            ['Voador', 'Máquina'],
            ['Flexão de braço', 'Peso corporal'],
        ],
    },
    {
        muscle_group: 'Costas',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 90,
        exercises: [
            ['Puxada frontal', 'Polia'],
            ['Puxada aberta', 'Polia'],
            ['Remada baixa', 'Polia'],
            ['Remada curvada', 'Barra'],
            ['Remada unilateral', 'Halteres'],
            ['Pulldown', 'Polia'],
            ['Barra fixa', 'Peso corporal'],
            ['Levantamento terra', 'Barra'],
        ],
    },
    {
        muscle_group: 'Ombro',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 90,
        exercises: [
            ['Desenvolvimento com halteres', 'Halteres'],
            ['Desenvolvimento máquina', 'Máquina'],
            ['Elevação lateral', 'Halteres'],
            ['Elevação frontal', 'Halteres'],
            ['Crucifixo invertido', 'Máquina'],
            ['Remada alta', 'Barra'],
            ['Encolhimento', 'Halteres'],
        ],
    },
    {
        muscle_group: 'Bíceps',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 60,
        exercises: [
            ['Rosca direta', 'Barra'],
            ['Rosca alternada', 'Halteres'],
            ['Rosca martelo', 'Halteres'],
            ['Rosca Scott', 'Máquina'],
            ['Rosca concentrada', 'Halteres'],
            ['Rosca na polia', 'Polia'],
        ],
    },
    {
        muscle_group: 'Tríceps',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 60,
        exercises: [
            ['Tríceps corda', 'Polia'],
            ['Tríceps barra W', 'Barra'],
            ['Tríceps francês', 'Halteres'],
            ['Tríceps testa', 'Barra'],
            ['Mergulho', 'Peso corporal'],
            ['Tríceps coice', 'Halteres'],
        ],
    },
    {
        muscle_group: 'Pernas',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 90,
        exercises: [
            ['Agachamento livre', 'Barra'],
            ['Leg press', 'Máquina'],
            ['Cadeira extensora', 'Máquina'],
            ['Mesa flexora', 'Máquina'],
            ['Cadeira flexora', 'Máquina'],
            ['Stiff', 'Barra'],
            ['Afundo', 'Halteres'],
            ['Passada', 'Halteres'],
            ['Panturrilha em pé', 'Máquina'],
            ['Panturrilha sentado', 'Máquina'],
        ],
    },
    {
        muscle_group: 'Glúteos',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 60,
        exercises: [
            ['Elevação pélvica', 'Barra'],
            ['Cadeira abdutora', 'Máquina'],
            ['Glúteo na polia', 'Polia'],
            ['Coice na máquina', 'Máquina'],
            ['Agachamento sumô', 'Halteres'],
        ],
    },
    {
        muscle_group: 'Abdômen',
        default_sets: 3,
        default_reps: '15-20',
        default_rest_time_seconds: 45,
        exercises: [
            ['Abdominal tradicional', 'Peso corporal'],
            ['Abdominal infra', 'Peso corporal'],
            ['Prancha', 'Peso corporal'],
            ['Abdominal oblíquo', 'Peso corporal'],
            ['Elevação de pernas', 'Peso corporal'],
            ['Abdominal máquina', 'Máquina'],
        ],
    },
    {
        muscle_group: 'Cardio',
        default_sets: 1,
        default_reps: '20 min',
        default_rest_time_seconds: 60,
        exercises: [
            ['Esteira', 'Cardio'],
            ['Bicicleta', 'Cardio'],
            ['Elíptico', 'Cardio'],
            ['Escada', 'Cardio'],
            ['Corrida', 'Peso corporal'],
            ['Caminhada', 'Peso corporal'],
        ],
    },
];

function buildRows() {
    const rows = [];
    for (const group of GROUPS) {
        for (const [name, equipment] of group.exercises) {
            rows.push({
                name,
                muscle_group: group.muscle_group,
                equipment,
                default_sets: group.default_sets,
                default_reps: group.default_reps,
                default_rest_time_seconds: group.default_rest_time_seconds,
                is_active: true,
            });
        }
    }
    return rows;
}

/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function seed(knex) {
    const rows = buildRows();
    // Idempotente: em conflito de (name, muscle_group) apenas atualiza os padrões,
    // podendo rodar quantas vezes for necessário sem duplicar registros.
    await knex('exercise_library')
        .insert(rows)
        .onConflict(['name', 'muscle_group'])
        .merge([
            'equipment',
            'default_sets',
            'default_reps',
            'default_rest_time_seconds',
            'is_active',
            'updated_at',
        ]);
};
