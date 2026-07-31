const gemini = require('./gemini.service');
const libraryRepository = require('../repositories/exerciseLibrary.repository');
const importRepository = require('../repositories/workoutImport.repository');
const { normalizePlan, buildLibraryIndex, LIMITS } = require('../utils/workoutPlan');
const { WORKOUT_ICONS, REST_TIMES } = require('../utils/workoutOptions');
const { createRateLimit } = require('../utils/rateLimit');
const { integer, optionalText } = require('../utils/validation');
const { badRequest, HttpError } = require('../utils/httpError');

const MAX_TEXT_LENGTH = 8000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

// Ler uma ficha custa uma chamada paga; 8 leituras por minuto por usuário já é
// bem mais do que um uso normal.
const consumeQuota = createRateLimit({ max: 8, windowMs: 60000 });

// A API recusa `maxItems` no response_format (400 invalid_request), então os
// tetos ficam só na descrição — quem realmente corta é normalizePlan.
const PLAN_SCHEMA = {
    type: 'object',
    properties: {
        workouts: {
            type: 'array',
            description: `No máximo ${LIMITS.workouts} treinos.`,
            items: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Nome do treino, ex.: "Treino A - Peito e Tríceps"' },
                    icon: { type: 'string', enum: WORKOUT_ICONS },
                    days: {
                        type: 'array',
                        items: { type: 'integer', minimum: 0, maximum: 6 },
                        description: 'Dias da semana (0=domingo ... 6=sábado). Vazio quando a ficha não informa.',
                    },
                    notes: { type: 'string' },
                    sections: {
                        type: 'array',
                        description: `No máximo ${LIMITS.sections} seções por treino.`,
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', description: 'Grupo muscular. Vazio quando o treino não é dividido.' },
                                exercises: {
                                    type: 'array',
                                    description: `No máximo ${LIMITS.exercises} exercícios por seção.`,
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            sets: {
                                                type: 'integer',
                                                minimum: 1,
                                                maximum: 100,
                                                description: 'Séries. Em "4x10" é o 4.',
                                            },
                                            reps: {
                                                type: 'string',
                                                description: 'Repetições exatamente como na ficha ("10", "8-12", "até a falha"). Em "4x10" o valor é "10". String vazia só quando a ficha realmente não informa.',
                                            },
                                            weight: {
                                                type: 'number',
                                                description: 'Carga em kg. Só quando a ficha escreve a carga com unidade; nunca o número de repetições.',
                                            },
                                            rest_time_seconds: {
                                                type: 'integer',
                                                minimum: REST_TIMES[0],
                                                maximum: REST_TIMES[REST_TIMES.length - 1],
                                                description: `Use um destes: ${REST_TIMES.join(', ')}.`,
                                            },
                                            notes: { type: 'string' },
                                        },
                                        // reps é obrigatório de propósito: sendo opcional, o modelo
                                        // preenchia sets/weight e simplesmente pulava as repetições.
                                        // String vazia é a saída quando a ficha não informa.
                                        required: ['name', 'reps'],
                                    },
                                },
                            },
                            required: ['exercises'],
                        },
                    },
                },
                required: ['title', 'sections'],
            },
        },
        rest_days: {
            type: 'array',
            items: { type: 'integer', minimum: 0, maximum: 6 },
            description: 'Dias marcados explicitamente como descanso.',
        },
        summary: { type: 'string', description: 'Uma frase em português sobre o que ficou dúbio ou faltando.' },
    },
    required: ['workouts'],
};

const ICONS_HELP = [
    'Ícones (campo icon): fitness_center=musculação, directions_run=corrida, sports_gymnastics=funcional,',
    'self_improvement=mobilidade/alongamento, sports_martial_arts=luta, hiking=outdoor, favorite=cardio,',
    'local_fire_department=treino intenso. Na dúvida, use fitness_center.',
].join('\n');

// Perfis aceitos no modo "montar". O rótulo é o que vai no prompt.
const LEVELS = new Map([
    ['iniciante', 'iniciante (nunca treinou ou está voltando depois de muito tempo)'],
    ['intermediario', 'intermediário (treina com constância há alguns meses)'],
    ['avancado', 'avançado (treina há anos)'],
]);

const GOALS = new Map([
    ['hipertrofia', 'ganhar massa muscular'],
    ['forca', 'ganhar força'],
    ['emagrecimento', 'emagrecer e definir'],
    ['condicionamento', 'condicionamento físico geral'],
]);

// Modo "ler": transcrever uma ficha que já existe. A regra aqui é nunca inventar.
const READ_INSTRUCTION = [
    'Você extrai fichas de treino de academia para o app KorVix Gym e responde só com o JSON pedido.',
    '',
    'Regras:',
    '- Use apenas o que está na ficha enviada. Nunca invente exercícios, séries, cargas ou dias.',
    '- Cada "workout" é um bloco reutilizável de treino (ex.: "Treino A - Peito e Tríceps", "Costas e Bíceps").',
    '- days: 0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado.',
    '  Preencha somente quando a ficha disser o dia. Se ela usa "Treino A/B/C" sem citar dias, deixe days vazio.',
    '- rest_days: só dias que a ficha marca como descanso/off/folga.',
    '- sections: use apenas quando o MESMO treino aparece dividido em mais de um grupo muscular na ficha.',
    '  Caso contrário, devolva uma única seção com name vazio.',
    '- A notação "AxB" (também "A x B", "A×B", "A séries de B") é SÉRIES x REPETIÇÕES:',
    '  "Supino 4x10" → sets=4, reps="10". O segundo número NUNCA é carga.',
    '  "Supino reto 4x10 - 40kg" → sets=4, reps="10", weight=40. Preencha os três; a carga não substitui as repetições.',
    '  Número seguido de segundos/minutos é descanso, nunca carga ("descanso 90 segundos" não é weight=90).',
    '- reps: sempre preencha quando a ficha informar, copiando como está ("10", "8-12", "até a falha"),',
    '  no máximo 30 caracteres. Não troque pelo que você acha que seria o normal para o exercício.',
    '- weight: só preencha quando a carga vier escrita com unidade ("40kg", "40 kg", "carga: 40").',
    '  Sem unidade, omita o campo. Na dúvida, omita.',
    '- rest_time_seconds: use o valor mais próximo entre 30, 45, 60, 90 e 120. Se a ficha der o descanso',
    '  de um treino inteiro ("descanso 90 segundos"), aplique a todos os exercícios daquele treino.',
    '  Se a ficha não disser nada sobre descanso, omita.',
    '- title: use o nome que está na ficha. Se ela só diz "Treino A", complete com os grupos musculares',
    '  daqueles exercícios ("Treino A - Peito e Tríceps"). Não invente letras que a ficha não usa.',
    '- summary: uma frase curta em português sobre o que ficou ilegível ou em dúvida. Vazio se estiver tudo claro.',
    '- Se o conteúdo enviado não for uma ficha de treino, devolva workouts vazio e explique em summary.',
    '',
    ICONS_HELP,
].join('\n');

// Modo "montar": a pessoa não tem ficha, descreveu o que quer. Aqui a IA cria —
// mas só com exercícios do catálogo, para o histórico e a evolução continuarem
// batendo com o resto do app.
const BUILD_INSTRUCTION = [
    'Você monta fichas de treino de academia para o app KorVix Gym e responde só com o JSON pedido.',
    '',
    'Regras:',
    '- Monte uma rotina completa e coerente com o nível, a frequência e o objetivo informados.',
    '- Use SOMENTE exercícios da lista de referência, com o nome escrito exatamente como está lá.',
    '- Crie um "workout" para cada dia de treino da semana, sem repetir o mesmo bloco em dias diferentes.',
    '- days: 0=domingo, 1=segunda ... 6=sábado. Distribua deixando descanso entre treinos do mesmo grupo:',
    '  2x → [1] e [4]; 3x → [1], [3], [5]; 4x → [1], [2], [4], [5]; 5x → [1] a [5]; 6x → [1] a [6].',
    '- rest_days: todos os dias da semana que ficaram sem treino.',
    '- Volume por treino: iniciante 5 a 6 exercícios e 3 séries; intermediário 6 a 8 exercícios e 3 a 4',
    '  séries; avançado 7 a 9 exercícios e 4 séries.',
    '- reps por objetivo: força 4-6; hipertrofia 8-12; emagrecimento e condicionamento 12-15.',
    '- rest_time_seconds por objetivo: força 120; hipertrofia 90 (60 para isoladores);',
    '  emagrecimento e condicionamento 45.',
    '- weight: NUNCA preencha. A carga é pessoal e a pessoa descobre treinando.',
    '- title: nomeie pelo conteúdo do treino ("Peito e Tríceps", "Pernas e Glúteos", "Costas e Bíceps").',
    '  Nunca use "Treino A/B/C".',
    '- sections: só quando o treino junta grupos musculares bem diferentes; aí uma seção por grupo,',
    '  com o nome do grupo. Um treino de um grupo só devolve uma seção com name vazio.',
    '- Respeite as observações da pessoa (lesões, equipamento disponível, exercícios que ela não quer).',
    '  Se uma observação impedir a rotina pedida, faça o mais próximo possível e explique em summary.',
    '- summary: uma frase em português explicando a lógica da divisão que você escolheu.',
    '',
    ICONS_HELP,
].join('\n');

// A lista da biblioteca vai no prompt para a IA devolver os nomes já no padrão
// do app — é o que faz o exercício importado casar com o histórico e a evolução.
function buildCatalog(rows) {
    const byGroup = new Map();
    for (const row of rows) {
        const names = byGroup.get(row.muscle_group) || [];
        names.push(row.name);
        byGroup.set(row.muscle_group, names);
    }
    return [...byGroup.entries()]
        .map(([group, names]) => `${group}: ${names.join(', ')}`)
        .join('\n');
}

function readImage(raw) {
    if (typeof raw === 'string') {
        const match = raw.match(/^data:([^;]+);base64,(.*)$/s);
        if (!match) throw badRequest('Formato de imagem não reconhecido.');
        return readImage({ mime_type: match[1], data: match[2] });
    }

    const mimeType = String(raw?.mime_type || '').toLowerCase();
    if (!IMAGE_TYPES.has(mimeType)) {
        throw badRequest('Envie a foto em JPG, PNG ou WEBP.');
    }

    const data = String(raw?.data || '').trim();
    if (!data || !/^[A-Za-z0-9+/=\s]+$/.test(data)) {
        throw badRequest('A foto enviada está corrompida.');
    }
    // Base64 carrega ~4 caracteres a cada 3 bytes.
    if ((data.length * 3) / 4 > MAX_IMAGE_BYTES) {
        throw badRequest('A foto é muito grande. Tente uma imagem menor.');
    }

    return { mime_type: mimeType, data: data.replace(/\s+/g, '') };
}

function readSource(payload) {
    const text = String(payload?.text ?? '').trim();
    if (text.length > MAX_TEXT_LENGTH) {
        throw badRequest(`O texto da ficha deve ter no máximo ${MAX_TEXT_LENGTH} caracteres.`);
    }

    const image = payload?.image ? readImage(payload.image) : null;
    if (!text && !image) throw badRequest('Escreva a ficha ou envie uma foto para a IA ler.');

    return { text, image };
}

function readBriefing(payload) {
    const level = String(payload?.level ?? '').trim();
    if (!LEVELS.has(level)) throw badRequest('Escolha o seu nível de treino.');

    const goal = String(payload?.goal ?? '').trim();
    if (!GOALS.has(goal)) throw badRequest('Escolha o seu objetivo.');

    const daysPerWeek = integer(payload?.days_per_week, 'Dias por semana', { min: 1, max: 7 });
    const notes = optionalText(payload?.notes, 'Observações', 1000);

    return { level, goal, daysPerWeek, notes };
}

function readRequest(payload) {
    return payload?.mode === 'build'
        ? { mode: 'build', ...readBriefing(payload) }
        : { mode: 'read', ...readSource(payload) };
}

function catalogBlock(catalog, verb) {
    return `Exercícios cadastrados no app (${verb}):\n${catalog}`;
}

function readPrompt({ text, image }, catalog) {
    const parts = [];
    if (image) {
        parts.push('A imagem em anexo é a ficha de treino do usuário. Leia tudo o que estiver escrito nela.');
    }
    if (text) {
        parts.push(`Ficha enviada pelo usuário:\n"""\n${text}\n"""`);
    }
    parts.push(catalogBlock(catalog, 'use exatamente estes nomes quando o exercício for o mesmo'));
    return parts.join('\n\n');
}

function buildPrompt({ level, goal, daysPerWeek, notes }, catalog) {
    const parts = [
        'Monte a rotina de treino desta pessoa:',
        `- Nível: ${LEVELS.get(level)}`,
        `- Objetivo: ${GOALS.get(goal)}`,
        `- Frequência: ${daysPerWeek} ${daysPerWeek === 1 ? 'dia' : 'dias'} de treino por semana`,
    ];
    if (notes) parts.push(`- Observações da pessoa: ${notes}`);

    return [
        parts.join('\n'),
        catalogBlock(catalog, 'escolha somente entre estes'),
    ].join('\n\n');
}

function status() {
    return { enabled: gemini.isEnabled() };
}

// Passo 1: a IA lê a ficha (mode "read") ou monta uma do zero (mode "build") e
// devolve um plano para o usuário conferir. Nada é gravado aqui.
async function preview(payload, userId) {
    const request = readRequest(payload);

    if (!consumeQuota(String(userId))) {
        throw new HttpError(429, 'Muitos pedidos seguidos. Espere um minuto e tente de novo.');
    }

    const library = await libraryRepository.list();
    const catalog = buildCatalog(library);
    const building = request.mode === 'build';

    const raw = await gemini.generateJson({
        systemInstruction: building ? BUILD_INSTRUCTION : READ_INSTRUCTION,
        text: building ? buildPrompt(request, catalog) : readPrompt(request, catalog),
        image: request.image,
        schema: PLAN_SCHEMA,
    });

    return { plan: normalizePlan(raw, buildLibraryIndex(library)) };
}

// Passo 2: grava o plano que o usuário conferiu. O payload é normalizado de
// novo (e o vínculo com a biblioteca refeito pelo nome), então uma edição na
// tela nunca escapa das regras do domínio.
async function confirm(payload, userId) {
    const library = buildLibraryIndex(await libraryRepository.list());
    const plan = normalizePlan(payload?.plan ?? payload, library);

    if (!plan.workouts.length && !plan.rest_days.length) {
        throw badRequest('Não há nada para adicionar. Revise a ficha e tente de novo.');
    }

    const workouts = await importRepository.createPlan(userId, plan);
    return { workouts, rest_days: plan.rest_days };
}

module.exports = { status, preview, confirm, PLAN_SCHEMA, READ_INSTRUCTION, BUILD_INSTRUCTION };
