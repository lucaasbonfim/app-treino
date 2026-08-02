const friendshipRepository = require('../repositories/friendship.repository');
const checkinRepository = require('../repositories/checkin.repository');
const userRepository = require('../repositories/user.repository');
const { validateUsername } = require('../utils/username');
const { isoDate, dateOnly, addDays, currentStreak } = require('../utils/streak');
const { badRequest, conflict, notFound } = require('../utils/httpError');

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_LABELS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
// A sequência atravessa a virada do mês, então a janela de datas começa antes
// do dia 1 para não cortar um streak que vinha do mês anterior.
const STREAK_LOOKBACK_DAYS = 60;

function publicUser(row) {
    return {
        id: row.id,
        name: row.name,
        username: row.username,
    };
}

// 'YYYY-MM' (ou vazio, que significa o mês corrente) → limites do mês.
function resolveMonth(value) {
    const today = dateOnly(new Date());
    let year = today.getFullYear();
    let monthIndex = today.getMonth();

    if (value !== undefined && value !== null && value !== '') {
        const text = String(value).trim();
        if (!MONTH_PATTERN.test(text)) throw badRequest('Informe o mês no formato AAAA-MM.');
        const [textYear, textMonth] = text.split('-');
        year = Number(textYear);
        monthIndex = Number(textMonth) - 1;
    }

    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const isCurrent = year === today.getFullYear() && monthIndex === today.getMonth();
    // Num mês em andamento só contam os dias que já passaram, senão todo mundo
    // aparece "atrasado" no dia 2.
    const elapsedDays = isCurrent ? today.getDate() : end.getDate();

    return {
        month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        label: `${MONTH_LABELS[monthIndex]} de ${year}`,
        start: isoDate(start),
        end: isoDate(end),
        // Guardado como Date para o cálculo da janela de streak: reinterpretar a
        // string 'YYYY-MM-DD' com new Date() cairia em UTC e voltaria um dia.
        startDate: start,
        is_current: isCurrent,
        elapsedDays,
    };
}

// Percentual da própria meta semanal considerando os dias já decorridos: é o
// número que compara quem treina 3x com quem treina 6x sem ordenar por ele.
function goalPercent(days, weeklyGoal, elapsedDays) {
    const goal = Number(weeklyGoal) || 0;
    if (goal <= 0 || elapsedDays <= 0) return 0;
    const target = (goal * elapsedDays) / 7;
    return Math.round((days / target) * 100);
}

// Monta as linhas do placar a partir das contagens já ordenadas pelo banco.
// Empate em dias divide a mesma posição (1º, 2º, 2º, 4º); o desempate de
// exibição — quem chegou primeiro naquele número — já veio na ordenação.
function rankEntries(rows, { userId, elapsedDays, streakByUser = new Map(), today = new Date() }) {
    let position = 0;
    let lastDays = null;
    return rows.map((row, index) => {
        if (row.days !== lastDays) {
            position = index + 1;
            lastDays = row.days;
        }
        const dateSet = streakByUser.get(row.id);
        return {
            position,
            user_id: row.id,
            name: row.name,
            username: row.username,
            is_me: row.id === userId,
            days: row.days,
            weekly_goal: row.weekly_goal_trainings,
            goal_percent: goalPercent(row.days, row.weekly_goal_trainings, elapsedDays),
            streak: dateSet ? currentStreak(dateSet, today) : null,
            reached_at: row.reached_at,
        };
    });
}

async function listFriends(userId) {
    const rows = await friendshipRepository.listAccepted(userId);
    return rows.map((row) => ({
        ...publicUser(row),
        friendship_id: row.friendship_id,
        friends_since: row.responded_at,
    }));
}

async function listRequests(userId) {
    const rows = await friendshipRepository.listPending(userId);
    const received = [];
    const sent = [];
    for (const row of rows) {
        const item = {
            ...publicUser(row),
            request_id: row.request_id,
            created_at: row.created_at,
        };
        if (row.requester_id === userId) sent.push(item);
        else received.push(item);
    }
    return { received, sent };
}

// Situação atual entre duas pessoas, para a tela saber qual botão mostrar.
async function relationWith(userId, otherId) {
    if (userId === otherId) return { relation: 'self', request_id: null };
    const existing = await friendshipRepository.findBetween(userId, otherId);
    if (!existing) return { relation: 'none', request_id: null };
    if (existing.status === 'accepted') return { relation: 'friend', request_id: existing.id };
    return {
        relation: existing.requester_id === userId ? 'request_sent' : 'request_received',
        request_id: existing.id,
    };
}

async function searchByUsername(userId, rawUsername) {
    const username = validateUsername(rawUsername);
    const found = await userRepository.findByUsername(username);
    if (!found) throw notFound(`Não encontramos ninguém com @${username}.`);
    return { ...publicUser(found), ...(await relationWith(userId, found.id)) };
}

async function sendRequest(userId, payload) {
    const username = validateUsername(payload.username);
    const target = await userRepository.findByUsername(username);
    if (!target) throw notFound(`Não encontramos ninguém com @${username}.`);
    if (target.id === userId) throw badRequest('Você não pode adicionar você mesmo.');

    const existing = await friendshipRepository.findBetween(userId, target.id);
    if (existing) {
        if (existing.status === 'accepted') throw conflict(`Você e @${username} já são amigos.`);
        if (existing.requester_id === userId) {
            throw conflict(`Você já enviou um pedido para @${username}.`);
        }
        // Pedido cruzado: os dois se adicionaram, então a amizade sai direto.
        const accepted = await friendshipRepository.accept(existing.id);
        return {
            status: 'accepted',
            friend: publicUser(target),
            message: `@${username} também tinha te adicionado. Agora vocês são amigos!`,
            request_id: accepted?.id ?? existing.id,
        };
    }

    try {
        const created = await friendshipRepository.create({
            requester_id: userId,
            addressee_id: target.id,
        });
        return {
            status: 'pending',
            friend: publicUser(target),
            message: `Pedido enviado para @${username}.`,
            request_id: created.id,
        };
    } catch (error) {
        // Corrida entre dois pedidos simultâneos: o índice do par normalizado
        // barra o segundo.
        if (error.code === '23505') throw conflict(`Já existe um pedido entre você e @${username}.`);
        throw error;
    }
}

async function respondRequest(userId, requestId, payload) {
    const action = String(payload.action ?? '').trim();
    if (!['accept', 'reject'].includes(action)) {
        throw badRequest('Ação inválida: use "accept" ou "reject".');
    }

    const request = await friendshipRepository.findById(requestId);
    // Só quem recebeu o pedido responde — quem enviou cancela com DELETE.
    if (!request || request.addressee_id !== userId) throw notFound('Pedido não encontrado.');
    if (request.status !== 'pending') throw conflict('Este pedido já foi respondido.');

    if (action === 'reject') {
        // Apaga em vez de guardar "recusado": assim a pessoa pode tentar de novo
        // mais tarde sem ficar travada para sempre.
        await friendshipRepository.remove(request.id);
        return { status: 'rejected', message: 'Pedido recusado.' };
    }

    await friendshipRepository.accept(request.id);
    return { status: 'accepted', message: 'Vocês agora são amigos!' };
}

async function removeFriend(userId, otherId) {
    const existing = await friendshipRepository.findBetween(userId, otherId);
    if (!existing) throw notFound('Vocês não estão conectados.');
    await friendshipRepository.remove(existing.id);
    return {
        message: existing.status === 'accepted' ? 'Amizade desfeita.' : 'Pedido cancelado.',
    };
}

async function monthlyRanking(userId, query = {}) {
    const period = resolveMonth(query.month);
    const rows = await friendshipRepository.monthlyRanking(userId, period.start, period.end);

    // A sequência só faz sentido para o mês corrente: em meses fechados não
    // existe "sequência atual".
    let streakByUser = new Map();
    if (period.is_current && rows.length) {
        const lookbackStart = isoDate(addDays(period.startDate, -STREAK_LOOKBACK_DAYS));
        const dates = await checkinRepository.findDatesForUsers(
            rows.map((row) => row.id),
            lookbackStart,
            isoDate(new Date()),
        );
        streakByUser = dates.reduce((map, row) => {
            if (!map.has(row.user_id)) map.set(row.user_id, new Set());
            map.get(row.user_id).add(row.checkin_date);
            return map;
        }, new Map());
    }

    const entries = rankEntries(rows, {
        userId,
        elapsedDays: period.elapsedDays,
        streakByUser,
        today: new Date(),
    });

    const me = entries.find((entry) => entry.is_me) || null;
    return {
        month: period.month,
        label: period.label,
        start: period.start,
        end: period.end,
        is_current: period.is_current,
        friends_count: Math.max(entries.length - 1, 0),
        me,
        entries,
    };
}

module.exports = {
    listFriends,
    listRequests,
    searchByUsername,
    sendRequest,
    respondRequest,
    removeFriend,
    monthlyRanking,
    resolveMonth,
    goalPercent,
    rankEntries,
};
