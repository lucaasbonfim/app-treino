import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ActionSheet from '../components/ActionSheet';
import AppShell from '../components/AppShell';
import ExerciseForm from '../components/ExerciseForm';
import ExerciseLibraryModal from '../components/ExerciseLibraryModal';
import GroupForm from '../components/GroupForm';
import Icon from '../components/Icon';
import WorkoutStatusBadge from '../components/WorkoutStatusBadge';
import { EmptyView, LoadingView } from '../components/StatusView';
import {
  apiCache,
  exerciseService,
  muscleGroupService,
  workoutSessionService,
  workoutService,
} from '../services';
import { errorMessage } from '../services/api';
import { dayName } from '../utils/days';
import { workoutIcon } from '../utils/workoutIcons';
import { getCachedWorkout, hasCachedWorkout } from '../utils/workoutCache';
import { exerciseCount } from '../utils/pluralize';
import { defaultSection, namedSections, allExercises } from '../utils/workoutSections';

function ExerciseRow({ exercise, onActions, readOnly = false }) {
  const details = [
    exercise.sets ? `${exercise.sets} séries` : null,
    exercise.reps ? `${exercise.reps} reps` : null,
    exercise.weight !== null && exercise.weight !== undefined ? `${Number(exercise.weight).toLocaleString('pt-BR')} kg` : null,
    `${exercise.rest_time_seconds || 60}s de descanso`,
  ].filter(Boolean);

  return (
    <li className="exercise-row">
      <div className="exercise-index"><Icon>fitness_center</Icon></div>
      <div className="exercise-copy">
        <strong>{exercise.name}</strong>
        <p>{details.join(' · ') || 'Sem séries, repetições ou carga'}</p>
        {exercise.notes && <span>{exercise.notes}</span>}
      </div>
      {!readOnly && (
        <button
          className="more-button more-button-compact"
          type="button"
          onClick={onActions}
          aria-label={`Opções de ${exercise.name}`}
          aria-haspopup="dialog"
        >
          <Icon>more_horiz</Icon>
        </button>
      )}
    </li>
  );
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const [initialWorkout] = useState(() => getCachedWorkout(id));
  const [workout, setWorkout] = useState(() => initialWorkout);
  const [loading, setLoading] = useState(() => !hasCachedWorkout(id));
  const [error, setError] = useState('');
  const [groupModal, setGroupModal] = useState(null);
  const [exerciseModal, setExerciseModal] = useState(null);
  const [addTarget, setAddTarget] = useState(null);
  const [libraryModal, setLibraryModal] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [starting, setStarting] = useState(false);
  const [confirmReactivate, setConfirmReactivate] = useState(false);
  const navigate = useNavigate();
  const archived = workout?.status === 'archived';

  const load = useCallback(async (options) => {
    setError('');
    try {
      const { data } = await workoutService.get(id, options);
      setWorkout(data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível carregar o treino.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    const unsubscribe = apiCache.subscribe((detail) => {
      if (detail.type === 'set' && detail.url === `/workouts/${id}`) {
        setWorkout(getCachedWorkout(id));
      }
    });

    workoutService.get(id)
      .then(({ data }) => {
        if (active) setWorkout(data);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar o treino.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [id]);

  const mutate = async (operation) => {
    setError('');
    await operation();
    await load();
  };

  const removeGroup = async (group) => {
    setActionTarget(null);
    try {
      await mutate(() => muscleGroupService.remove(group.id));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível excluir o grupo.'));
    }
  };

  const removeExercise = async (exercise) => {
    setActionTarget(null);
    try {
      await mutate(() => exerciseService.remove(exercise.id));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível excluir o exercício.'));
    }
  };

  const removeWorkout = async (targetWorkout) => {
    setActionTarget(null);
    try {
      await workoutService.remove(targetWorkout.id);
      navigate('/workouts', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível excluir o treino.'));
    }
  };

  const startWorkout = async () => {
    setStarting(true);
    setError('');
    try {
      const { data } = await workoutSessionService.start(workout.id);
      navigate(`/workout-sessions/${data.id}`, { state: { session: data } });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível iniciar o treino.'));
    } finally {
      setStarting(false);
    }
  };

  const reactivateWorkout = async () => {
    setConfirmReactivate(false);
    try {
      await mutate(() => workoutService.reactivate(workout.id));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível reativar o treino.'));
    }
  };

  const editTarget = () => {
    if (actionTarget.type === 'workout') {
      navigate(`/workouts/${actionTarget.item.id}/edit`);
      return;
    }
    if (actionTarget.type === 'group') {
      setGroupModal({ mode: 'edit', group: actionTarget.item });
      return;
    }
    setExerciseModal({
      mode: 'edit',
      group: actionTarget.group,
      exercise: actionTarget.item,
    });
  };

  const deleteTarget = () => {
    if (actionTarget.type === 'workout') return removeWorkout(actionTarget.item);
    if (actionTarget.type === 'group') return removeGroup(actionTarget.item);
    return removeExercise(actionTarget.item);
  };

  const targetName = actionTarget?.item?.title || actionTarget?.item?.name;
  const targetDescriptions = {
    workout: {
      label: 'Treino',
      edit: 'Alterar nome, dia ou observações',
      delete: 'Grupos e exercícios também serão apagados',
      icon: workoutIcon(workout?.icon),
    },
    group: {
      label: 'Seção',
      edit: 'Alterar o nome da seção',
      delete: 'Os exercícios desta seção também serão apagados',
      icon: 'category',
    },
    exercise: {
      label: 'Exercício',
      edit: 'Alterar séries, repetições, carga ou notas',
      delete: 'Remover este exercício do treino',
      icon: 'fitness_center',
    },
  };
  const targetMeta = actionTarget ? targetDescriptions[actionTarget.type] : null;
  const actionSheetActions = actionTarget
    ? (actionTarget.confirmDelete
      ? [
        {
          key: 'back',
          label: 'Voltar às opções',
          description: `Não excluir este ${targetMeta.label.toLowerCase()}`,
          icon: 'arrow_back',
          keepOpen: true,
          onSelect: () => setActionTarget((current) => ({ ...current, confirmDelete: false })),
        },
        {
          key: 'confirm-delete',
          label: 'Excluir definitivamente',
          description: targetMeta.delete,
          icon: 'delete_forever',
          tone: 'danger',
          keepOpen: true,
          onSelect: deleteTarget,
        },
      ]
      : [
        (actionTarget.type === 'workout' && archived
          ? {
            key: 'reactivate',
            label: 'Reativar treino',
            description: 'Volta para a sua rotina atual',
            icon: 'restart_alt',
            keepOpen: true,
            onSelect: () => { setActionTarget(null); setConfirmReactivate(true); },
          }
          : {
            key: 'edit',
            label: `Editar ${targetMeta.label.toLowerCase()}`,
            description: targetMeta.edit,
            icon: 'edit',
            onSelect: editTarget,
          }),
        {
          key: 'delete',
          label: `Excluir ${targetMeta.label.toLowerCase()}`,
          description: 'Esta ação exige confirmação',
          icon: 'delete',
          tone: 'danger',
          keepOpen: true,
          onSelect: () => setActionTarget((current) => ({ ...current, confirmDelete: true })),
        },
      ])
    : [];

  const action = workout ? (
    <button
      className="icon-button"
      type="button"
      aria-label="Opções do treino"
      aria-haspopup="dialog"
      onClick={() => setActionTarget({ type: 'workout', item: workout })}
    >
      <Icon>more_horiz</Icon>
    </button>
  ) : null;

  return (
    <AppShell title={workout?.title || 'Detalhes do treino'} subtitle={workout ? dayName(workout.day_of_week) : ''} back action={action}>
      {loading && <LoadingView />}
      {error && <div className="error-banner with-action"><span>{error}</span><button type="button" onClick={() => load({ force: true, allowStale: false })}>Tentar novamente</button></div>}
      {!loading && workout && (
        <>
          <section className="detail-hero">
            <span className="detail-icon"><Icon filled>{workoutIcon(workout.icon)}</Icon></span>
            <div>
              <div className="detail-hero-top">
                <span className="eyebrow">{dayName(workout.day_of_week)}</span>
                <WorkoutStatusBadge status={workout.status} />
              </div>
              <h2>{workout.title}</h2>
              {workout.notes && <p>{workout.notes}</p>}
            </div>
          </section>

          {archived ? (
            <section className="archived-notice">
              <div>
                <span className="archived-notice-icon"><Icon filled>inventory_2</Icon></span>
                <div>
                  <strong>Este treino está arquivado</strong>
                  <small>Somente leitura. Reative para editar ou iniciar.</small>
                </div>
              </div>
              <button className="button button-primary button-large" type="button" onClick={() => setConfirmReactivate(true)}>
                <Icon>restart_alt</Icon> Reativar treino
              </button>
            </section>
          ) : (
            <button className="start-workout-button" type="button" onClick={startWorkout} disabled={starting}>
              <span className="start-workout-icon"><Icon filled>play_arrow</Icon></span>
              <span><strong>{starting ? 'Iniciando...' : 'Iniciar treino'}</strong><small>Registrar séries, repetições e cargas</small></span>
              <Icon>chevron_right</Icon>
            </button>
          )}

          {(() => {
            const loose = defaultSection(workout);
            const sections = namedSections(workout);
            const hasAnyExercise = allExercises(workout).length > 0;

            const renderExerciseList = (group) => (
              group.exercises.length > 0 && (
                <ol className="exercise-list">
                  {group.exercises.map((exercise) => (
                    <ExerciseRow
                      key={exercise.id}
                      exercise={exercise}
                      readOnly={archived}
                      onActions={() => setActionTarget({ type: 'exercise', item: exercise, group })}
                    />
                  ))}
                </ol>
              )
            );

            return (
              <>
                <div className="section-title-row">
                  <div>
                    <span className="eyebrow">Exercícios</span>
                    <h2>{sections.length > 0 ? 'Seções do treino' : 'Lista de exercícios'}</h2>
                  </div>
                  {!archived && (
                    <button className="button button-small button-muted" type="button" onClick={() => setGroupModal({ mode: 'create' })}><Icon>add</Icon> Adicionar seção</button>
                  )}
                </div>

                {archived && !hasAnyExercise && (
                  <EmptyView
                    title="Nenhum exercício"
                    text="Este treino arquivado não tem exercícios cadastrados."
                  />
                )}

                <section className="group-list">
                  {/* Exercícios soltos (seção default, sem cabeçalho) */}
                  {loose && (loose.exercises.length > 0 || !archived) && (
                    <article className="group-card">
                      {renderExerciseList(loose)}
                      {!archived && (
                        <>
                          {loose.exercises.length === 0 && (
                            <p className="group-empty-hint">Nenhum exercício ainda. Adicione o primeiro abaixo.</p>
                          )}
                          <button className="add-row-button" type="button" onClick={() => setAddTarget(loose)}><Icon>add</Icon> Adicionar exercício</button>
                        </>
                      )}
                    </article>
                  )}

                  {/* Seções nomeadas */}
                  {sections.map((group) => (
                    <article className="group-card" key={group.id}>
                      <header className="group-header">
                        <div>
                          <span className="group-number">{String(group.sort_order + 1).padStart(2, '0')}</span>
                          <div><h3>{group.name}</h3><p>{exerciseCount(group.exercises.length)}</p></div>
                        </div>
                        {!archived && (
                          <button
                            className="more-button more-button-compact"
                            type="button"
                            onClick={() => setActionTarget({ type: 'group', item: group })}
                            aria-label={`Opções de ${group.name}`}
                            aria-haspopup="dialog"
                          >
                            <Icon>more_horiz</Icon>
                          </button>
                        )}
                      </header>
                      {renderExerciseList(group)}
                      {!archived && (
                        <button className="add-row-button" type="button" onClick={() => setAddTarget(group)}><Icon>add</Icon> Adicionar exercício</button>
                      )}
                    </article>
                  ))}
                </section>
              </>
            );
          })()}
        </>
      )}

      {groupModal && (
        <GroupForm
          group={groupModal.group}
          onClose={() => setGroupModal(null)}
          onSubmit={(payload) => mutate(() => (
            groupModal.mode === 'edit'
              ? muscleGroupService.update(groupModal.group.id, payload)
              : muscleGroupService.create(workout.id, payload)
          ))}
        />
      )}
      {exerciseModal && (
        <ExerciseForm
          exercise={exerciseModal.exercise}
          groupName={exerciseModal.group.name}
          onClose={() => setExerciseModal(null)}
          onSubmit={(payload) => mutate(() => (
            exerciseModal.mode === 'edit'
              ? exerciseService.update(exerciseModal.exercise.id, payload)
              : exerciseService.create(exerciseModal.group.id, payload)
          ))}
        />
      )}
      <ActionSheet
        open={Boolean(addTarget)}
        onClose={() => setAddTarget(null)}
        title="Adicionar exercício"
        description={addTarget ? (addTarget.is_default ? workout?.title : `Seção: ${addTarget.name}`) : ''}
        icon="add"
        actions={[
          {
            key: 'manual',
            label: 'Adicionar manualmente',
            description: 'Digitar nome, séries, carga e descanso',
            icon: 'edit_note',
            onSelect: () => setExerciseModal({ mode: 'create', group: addTarget }),
          },
          {
            key: 'library',
            label: 'Escolher da biblioteca',
            description: 'Selecionar um exercício pronto',
            icon: 'menu_book',
            onSelect: () => setLibraryModal({ group: addTarget }),
          },
        ]}
      />
      {libraryModal && (
        <ExerciseLibraryModal
          groupName={libraryModal.group.name}
          onClose={() => setLibraryModal(null)}
          onAdd={async (payload) => {
            await mutate(() => exerciseService.createFromLibrary(libraryModal.group.id, payload));
            setLibraryModal(null);
          }}
        />
      )}
      <ActionSheet
        open={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.confirmDelete ? `Excluir “${targetName}”?` : targetName}
        description={actionTarget?.confirmDelete
          ? 'Esta ação não pode ser desfeita.'
          : `${targetMeta?.label || ''} · Escolha uma opção`}
        icon={actionTarget?.confirmDelete ? 'warning' : targetMeta?.icon}
        actions={actionSheetActions}
      />
      <ActionSheet
        open={confirmReactivate}
        onClose={() => setConfirmReactivate(false)}
        title="Reativar este treino?"
        description="Esse treino voltará para sua rotina atual."
        icon="restart_alt"
        actions={[{
          key: 'reactivate',
          label: 'Reativar treino',
          description: 'Volta para “Meus treinos” e pode ser iniciado',
          icon: 'restart_alt',
          keepOpen: true,
          onSelect: reactivateWorkout,
        }]}
      />
    </AppShell>
  );
}
