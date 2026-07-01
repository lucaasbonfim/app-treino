require('dotenv').config();

const app = require('./app');
const db = require('./db/connection');

const port = Number(process.env.PORT || 3001);

const server = app.listen(port, () => {
    console.log(`App Treino API disponível em http://localhost:${port}`);
});

async function shutdown(signal) {
    console.log(`${signal} recebido. Encerrando servidor...`);
    server.close(async () => {
        await db.destroy();
        process.exit(0);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

