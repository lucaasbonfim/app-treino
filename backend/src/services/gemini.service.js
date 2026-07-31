const { HttpError } = require('../utils/httpError');

// Cliente mínimo da Interactions API do Gemini (Google AI for Developers).
// Só o que o app precisa: um turno com texto (e opcionalmente uma foto) e a
// resposta forçada em JSON por um schema.
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
// Flash Lite dá 500 requisições/dia no plano gratuito contra 20 do Flash normal,
// o que muda tudo para um app que só chama a IA sob demanda.
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const THINKING_LEVELS = new Set(['minimal', 'low', 'medium', 'high']);

function isEnabled() {
    return Boolean(process.env.GEMINI_API_KEY);
}

function model() {
    return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

// "low" é o ponto certo neste modelo: ler uma ficha leva ~4s e montar uma rotina
// ~11s, com o mesmo resultado do "medium" (que passa de 60s e estoura o timeout).
// Com "minimal" a montagem nem termina — a resposta volta incompleta.
function thinkingLevel() {
    const level = String(process.env.GEMINI_THINKING_LEVEL || 'low').toLowerCase();
    return THINKING_LEVELS.has(level) ? level : 'low';
}

// Falha da IA não é erro do usuário: vira 503 com uma mensagem que faz sentido
// na tela, e o motivo real fica no log do servidor.
function unavailable(message, logDetail) {
    if (logDetail) console.error('[gemini]', logDetail);
    return new HttpError(503, message);
}

// A resposta é uma linha do tempo de steps; o texto gerado está nos blocos
// "text" dos steps "model_output".
function readText(payload) {
    const parts = [];
    for (const step of payload?.steps || []) {
        if (step?.type !== 'model_output') continue;
        for (const content of step.content || []) {
            if (content?.type === 'text' && content.text) parts.push(content.text);
        }
    }
    return parts.join('').trim();
}

async function post(body, timeoutMs) {
    try {
        return await fetch(API_URL, {
            method: 'POST',
            signal: AbortSignal.timeout(timeoutMs),
            headers: {
                'content-type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY,
            },
            body: JSON.stringify(body),
        });
    } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            throw unavailable('A IA demorou demais para responder. Tente de novo.', error.name);
        }
        throw unavailable('Não foi possível falar com a IA agora.', error.message);
    }
}

/**
 * Pede um JSON ao Gemini seguindo `schema`.
 * @param {object} options
 * @param {string} options.systemInstruction  Papel/regras do modelo.
 * @param {string} options.text               O que o usuário mandou.
 * @param {{ mime_type: string, data: string }} [options.image] Foto em base64.
 * @param {object} options.schema             JSON Schema da resposta.
 */
async function generateJson({
    systemInstruction,
    text,
    image,
    schema,
    maxOutputTokens = 16384,
    timeoutMs = 90000,
}) {
    if (!isEnabled()) {
        throw unavailable('A leitura por IA não está configurada no servidor.');
    }

    const input = [{ type: 'text', text }];
    if (image) {
        input.push({ type: 'image', mime_type: image.mime_type, data: image.data });
    }

    const response = await post({
        model: model(),
        system_instruction: systemInstruction,
        input,
        response_format: { type: 'text', mime_type: 'application/json', schema },
        generation_config: {
            temperature: 0.2,
            max_output_tokens: maxOutputTokens,
            thinking_level: thinkingLevel(),
        },
    }, timeoutMs);

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw unavailable(
            response.status === 429
                ? 'A IA está sobrecarregada no momento. Tente de novo em instantes.'
                : 'A IA não conseguiu processar o pedido agora.',
            `HTTP ${response.status}: ${detail.slice(0, 500)}`,
        );
    }

    const payload = await response.json().catch(() => null);
    if (payload?.status && payload.status !== 'completed') {
        throw unavailable(
            'A IA não conseguiu terminar a resposta. Tente de novo.',
            `status ${payload.status}`,
        );
    }

    const raw = readText(payload);
    if (!raw) throw unavailable('A IA respondeu vazio. Tente de novo.');

    try {
        return JSON.parse(raw);
    } catch {
        throw unavailable('A IA respondeu em um formato inesperado.', `JSON inválido: ${raw.slice(0, 500)}`);
    }
}

module.exports = { isEnabled, model, generateJson };
