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
            ['Supino inclinado com halteres', 'Halteres'],
            ['Supino declinado com halteres', 'Halteres'],
            ['Supino no Smith', 'Máquina'],
            ['Crucifixo', 'Halteres'],
            ['Crucifixo inclinado', 'Halteres'],
            ['Crucifixo na polia', 'Polia'],
            ['Crossover', 'Polia'],
            ['Crossover polia baixa', 'Polia'],
            ['Voador', 'Máquina'],
            ['Peck deck', 'Máquina'],
            ['Pullover', 'Halteres'],
            ['Flexão de braço', 'Peso corporal'],
            ['Flexão inclinada', 'Peso corporal'],
            ['Flexão declinada', 'Peso corporal'],
            ['Flexão diamante', 'Peso corporal'],
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
            ['Puxada supinada', 'Polia'],
            ['Puxada triângulo', 'Polia'],
            ['Remada cavalinho', 'Máquina'],
            ['Remada máquina', 'Máquina'],
            ['Remada T', 'Barra'],
            ['Remada com halteres', 'Halteres'],
            ['Remada na polia alta', 'Polia'],
            ['Barra fixa', 'Peso corporal'],
            ['Levantamento terra', 'Barra'],
            ['Hiperextensão lombar', 'Peso corporal'],
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
            ['Desenvolvimento militar', 'Barra'],
            ['Desenvolvimento Arnold', 'Halteres'],
            ['Desenvolvimento no Smith', 'Máquina'],
            ['Elevação lateral', 'Halteres'],
            ['Elevação lateral na polia', 'Polia'],
            ['Elevação frontal', 'Halteres'],
            ['Elevação frontal com barra', 'Barra'],
            ['Crucifixo invertido', 'Máquina'],
            ['Crucifixo invertido na polia', 'Polia'],
            ['Face pull', 'Polia'],
            ['Remada alta', 'Barra'],
            ['Encolhimento', 'Halteres'],
            ['Encolhimento com barra', 'Barra'],
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
            ['Rosca Scott com barra W', 'Barra'],
            ['Rosca concentrada', 'Halteres'],
            ['Rosca na polia', 'Polia'],
            ['Rosca 21', 'Barra'],
            ['Rosca inversa', 'Barra'],
            ['Rosca no banco inclinado', 'Halteres'],
            ['Rosca martelo na corda', 'Polia'],
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
            ['Tríceps testa com halteres', 'Halteres'],
            ['Tríceps na polia com barra', 'Polia'],
            ['Tríceps unilateral na polia', 'Polia'],
            ['Tríceps máquina', 'Máquina'],
            ['Supino fechado', 'Barra'],
            ['Mergulho', 'Peso corporal'],
            ['Tríceps banco', 'Peso corporal'],
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
            ['Stiff com halteres', 'Halteres'],
            ['Levantamento terra romeno', 'Barra'],
            ['Agachamento no Smith', 'Máquina'],
            ['Agachamento hack', 'Máquina'],
            ['Agachamento frontal', 'Barra'],
            ['Agachamento búlgaro', 'Halteres'],
            ['Cadeira adutora', 'Máquina'],
            ['Afundo', 'Halteres'],
            ['Passada', 'Halteres'],
            ['Panturrilha em pé', 'Máquina'],
            ['Panturrilha sentado', 'Máquina'],
            ['Panturrilha no leg press', 'Máquina'],
        ],
    },
    {
        muscle_group: 'Glúteos',
        default_sets: 3,
        default_reps: '10-12',
        default_rest_time_seconds: 60,
        exercises: [
            ['Elevação pélvica', 'Barra'],
            ['Elevação pélvica na máquina', 'Máquina'],
            ['Cadeira abdutora', 'Máquina'],
            ['Abdução na polia', 'Polia'],
            ['Glúteo na polia', 'Polia'],
            ['Coice na máquina', 'Máquina'],
            ['Coice na polia', 'Polia'],
            ['Agachamento sumô', 'Halteres'],
            ['Ponte de glúteo', 'Peso corporal'],
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
            ['Elevação de pernas na barra', 'Peso corporal'],
            ['Abdominal máquina', 'Máquina'],
            ['Abdominal na polia', 'Polia'],
            ['Abdominal bicicleta', 'Peso corporal'],
            ['Abdominal canivete', 'Peso corporal'],
            ['Prancha lateral', 'Peso corporal'],
            ['Russian twist', 'Peso corporal'],
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
            ['Remo ergométrico', 'Cardio'],
            ['Corrida', 'Peso corporal'],
            ['Caminhada', 'Peso corporal'],
            ['Pular corda', 'Peso corporal'],
            ['Polichinelo', 'Peso corporal'],
            ['Burpee', 'Peso corporal'],
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
