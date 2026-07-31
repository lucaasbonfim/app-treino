const {
    WORKOUT_ICON_SET,
    DEFAULT_WORKOUT_ICON,
    REST_TIMES,
    DEFAULT_REST_TIME,
} = require('./workoutOptions');

// Teto de segurança: uma resposta desgovernada da IA (ou um payload malicioso
// vindo da tela de conferência) não pode virar centenas de INSERTs.
const LIMITS = {
    workouts: 12,
    sections: 12,
    exercises: 60,
};

function clean(value, maxLength) {
    if (value === undefined || value === null) return null;
    const result = String(value).replace(/\s+/g, ' ').trim();
    if (!result) return null;
    return result.slice(0, maxLength);
}

// Chave de comparação de nomes: sem acento, sem caixa, sem espaço sobrando.
function nameKey(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function toArray(value, limit) {
    return Array.isArray(value) ? value.slice(0, limit) : [];
}

function positiveInteger(value, { min, max }) {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) return null;
    if (parsed < min || parsed > max) return null;
    return parsed;
}

// Arredonda antes de comparar: a IA às vezes manda uma carga simbólica (0, 0.0,
// frações mínimas) só para não deixar o campo vazio, e isso tem que virar null
// em vez de um "0 kg" que a pessoa acha que veio da ficha.
function weight(value) {
    const parsed = Math.round(Number(value) * 100) / 100;
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 999999.99) return null;
    return parsed;
}

// O app só aceita descansos fechados; qualquer outro valor cai no mais próximo.
function restTime(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_REST_TIME;
    return REST_TIMES.reduce(
        (closest, option) => (Math.abs(option - parsed) < Math.abs(closest - parsed) ? option : closest),
        REST_TIMES[0],
    );
}

function days(value) {
    const result = new Set();
    for (const item of toArray(value, 7)) {
        const day = positiveInteger(item, { min: 0, max: 6 });
        if (day !== null) result.add(day);
    }
    return [...result].sort((a, b) => a - b);
}

function icon(value) {
    return WORKOUT_ICON_SET.has(value) ? value : DEFAULT_WORKOUT_ICON;
}

// Quando o exercício existe na biblioteca, adota o nome oficial e o vínculo —
// é isso que faz o histórico/evolução casar com o resto do app.
//
// Séries e repetições NÃO ganham valor padrão: se a leitura não trouxe, o campo
// fica vazio na tela de conferência. Preencher com o padrão da biblioteca
// esconderia justamente o que a pessoa precisa corrigir. O descanso é a exceção
// — a execução do treino precisa de um número e nenhuma ficha dá isso sempre.
function exercise(raw, library) {
    const name = clean(raw?.name, 120);
    if (!name) return null;

    const known = library.get(nameKey(name));

    return {
        name: known ? known.name : name,
        exercise_library_id: known ? known.id : null,
        sets: positiveInteger(raw?.sets, { min: 1, max: 100 }),
        reps: clean(raw?.reps, 30),
        weight: weight(raw?.weight),
        rest_time_seconds: raw?.rest_time_seconds === undefined || raw?.rest_time_seconds === null
            ? restTime(known?.default_rest_time_seconds)
            : restTime(raw.rest_time_seconds),
        notes: clean(raw?.notes, 2000),
    };
}

// Uma seção sem nome (ou com o nome do próprio treino) é a seção default
// invisível — o mesmo contrato de workouts-optional-sections.
function section(raw, workoutTitle, library) {
    const exercises = toArray(raw?.exercises, LIMITS.exercises)
        .map((item) => exercise(item, library))
        .filter(Boolean);
    if (!exercises.length) return null;

    const name = clean(raw?.name, 80);
    const isDefault = !name || nameKey(name) === nameKey(workoutTitle);
    return { name: isDefault ? null : name, exercises };
}

function workout(raw, library) {
    const title = clean(raw?.title, 120);
    if (!title) return null;

    const sections = toArray(raw?.sections, LIMITS.sections)
        .map((item) => section(item, title, library))
        .filter(Boolean);
    if (!sections.length) return null;

    return {
        title,
        icon: icon(raw?.icon),
        notes: clean(raw?.notes, 2000),
        days: days(raw?.days),
        sections,
    };
}

/**
 * Deixa um plano (venha da IA ou da tela de conferência) dentro das regras do
 * domínio. Nada aqui confia na entrada: o que não encaixa é ajustado ou some.
 *
 * @param {object} raw
 * @param {Map<string, object>} [library] Índice da biblioteca por nome normalizado.
 */
function normalizePlan(raw, library = new Map()) {
    const workouts = toArray(raw?.workouts, LIMITS.workouts)
        .map((item) => workout(item, library))
        .filter(Boolean);

    // Descanso e treino no mesmo dia não existem: o treino ganha.
    const busy = new Set(workouts.flatMap((item) => item.days));
    const restDays = days(raw?.rest_days).filter((day) => !busy.has(day));

    return {
        workouts,
        rest_days: restDays,
        summary: clean(raw?.summary, 400),
    };
}

// Índice da biblioteca por nome normalizado, para casar o que a IA leu com o
// exercício cadastrado.
function buildLibraryIndex(rows) {
    const index = new Map();
    for (const row of rows || []) {
        const key = nameKey(row.name);
        if (key && !index.has(key)) index.set(key, row);
    }
    return index;
}

module.exports = { normalizePlan, buildLibraryIndex, nameKey, LIMITS };
