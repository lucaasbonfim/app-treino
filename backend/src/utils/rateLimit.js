// Janela deslizante em memória. Segura sequências de cliques e uso abusivo de
// um endpoint caro numa instância; não é uma proteção distribuída.
function createRateLimit({ max, windowMs, maxKeys = 500 }) {
    const hits = new Map();

    function prune(now) {
        for (const [key, times] of hits) {
            if (now - times[times.length - 1] >= windowMs) hits.delete(key);
        }
    }

    return function consume(key) {
        const now = Date.now();
        if (hits.size > maxKeys) prune(now);

        const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
        if (recent.length >= max) return false;

        recent.push(now);
        hits.set(key, recent);
        return true;
    };
}

module.exports = { createRateLimit };
