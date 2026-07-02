import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ActionSheet from '../components/ActionSheet';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import WorkoutStatusBadge from '../components/WorkoutStatusBadge';
import { EmptyView, LoadingView } from '../components/StatusView';
import { workoutService } from '../services';
import { errorMessage } from '../services/api';
import { dayName } from '../utils/days';
import { workoutIcon } from '../utils/workoutIcons';
import { exerciseCount, sectionCount } from '../utils/pluralize';
import { namedSections } from '../utils/workoutSections';
import { formatShortDate } from '../utils/historyStats';

export default function ArchivedWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    workoutService.listArchived({ force: true })
      .then(({ data }) => { if (active) setWorkouts(data); })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar os arquivados.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const reactivate = async () => {
    const target = reactivateTarget;
    setReactivateTarget(null);
    setBusy(true);
    setError('');
    try {
      await workoutService.reactivate(target.id);
      setWorkouts((current) => current.filter((workout) => workout.id !== target.id));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível reativar o treino.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Arquivo de treinos" subtitle="Fichas antigas salvas" back>
      {loading && <LoadingView />}
      {error && <p className="error-banner">{error}</p>}

      {!loading && !error && workouts.length === 0 && (
        <EmptyView
          title="Nenhum treino arquivado"
          text="Quando você arquivar um treino, ele fica guardado aqui para consulta."
        />
      )}

      {!loading && workouts.length > 0 && (
        <section className="workout-list" aria-label="Treinos arquivados">
          {workouts.map((workout) => {
            const exercises = workout.muscle_groups.flatMap((group) => group.exercises);
            const sections = namedSections(workout);
            return (
              <article className="archived-card" key={workout.id}>
                <div className="archived-main">
                  <span className="archived-icon"><Icon filled>{workoutIcon(workout.icon)}</Icon></span>
                  <div className="archived-copy">
                    <div className="archived-title">
                      <h2>{workout.title}</h2>
                      <WorkoutStatusBadge status="archived" />
                    </div>
                    <p>{dayName(workout.day_of_week)}</p>
                    <div className="card-meta">
                      {sections.length > 0 && (
                        <span><Icon>category</Icon>{sectionCount(sections.length)}</span>
                      )}
                      <span><Icon>fitness_center</Icon>{exerciseCount(exercises.length)}</span>
                      {workout.archived_at && (
                        <span><Icon>inventory_2</Icon>Arquivado em {formatShortDate(workout.archived_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="archived-actions">
                  <button
                    type="button"
                    className="button button-muted"
                    onClick={() => navigate(`/workouts/${workout.id}`)}
                  >
                    <Icon>visibility</Icon> Visualizar
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={busy}
                    onClick={() => setReactivateTarget(workout)}
                  >
                    <Icon>restart_alt</Icon> Reativar
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <p className="archive-back-link">
        <Link to="/workouts"><Icon>arrow_back</Icon> Voltar aos treinos atuais</Link>
      </p>

      <ActionSheet
        open={Boolean(reactivateTarget)}
        onClose={() => setReactivateTarget(null)}
        title="Reativar este treino?"
        description="Esse treino voltará para sua rotina atual."
        icon="restart_alt"
        actions={[{
          key: 'reactivate',
          label: 'Reativar treino',
          description: 'Volta para “Meus treinos” e pode ser iniciado',
          icon: 'restart_alt',
          keepOpen: true,
          onSelect: reactivate,
        }]}
      />
    </AppShell>
  );
}
