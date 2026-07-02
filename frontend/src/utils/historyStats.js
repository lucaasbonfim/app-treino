// Utilitários compartilhados da tela de Histórico. Reaproveitam os dados já
// hidratados das sessões (exercícios + séries) para evitar código duplicado.

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatWeight(value) {
  const number = toNumber(value);
  if (number === null) return null;
  return `${number.toLocaleString('pt-BR')} kg`;
}

export function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatShortDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
}

export function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(value));
}

// Duração em minutos entre started_at e finished_at (null quando não dá para calcular).
export function durationMinutes(session) {
  if (!session?.started_at || !session?.finished_at) return null;
  const diff = new Date(session.finished_at) - new Date(session.started_at);
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return diff / 60000;
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'duração não registrada';
  if (minutes < 1) return 'menos de 1 min';

  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < 60) return `${roundedMinutes} min`;

  const hours = Math.floor(roundedMinutes / 60);
  const rest = roundedMinutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

// Métricas de uma sessão a partir dos exercícios/séries já carregados.
export function sessionMetrics(session) {
  const exercises = session?.exercises || [];
  const sets = exercises.flatMap((exercise) => exercise.sets || []);
  return {
    exerciseCount: exercises.length,
    completedExercises: exercises.filter((exercise) => exercise.completed).length,
    totalSets: sets.length,
    completedSets: sets.filter((set) => set.completed).length,
    durationMin: durationMinutes(session),
  };
}

// Carga (maior série concluída) e repetições (última série concluída) de um exercício.
export function exercisePerformance(exercise) {
  const completedSets = (exercise.sets || []).filter((set) => set.completed);
  if (!completedSets.length) {
    return {
      weight: toNumber(exercise.performed_weight),
      reps: exercise.performed_reps || null,
      setsDone: 0,
    };
  }
  const weights = completedSets
    .map((set) => toNumber(set.performed_weight))
    .filter((weight) => weight !== null);
  const lastSet = completedSets[completedSets.length - 1];
  return {
    weight: weights.length ? Math.max(...weights) : toNumber(exercise.performed_weight),
    reps: lastSet.performed_reps || exercise.performed_reps || null,
    setsDone: completedSets.length,
  };
}

const PERIOD_WINDOWS = {
  today: 1,
  week: 7,
  month: 30,
};

export function filterByPeriod(sessions, period) {
  if (!period || period === 'all') return sessions;
  const now = new Date();
  if (period === 'today') {
    return sessions.filter((session) => {
      const date = new Date(session.finished_at || session.started_at);
      return date.toDateString() === now.toDateString();
    });
  }
  const days = PERIOD_WINDOWS[period];
  if (!days) return sessions;
  const threshold = now.getTime() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((session) => {
    const date = new Date(session.finished_at || session.started_at);
    return date.getTime() >= threshold;
  });
}

// Execução anterior do mesmo exercício, considerando sessões mais antigas que a atual.
export function previousExecution(sessions, currentSession, exerciseName, groupName) {
  const currentTime = new Date(currentSession.finished_at || currentSession.started_at).getTime();
  const older = sessions
    .filter((session) => {
      const time = new Date(session.finished_at || session.started_at).getTime();
      return time < currentTime;
    })
    .sort((a, b) => new Date(b.finished_at || b.started_at) - new Date(a.finished_at || a.started_at));

  for (const session of older) {
    const match = (session.exercises || []).find((exercise) => (
      exercise.exercise_name === exerciseName
      && exercise.muscle_group_name === groupName
      && (exercise.sets || []).some((set) => set.completed)
    ));
    if (match) {
      return { session, ...exercisePerformance(match) };
    }
  }
  return null;
}
