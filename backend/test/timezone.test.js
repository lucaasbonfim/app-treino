const test = require('node:test');
const assert = require('node:assert/strict');

test('API usa o fuso de São Paulo por padrão', () => {
    delete process.env.APP_TIME_ZONE;
    delete require.cache[require.resolve('../src/app')];

    require('../src/app');

    assert.equal(process.env.TZ, 'America/Sao_Paulo');
    assert.equal(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        'America/Sao_Paulo',
    );
});
