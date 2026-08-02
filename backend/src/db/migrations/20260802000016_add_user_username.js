// O @username é o identificador público usado para adicionar amigos. Como já
// existem contas criadas, a coluna entra nullable, recebe um valor derivado do
// e-mail e só depois vira obrigatória — assim ninguém fica travado numa tela de
// "escolha seu @" no próximo login.

// Versão congelada do slug: migrations não devem mudar de comportamento quando
// o util de runtime (src/utils/username.js) evoluir.
function slugify(seed) {
    const base = String(seed ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9._]+/g, '.')
        .replace(/[._]{2,}/g, '.')
        .replace(/^[._]+|[._]+$/g, '')
        .slice(0, 20);
    return base.length >= 3 ? base : `atleta${base}`.slice(0, 20);
}

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
    const hasUsername = await knex.schema.hasColumn('users', 'username');
    if (hasUsername) return;

    await knex.schema.alterTable('users', (table) => {
        table.string('username', 20).nullable();
    });

    const users = await knex('users').select('id', 'name', 'email').orderBy('id', 'asc');
    const taken = new Set();
    for (const user of users) {
        const seed = String(user.email ?? '').split('@')[0] || user.name;
        const base = slugify(seed);
        let username = base;
        let suffix = 1;
        while (taken.has(username)) {
            suffix += 1;
            username = `${base.slice(0, 20 - String(suffix).length)}${suffix}`;
        }
        taken.add(username);
        await knex('users').where({ id: user.id }).update({ username });
    }

    await knex.schema.alterTable('users', (table) => {
        table.string('username', 20).notNullable().alter();
    });
    await knex.raw('CREATE UNIQUE INDEX users_username_unique ON users (username)');
    // Sem "?" no regex: knex trata ponto de interrogação em raw() como binding
    // posicional e trocaria o quantificador por $1.
    await knex.raw(`
        ALTER TABLE users
        ADD CONSTRAINT users_username_format_check
        CHECK (
            username ~ '^[a-z0-9._]+$'
            AND username !~ '^[._]'
            AND username !~ '[._]$'
            AND char_length(username) BETWEEN 3 AND 20
        )
    `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
    if (!(await knex.schema.hasColumn('users', 'username'))) return;
    await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_format_check');
    await knex.raw('DROP INDEX IF EXISTS users_username_unique');
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('username');
    });
};
