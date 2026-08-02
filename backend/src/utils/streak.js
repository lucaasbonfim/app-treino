// Helpers de dia civil e sequência de check-ins. Ficam aqui porque o resumo
// semanal (progress.service) e o ranking entre amigos (friend.service) precisam
// aplicar exatamente a mesma regra de "dias seguidos".

function isoDate(date) {
    return date.toLocaleDateString('en-CA');
}

function dateOnly(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Sequência atual: dias consecutivos com check-in terminando em hoje (ou ontem,
// caso o treino de hoje ainda não tenha acontecido).
function currentStreak(dateSet, today) {
    let cursor = dateOnly(today);
    if (!dateSet.has(isoDate(cursor))) {
        cursor = addDays(cursor, -1);
        if (!dateSet.has(isoDate(cursor))) return 0;
    }
    let streak = 0;
    while (dateSet.has(isoDate(cursor))) {
        streak += 1;
        cursor = addDays(cursor, -1);
    }
    return streak;
}

// Maior sequência de dias consecutivos em todo o histórico.
function bestStreak(sortedDates) {
    let best = 0;
    let run = 0;
    let previous = null;
    for (const iso of sortedDates) {
        const current = dateOnly(iso);
        if (previous && isoDate(addDays(previous, 1)) === iso) {
            run += 1;
        } else {
            run = 1;
        }
        if (run > best) best = run;
        previous = current;
    }
    return best;
}

module.exports = {
    isoDate,
    dateOnly,
    addDays,
    currentStreak,
    bestStreak,
};
