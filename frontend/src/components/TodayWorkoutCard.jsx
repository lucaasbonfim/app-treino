import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { apiCache, scheduleService } from '../services';
import { errorMessage } from '../services/api';
import { workoutIcon } from '../utils/workoutIcons';

function daySummary(entry) {
  if (!entry) return '—';
  if (entry.is_rest_day) return 'Descanso';
  if (entry.workouts?.length) return entry.workouts.map((workout) => workout.title).join(' + ');
  return 'Nenhum treino';
}

export default function TodayWorkoutCard() {
  const [today, setToday] = useState(() => apiCache.getData('/schedule/today') || null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    scheduleService.today()
      .then(({ data }) => { if (active) setToday(data); })
      .catch(() => {});

    // Reflete mudanças na agenda (a mutação limpa o cache).
    const unsubscribe = apiCache.subscribe((detail) => {
      if (detail.type !== 'clear') return;
      scheduleService.today({ force: true })
        .then(({ data }) => { if (active) setToday(data); })
        .catch(() => {});
    });

    return () => { active = false; unsubscribe(); };
  }, []);

  const start = async () => {
    if (!today?.workouts?.length) return;
    setStarting(true);
    setError('');
    try {
      const { data } = await scheduleService.startDay(today.day_of_week);
      navigate(`/workout-sessions/${data.id}`, { state: { session: data } });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível iniciar o treino.'));
      setStarting(false);
    }
  };

  if (!today) return null;

  const { status, workouts = [], completed, label, previous, next } = today;
  const title = workouts.map((workout) => workout.title).join(' + ');
  const icon = workouts.length === 1 ? workoutIcon(workouts[0].icon) : 'exercise';

  return (
    <section className={`today-card today-card-${status}`}>
      <header className="today-card-head">
        <span className="eyebrow"><Icon>today</Icon> Hoje</span>
        <Link to="/agenda" className="today-card-config" aria-label="Abrir agenda semanal">
          <Icon>calendar_month</Icon>
          <span>Agenda</span>
        </Link>
      </header>

      {status === 'workout' && !completed && (
        <>
          <div className="today-card-body">
            <span className="today-card-icon"><Icon filled>{icon}</Icon></span>
            <div className="today-card-copy">
              <strong>{title}</strong>
              <small>{label}</small>
            </div>
          </div>
          <button type="button" className="today-start-button" onClick={start} disabled={starting}>
            <Icon filled>play_arrow</Icon>
            {starting ? 'Iniciando...' : 'Iniciar treino'}
          </button>
          {error && <p className="today-card-error">{error}</p>}
        </>
      )}

      {status === 'workout' && completed && (
        <>
          <div className="today-card-body">
            <span className="today-card-icon done"><Icon filled>check</Icon></span>
            <div className="today-card-copy">
              <strong>{title}</strong>
              <small>Treino concluído hoje</small>
            </div>
          </div>
          <p className="today-card-note"><Icon filled>celebration</Icon> Boa, check-in registrado.</p>
        </>
      )}

      {status === 'rest' && (
        <div className="today-card-body">
          <span className="today-card-icon rest"><Icon filled>self_improvement</Icon></span>
          <div className="today-card-copy">
            <strong>Dia de descanso</strong>
            <small>Recuperar também faz parte.</small>
          </div>
        </div>
      )}

      {status === 'empty' && (
        <div className="today-card-body">
          <span className="today-card-icon empty"><Icon>event_upcoming</Icon></span>
          <div className="today-card-copy">
            <strong>Nenhum treino definido</strong>
            <small>Toque em “Agenda” para montar sua semana.</small>
          </div>
        </div>
      )}

      <div className="today-neighbors">
        <div className="today-neighbor">
          <span className="today-neighbor-when">Ontem</span>
          <span className="today-neighbor-name">{daySummary(previous)}</span>
        </div>
        <div className="today-neighbor">
          <span className="today-neighbor-when">Amanhã</span>
          <span className="today-neighbor-name">{daySummary(next)}</span>
        </div>
      </div>
    </section>
  );
}
