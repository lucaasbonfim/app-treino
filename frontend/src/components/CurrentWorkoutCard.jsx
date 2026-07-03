import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCache, workoutSessionService } from '../services';
import ContinueWorkoutButton from './ContinueWorkoutButton';
import Icon from './Icon';

function sessionProgress(session) {
  const sets = (session?.exercises || []).flatMap((exercise) => exercise.sets || []);
  return {
    completed: sets.filter((set) => set.completed).length,
    total: sets.length,
  };
}

function startedDay(startedAt) {
  if (!startedAt) return '';
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return '';
  const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function CurrentWorkoutCard() {
  const [session, setSession] = useState(
    () => apiCache.getData('/workout-sessions/current') || null,
  );
  const navigate = useNavigate();

  const fetchCurrent = useCallback(() => (
    workoutSessionService.current({
      force: true,
      allowStale: false,
    })
  ), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data } = await fetchCurrent();
        if (active) setSession(data || null);
      } catch {
        // O card é opcional e não deve substituir os erros das telas principais.
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load();
    };
    const unsubscribe = apiCache.subscribe((detail) => {
      if (detail.type === 'set' && detail.url === '/workout-sessions/current') {
        setSession(apiCache.getData('/workout-sessions/current') || null);
      }
    });

    load();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchCurrent]);

  const progress = useMemo(() => sessionProgress(session), [session]);

  if (!session) return null;

  const day = startedDay(session.started_at);
  const continueWorkout = () => {
    navigate(`/workout-sessions/${session.id}`, { state: { session } });
  };

  return (
    <section className="current-workout-card" aria-label="Treino em andamento">
      <div className="current-workout-accent"><Icon filled>fitness_center</Icon></div>
      <div className="current-workout-content">
        <span className="current-workout-eyebrow">
          <i aria-hidden="true" />
          Treino em andamento
        </span>
        <strong>{session.workout_name}</strong>
        <small>
          {day && <>{day}<span aria-hidden="true"> • </span></>}
          {progress.completed}/{progress.total} séries concluídas
        </small>
      </div>
      <ContinueWorkoutButton onClick={continueWorkout} />
    </section>
  );
}
