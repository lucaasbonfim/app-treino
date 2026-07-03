import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ActionSheet from '../components/ActionSheet';
import AppShell from '../components/AppShell';
import CurrentWorkoutCard from '../components/CurrentWorkoutCard';
import DaySelectModal from '../components/DaySelectModal';
import Icon from '../components/Icon';
import WorkoutStatusBadge from '../components/WorkoutStatusBadge';
import { EmptyView, LoadingView } from '../components/StatusView';
import { apiCache, scheduleService, workoutService } from '../services';
import { errorMessage } from '../services/api';
import { shortDayName, sortDaysMonFirst } from '../utils/days';
import { workoutIcon } from '../utils/workoutIcons';
import { exerciseCount, sectionCount } from '../utils/pluralize';
import { namedSections, workoutSubtitle } from '../utils/workoutSections';

// Dias (agenda) em que cada treino aparece, derivados da semana resolvida.
function buildDaysByWorkout(schedule) {
  const map = new Map();
  for (const day of schedule?.days || []) {
    for (const workout of day.workouts || []) {
      const list = map.get(workout.id) || [];
      list.push(day.day_of_week);
      map.set(workout.id, list);
    }
  }
  for (const [key, values] of map) map.set(key, sortDaysMonFirst(values));
  return map;
}

export default function Workouts() {
  const [workouts, setWorkouts] = useState(() => apiCache.getArray('/workouts'));
  const [schedule, setSchedule] = useState(() => apiCache.getData('/schedule') || null);
  const [loading, setLoading] = useState(() => !apiCache.has('/workouts'));
  const [error, setError] = useState('');
  const [actionWorkout, setActionWorkout] = useState(null);
  const [daysModalWorkout, setDaysModalWorkout] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async (options) => {
    try {
      const [workoutsResult, scheduleResult] = await Promise.all([
        workoutService.list(options),
        scheduleService.list(options),
      ]);
      setError('');
      setWorkouts(workoutsResult.data);
      setSchedule(scheduleResult.data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível carregar os treinos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([workoutService.list(), scheduleService.list()])
      .then(([workoutsResult, scheduleResult]) => {
        if (!active) return;
        setWorkouts(workoutsResult.data);
        setSchedule(scheduleResult.data);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar os treinos.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const daysByWorkout = useMemo(() => buildDaysByWorkout(schedule), [schedule]);

  const remove = async (workout) => {
    setActionWorkout(null);
    try {
      await workoutService.remove(workout.id);
      setWorkouts((current) => current.filter(({ id }) => id !== workout.id));
      load();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível excluir o treino.'));
    }
  };

  const archive = async (workout) => {
    setActionWorkout(null);
    try {
      await workoutService.archive(workout.id);
      setWorkouts((current) => current.filter(({ id }) => id !== workout.id));
      load();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível arquivar o treino.'));
    }
  };

  const saveDays = async (days) => {
    await scheduleService.setWorkoutDays(daysModalWorkout.id, days);
    await load();
  };

  let actionSheetActions = [];
  if (actionWorkout?.confirmDelete) {
    actionSheetActions = [
      {
        key: 'back',
        label: 'Voltar às opções',
        description: 'Não excluir este treino',
        icon: 'arrow_back',
        keepOpen: true,
        onSelect: () => setActionWorkout((current) => ({ ...current, confirmDelete: false })),
      },
      {
        key: 'confirm-delete',
        label: 'Excluir definitivamente',
        description: 'Seções e exercícios também serão apagados',
        icon: 'delete_forever',
        tone: 'danger',
        keepOpen: true,
        onSelect: () => remove(actionWorkout),
      },
    ];
  } else if (actionWorkout?.confirmArchive) {
    actionSheetActions = [
      {
        key: 'back',
        label: 'Voltar às opções',
        description: 'Manter na rotina atual',
        icon: 'arrow_back',
        keepOpen: true,
        onSelect: () => setActionWorkout((current) => ({ ...current, confirmArchive: false })),
      },
      {
        key: 'confirm-archive',
        label: 'Arquivar treino',
        description: 'Continuará salvo em “Arquivo de treinos”',
        icon: 'inventory_2',
        keepOpen: true,
        onSelect: () => archive(actionWorkout),
      },
    ];
  } else if (actionWorkout) {
    actionSheetActions = [
      {
        key: 'days',
        label: 'Dias da semana',
        description: 'Escolher em quais dias você faz este treino',
        icon: 'calendar_month',
        onSelect: () => setDaysModalWorkout(actionWorkout),
      },
      {
        key: 'edit',
        label: 'Editar treino',
        description: 'Alterar nome, ícone ou observações',
        icon: 'edit',
        onSelect: () => navigate(`/workouts/${actionWorkout.id}/edit`),
      },
      {
        key: 'archive',
        label: 'Arquivar treino',
        description: 'Sai da rotina atual, mas continua salvo',
        icon: 'inventory_2',
        keepOpen: true,
        onSelect: () => setActionWorkout((current) => ({ ...current, confirmArchive: true })),
      },
      {
        key: 'delete',
        label: 'Excluir treino',
        description: 'Esta ação exige confirmação',
        icon: 'delete',
        tone: 'danger',
        keepOpen: true,
        onSelect: () => setActionWorkout((current) => ({ ...current, confirmDelete: true })),
      },
    ];
  }

  return (
    <AppShell title="Meus treinos" subtitle="Seus treinos e blocos">
      <CurrentWorkoutCard />

      {!loading && !error && workouts.length > 0 && (
        <Link className="button button-primary button-large" to="/workouts/new">
          <Icon>add</Icon> Novo treino
        </Link>
      )}

      {error && (
        <div className="error-banner with-action">
          <span>{error}</span>
          <button type="button" onClick={() => load({ force: true, allowStale: false })}>Tentar novamente</button>
        </div>
      )}
      {loading && <LoadingView />}
      {!loading && !error && workouts.length === 0 && (
        <>
          <EmptyView title="Sua semana começa aqui" text="Crie o primeiro treino, adicione exercícios e depois escolha os dias." />
          <Link className="button button-primary button-large" to="/workouts/new"><Icon>add</Icon> Novo treino</Link>
        </>
      )}
      {!loading && workouts.length > 0 && (
        <section className="workout-list" aria-label="Treinos cadastrados">
          {workouts.map((workout) => {
            const exercises = workout.muscle_groups.flatMap((group) => group.exercises);
            const sections = namedSections(workout);
            const dayValues = daysByWorkout.get(workout.id) || [];
            return (
              <article className="workout-card" key={workout.id}>
                <Link className="workout-main" to={`/workouts/${workout.id}`}>
                  <div className="day-badge">
                    <span>{dayValues.length === 1 ? shortDayName(dayValues[0]) : (dayValues.length || '—')}</span>
                    <Icon filled>{workoutIcon(workout.icon)}</Icon>
                  </div>
                  <div className="workout-copy">
                    <div className="workout-eyebrow-row">
                      <span className="workout-days">
                        {dayValues.length
                          ? dayValues.map((value) => <em key={value}>{shortDayName(value)}</em>)
                          : <em className="empty">Sem dia definido</em>}
                      </span>
                      <WorkoutStatusBadge status={workout.status} />
                    </div>
                    <h2>{workout.title}</h2>
                    <p>{workoutSubtitle(workout)}</p>
                    <div className="card-meta">
                      {sections.length > 0 && (
                        <span><Icon>category</Icon>{sectionCount(sections.length)}</span>
                      )}
                      <span><Icon>fitness_center</Icon>{exerciseCount(exercises.length)}</span>
                    </div>
                  </div>
                </Link>
                <button
                  className="more-button workout-more-button"
                  type="button"
                  aria-label={`Opções de ${workout.title}`}
                  aria-haspopup="dialog"
                  onClick={() => setActionWorkout(workout)}
                >
                  <Icon>more_horiz</Icon>
                </button>
              </article>
            );
          })}
        </section>
      )}

      {!loading && !error && (
        <Link className="archive-link" to="/workouts/archived">
          <span className="archive-link-label"><Icon>inventory_2</Icon> Arquivo de treinos</span>
          <Icon>chevron_right</Icon>
        </Link>
      )}

      <ActionSheet
        open={Boolean(actionWorkout)}
        onClose={() => setActionWorkout(null)}
        title={
          actionWorkout?.confirmDelete
            ? `Excluir “${actionWorkout.title}”?`
            : actionWorkout?.confirmArchive
              ? `Arquivar “${actionWorkout.title}”?`
              : actionWorkout?.title
        }
        description={
          actionWorkout?.confirmDelete
            ? 'Esta ação não pode ser desfeita.'
            : actionWorkout?.confirmArchive
              ? 'Esse treino sairá da sua rotina atual, mas continuará salvo.'
              : 'Escolha uma opção'
        }
        icon={
          actionWorkout?.confirmDelete
            ? 'warning'
            : actionWorkout?.confirmArchive
              ? 'inventory_2'
              : workoutIcon(actionWorkout?.icon)
        }
        actions={actionSheetActions}
      />

      {daysModalWorkout && (
        <DaySelectModal
          workout={daysModalWorkout}
          days={daysByWorkout.get(daysModalWorkout.id) || []}
          onSave={saveDays}
          onClose={() => setDaysModalWorkout(null)}
        />
      )}
    </AppShell>
  );
}
