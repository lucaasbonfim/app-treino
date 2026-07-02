import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import { EmptyView, LoadingView } from '../components/StatusView';
import HistorySummaryCards from '../components/HistorySummaryCards';
import HistoryFilterChips from '../components/HistoryFilterChips';
import HistoryCard from '../components/HistoryCard';
import HistorySessionDetails from '../components/HistorySessionDetails';
import ExerciseEvolutionCard from '../components/ExerciseEvolutionCard';
import EmptyHistoryState from '../components/EmptyHistoryState';
import { apiCache, workoutSessionService } from '../services';
import { errorMessage } from '../services/api';
import { filterByPeriod, sessionMetrics } from '../utils/historyStats';

// Resumo derivado das sessões carregadas, usado como fallback caso o endpoint
// de resumo não responda.
function deriveSummary(sessions) {
  const totals = sessions.reduce((acc, session) => {
    const metrics = sessionMetrics(session);
    acc.sets += metrics.completedSets;
    acc.exercises += metrics.completedExercises;
    return acc;
  }, { sets: 0, exercises: 0 });
  const last = sessions[0];
  return {
    workouts_done: sessions.length,
    sets_completed: totals.sets,
    exercises_completed: totals.exercises,
    last_workout_name: last?.workout_name || null,
    last_finished_at: last?.finished_at || null,
  };
}

export default function WorkoutHistory() {
  const [initialSnapshot] = useState(() => ({
    sessions: apiCache.getArray('/workout-sessions'),
    ready: apiCache.has('/workout-sessions'),
  }));
  const [sessions, setSessions] = useState(() => initialSnapshot.sessions);
  const [summary, setSummary] = useState(() => apiCache.getData('/workout-sessions/summary') || null);
  const [evolution, setEvolution] = useState(() => apiCache.getArray('/workout-sessions/evolution'));
  const [loading, setLoading] = useState(() => !initialSnapshot.ready);
  const [error, setError] = useState('');
  const [view, setView] = useState('treinos');
  const [period, setPeriod] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [detailSession, setDetailSession] = useState(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = apiCache.subscribe((detail) => {
      if (detail.type === 'set' && detail.url === '/workout-sessions') {
        setSessions(apiCache.getArray('/workout-sessions'));
      }
    });

    workoutSessionService.list()
      .then(({ data }) => {
        if (active) setSessions(data);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar o histórico.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    workoutSessionService.summary()
      .then(({ data }) => { if (active) setSummary(data); })
      .catch(() => {});

    workoutSessionService.evolution()
      .then(({ data }) => { if (active) setEvolution(Array.isArray(data) ? data : []); })
      .catch(() => {});

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const filteredSessions = useMemo(
    () => filterByPeriod(sessions, period),
    [sessions, period],
  );

  const summaryData = summary || deriveSummary(sessions);
  const isEmpty = !loading && !error && sessions.length === 0;

  return (
    <AppShell title="Histórico" subtitle="Treinos finalizados">
      <div className="history-screen">
        {loading && <LoadingView />}
        {error && <p className="error-banner">{error}</p>}

        {!loading && !error && sessions.length > 0 && (
          <>
            <HistorySummaryCards summary={summaryData} />

            <div className="history-tabs" role="tablist" aria-label="Seções do histórico">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'treinos'}
                className={`history-tab ${view === 'treinos' ? 'active' : ''}`}
                onClick={() => setView('treinos')}
              >
                <Icon>history</Icon> Treinos
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'evolucao'}
                className={`history-tab ${view === 'evolucao' ? 'active' : ''}`}
                onClick={() => setView('evolucao')}
              >
                <Icon>monitoring</Icon> Evolução
              </button>
            </div>

            {view === 'treinos' && (
              <>
                <HistoryFilterChips value={period} onChange={setPeriod} />
                {filteredSessions.length === 0 ? (
                  <EmptyView
                    title="Nenhum treino no período"
                    text="Ajuste o filtro para ver mais treinos finalizados."
                  />
                ) : (
                  <section className="history-list">
                    {filteredSessions.map((session) => (
                      <HistoryCard
                        key={session.id}
                        session={session}
                        sessions={sessions}
                        expanded={expandedId === session.id}
                        onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
                        onOpenDetails={setDetailSession}
                      />
                    ))}
                  </section>
                )}
              </>
            )}

            {view === 'evolucao' && (
              evolution.length === 0 ? (
                <EmptyHistoryState
                  icon="monitoring"
                  title="Sem evolução registrada"
                  text="Conclua algumas séries para começar a acompanhar sua carga."
                />
              ) : (
                <section className="evolution-list">
                  {evolution.map((item) => (
                    <ExerciseEvolutionCard
                      key={`${item.muscle_group_name}-${item.exercise_name}`}
                      item={item}
                    />
                  ))}
                </section>
              )
            )}
          </>
        )}

        {isEmpty && (
          <EmptyHistoryState
            title="Nenhum treino finalizado ainda"
            text="Finalize um treino para acompanhar sua evolução por aqui."
            actionLabel="Ver meus treinos"
          />
        )}
      </div>

      {detailSession && (
        <HistorySessionDetails session={detailSession} onClose={() => setDetailSession(null)} />
      )}
    </AppShell>
  );
}
