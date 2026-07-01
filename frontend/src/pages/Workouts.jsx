import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ActionSheet from '../components/ActionSheet';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import WeeklyProgressCard from '../components/WeeklyProgressCard';
import WorkoutStatusBadge from '../components/WorkoutStatusBadge';
import { EmptyView, LoadingView } from '../components/StatusView';
import { apiCache, workoutService } from '../services';
import { errorMessage } from '../services/api';
import { dayName } from '../utils/days';
import { workoutIcon } from '../utils/workoutIcons';
import { exerciseCount, groupCount } from '../utils/pluralize';

export default function Workouts() {
  const [initialSnapshot] = useState(() => ({
    workouts: apiCache.getArray('/workouts'),
    ready: apiCache.has('/workouts'),
  }));
  const [workouts, setWorkouts] = useState(() => initialSnapshot.workouts);
  const [loading, setLoading] = useState(() => !initialSnapshot.ready);
  const [error, setError] = useState('');
  const [actionWorkout, setActionWorkout] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async (options) => {
    if (!apiCache.has('/workouts')) setLoading(true);
    setError('');
    try {
      const { data } = await workoutService.list(options);
      setWorkouts(data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível carregar os treinos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = apiCache.subscribe((detail) => {
      if (detail.type === 'set' && detail.url === '/workouts') {
        setWorkouts(apiCache.getArray('/workouts'));
      }
    });

    workoutService.list()
      .then(({ data }) => {
        if (active) setWorkouts(data);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar os treinos.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const remove = async (workout) => {
    setActionWorkout(null);
    try {
      await workoutService.remove(workout.id);
      setWorkouts((current) => current.filter(({ id }) => id !== workout.id));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível excluir o treino.'));
    }
  };

  const archive = async (workout) => {
    setActionWorkout(null);
    try {
      await workoutService.archive(workout.id);
      setWorkouts((current) => current.filter(({ id }) => id !== workout.id));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível arquivar o treino.'));
    }
  };

  const totalExercises = workouts.reduce(
    (total, workout) => total + workout.muscle_groups.reduce(
      (groupTotal, group) => groupTotal + group.exercises.length,
      0,
    ),
    0,
  );

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
        description: 'Grupos e exercícios também serão apagados',
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
        key: 'edit',
        label: 'Editar treino',
        description: 'Alterar nome, dia ou observações',
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
    <AppShell title="Meus treinos" subtitle="Sua rotina atual">
      <WeeklyProgressCard />

      {!loading && !error && workouts.length > 0 && (
        <section className="summary-strip">
          <div><strong>{workouts.length}</strong><span>treinos</span></div>
          <div><strong>{totalExercises}</strong><span>{totalExercises === 1 ? 'exercício' : 'exercícios'}</span></div>
          <Link to="/workouts/new"><Icon>add</Icon> Novo treino</Link>
        </section>
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
          <EmptyView title="Sua semana começa aqui" text="Crie o primeiro treino e organize grupos musculares e exercícios." />
          <Link className="button button-primary button-large" to="/workouts/new"><Icon>add</Icon> Novo treino</Link>
        </>
      )}
      {!loading && workouts.length > 0 && (
        <section className="workout-list" aria-label="Treinos cadastrados">
          {workouts.map((workout) => {
            const exercises = workout.muscle_groups.flatMap((group) => group.exercises);
            return (
              <article className="workout-card" key={workout.id}>
                <Link className="workout-main" to={`/workouts/${workout.id}`}>
                  <div className="day-badge"><span>{dayName(workout.day_of_week).slice(0, 3)}</span><Icon filled>{workoutIcon(workout.icon)}</Icon></div>
                  <div className="workout-copy">
                    <div className="workout-eyebrow-row">
                      <span className="eyebrow">{dayName(workout.day_of_week)}</span>
                      <WorkoutStatusBadge status={workout.status} />
                    </div>
                    <h2>{workout.title}</h2>
                    <p>{workout.muscle_groups.length
                      ? workout.muscle_groups.map((group) => group.name).join(' · ')
                      : 'Adicione os grupos musculares'}</p>
                    <div className="card-meta">
                      <span><Icon>category</Icon>{groupCount(workout.muscle_groups.length)}</span>
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
              : `${dayName(actionWorkout?.day_of_week)} · Escolha uma opção`
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
    </AppShell>
  );
}
