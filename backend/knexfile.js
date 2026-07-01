require('dotenv').config();

const schema = process.env.DB_SCHEMA || 'public';

function connection(requireValues = false) {
    const config = {
        host: process.env.DB_HOST || (requireValues ? undefined : 'localhost'),
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || (requireValues ? undefined : 'postgres'),
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || (requireValues ? undefined : 'app_treino'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

    return config;
}

function config(requireValues = false) {
    return {
        client: 'pg',
        connection: connection(requireValues),
        searchPath: [schema],
        pool: {
            min: requireValues ? 2 : 0,
            max: 10,
            afterCreate: (client, done) => {
                client.query(`SET search_path TO "${schema.replaceAll('"', '""')}"`, (error) => done(error, client));
            },
        },
        migrations: {
            directory: './src/db/migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './src/db/seeds',
        },
    };
}

module.exports = {
    development: config(false),
    test: config(false),
    production: config(true),
};

