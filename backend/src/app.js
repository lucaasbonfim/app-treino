require('dotenv').config();

// Datas de treino e check-in seguem o dia civil do usuário, independentemente
// do fuso padrão do servidor (o Render normalmente executa fora do horário de Brasília).
process.env.TZ = process.env.APP_TIME_ZONE || 'America/Sao_Paulo';

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const workoutRoutes = require('./routes/workout.routes');
const muscleGroupRoutes = require('./routes/muscleGroup.routes');
const exerciseRoutes = require('./routes/exercise.routes');
const exerciseLibraryRoutes = require('./routes/exerciseLibrary.routes');
const workoutSessionRoutes = require('./routes/workoutSession.routes');
const progressRoutes = require('./routes/progress.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();
const API = '/api';

app.disable('x-powered-by');
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'app-treino-backend',
        timestamp: new Date().toISOString(),
    });
});

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/workouts`, workoutRoutes);
app.use(`${API}/muscle-groups`, muscleGroupRoutes);
app.use(`${API}/exercises`, exerciseRoutes);
app.use(`${API}/exercise-library`, exerciseLibraryRoutes);
app.use(`${API}/workout-sessions`, workoutSessionRoutes);
app.use(`${API}/progress`, progressRoutes);
app.use(`${API}/schedule`, scheduleRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
