import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AbandonWorkoutConfirmModal from '../components/AbandonWorkoutConfirmModal';
import ActionSheet from '../components/ActionSheet';
import AppShell from '../components/AppShell';
import ExerciseExecutionCard from '../components/ExerciseExecutionCard';
import FullscreenRestTimer from '../components/FullscreenRestTimer';
import Icon from '../components/Icon';
import { LoadingView } from '../components/StatusView';
import { apiCache, workoutSessionService } from '../services';
import { errorMessage } from '../services/api';
import { exerciseCount } from '../utils/pluralize';
import useRestTimer from '../hooks/useRestTimer';

function setPayload(set) {
  return {
    performed_reps: set.performed_reps || null,
    performed_weight: set.performed_weight === '' ? null : set.performed_weight,
    completed: Boolean(set.completed),
    notes: set.notes || null,
  };
}

function withDerivedCompletion(exercise, sets) {
  const completed = sets.length > 0 && sets.every((set) => set.completed);
  return { ...exercise, sets, completed };
}

export default function WorkoutRun() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const cached = apiCache.getData(`/workout-sessions/${id}`);
  const [session, setSession] = useState(() => location.state?.session || cached || null);
  const [loading, setLoading] = useState(() => !session);
  const [error, setError] = useState('');
  const [savingSetIds, setSavingSetIds] = useState({});
  const [finishing, setFinishing] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const restTimer = useRestTimer(id);

  useEffect(() => {
    let active = true;
    workoutSessionService.get(id)
      .then(({ data }) => {
        if (active) setSession(data);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar a sessão.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const exercises = useMemo(() => session?.exercises || [], [session?.exercises]);

  const groupedExercises = useMemo(() => {
    const groups = new Map();
    for (const exercise of exercises) {
      if (!groups.has(exercise.muscle_group_name)) groups.set(exercise.muscle_group_name, []);
      groups.get(exercise.muscle_group_name).push(exercise);
    }
    return [...groups.entries()];
  }, [exercises]);

  const completed = session?.status === 'completed';
  const abandoned = session?.status === 'abandoned';
  const readOnly = session?.status !== 'in_progress';
  const hasPendingSaves = Object.values(savingSetIds).some(Boolean);

  const allSets = useMemo(
    () => exercises.flatMap((exercise) => exercise.sets || []),
    [exercises],
  );
  const totalSets = allSets.length;
  const completedSets = allSets.filter((set) => set.completed).length;
  const totalExercises = exercises.length;
  const startedExercises = exercises.filter(
    (exercise) => (exercise.sets || []).some((set) => set.completed),
  ).length;
  const completedExercises = exercises.filter((exercise) => exercise.completed).length;
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

  const applySetUpdate = (exerciseId, setId, transform) => {
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const sets = (exercise.sets || []).map((set) => (
          set.id === setId ? transform(set) : set
        ));
        return withDerivedCompletion(exercise, sets);
      }),
    }));
  };

  const persistSet = async (exerciseId, setId, override) => {
    if (readOnly) return;
    setSavingSetIds((current) => ({ ...current, [setId]: true }));
    setError('');
    try {
      await workoutSessionService.updateSet(session.id, setId, setPayload(override));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível salvar a série.'));
    } finally {
      setSavingSetIds((current) => ({ ...current, [setId]: false }));
    }
  };

  const changeSetField = (exerciseId, setId, field, value) => {
    applySetUpdate(exerciseId, setId, (set) => ({ ...set, [field]: value }));
  };

  const saveSet = (exerciseId, setId, override) => {
    if (readOnly) return;
    persistSet(exerciseId, setId, override);
  };

  const toggleSet = (exercise, set) => {
    if (readOnly) return;
    const nextCompleted = !set.completed;
    const next = { ...set, completed: nextCompleted };
    applySetUpdate(exercise.id, set.id, () => next);
    persistSet(exercise.id, set.id, next);

    if (nextCompleted) {
      const sets = exercise.sets || [];
      const lastSetNumber = Math.max(...sets.map((item) => item.set_number));
      const isLastSet = set.set_number === lastSetNumber;
      if (!isLastSet) {
        restTimer.start({
          exerciseId: exercise.id,
          exerciseName: exercise.exercise_name,
          setNumber: set.set_number,
        }, exercise.rest_time_seconds || 60);
      }
    }
  };

  const startManualRest = (exercise) => {
    restTimer.start({
      exerciseId: exercise.id,
      exerciseName: exercise.exercise_name,
      setNumber: null,
    }, exercise.rest_time_seconds || 60);
  };

  const saveSessionNotes = async (notes) => {
    if (readOnly) return;
    try {
      await workoutSessionService.update(session.id, { notes: notes || null });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível salvar as observações.'));
    }
  };

  const finish = async () => {
    setFinishing(true);
    setFinishOpen(false);
    setError('');
    try {
      await workoutSessionService.finish(session.id, { notes: session.notes || null });
      restTimer.skip();
      navigate('/history', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível finalizar o treino.'));
    } finally {
      setFinishing(false);
    }
  };

  const abandon = async () => {
    setAbandoning(true);
    setError('');
    try {
      await workoutSessionService.abandon(session.id);
      restTimer.skip();
      navigate('/workouts', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível abandonar o treino.'));
      setAbandonOpen(false);
      setAbandoning(false);
    }
  };

  return (
    <AppShell
      title={session?.workout_name || 'Executar treino'}
      subtitle={completed ? 'Treino finalizado' : (abandoned ? 'Treino abandonado' : 'Treino em andamento')}
      back
      hideNav
    >
      {loading && <LoadingView />}
      {error && <p className="error-banner">{error}</p>}
      {!loading && session && (
        <>
          <section className="run-progress-card">
            <div>
              <span className="eyebrow">{readOnly ? 'Resultado' : 'Seu progresso'}</span>
              <strong>{completedSets}/{totalSets} séries</strong>
              <p>{startedExercises}/{totalExercises} exercícios iniciados · {completedExercises} concluídos</p>
            </div>
            <span className="run-progress-percent">{progress}%</span>
            <div className="run-progress-track"><i style={{ width: `${progress}%` }} /></div>
          </section>

          {groupedExercises.map(([groupName, groupExercises]) => (
            <section className="run-group" key={groupName}>
              <div className="run-group-title">
                <span><Icon>category</Icon></span>
                <div><h2>{groupName}</h2><p>{exerciseCount(groupExercises.length)}</p></div>
              </div>
              <div className="run-exercise-list">
                {groupExercises.map((exercise) => (
                  <ExerciseExecutionCard
                    key={exercise.id}
                    exercise={exercise}
                    disabled={readOnly || finishing}
                    savingSetIds={savingSetIds}
                    onSetFieldChange={changeSetField}
                    onSetSave={saveSet}
                    onSetToggle={toggleSet}
                    onStartRest={startManualRest}
                    showLastPerformance={!readOnly}
                  />
                ))}
              </div>
            </section>
          ))}

          <label className="field run-notes">
            <span>Observações do treino</span>
            <textarea
              rows="4"
              maxLength={2000}
              disabled={readOnly}
              value={session.notes || ''}
              onChange={(event) => setSession((current) => ({ ...current, notes: event.target.value }))}
              onBlur={(event) => saveSessionNotes(event.target.value)}
              placeholder="Como foi o treino hoje?"
            />
          </label>

          {completed && (
            <button className="button button-primary button-large" type="button" onClick={() => navigate('/history')}>
              <Icon>history</Icon> Ver histórico
            </button>
          )}
          {abandoned && (
            <button className="button button-muted button-large" type="button" onClick={() => navigate('/workouts')}>
              <Icon>arrow_back</Icon> Voltar aos treinos
            </button>
          )}
          {!readOnly && (
            <div className="run-session-actions">
              <button className="finish-workout-button" type="button" onClick={() => setFinishOpen(true)} disabled={finishing || abandoning || hasPendingSaves}>
                <Icon filled>flag</Icon>
                {finishing ? 'Finalizando...' : (hasPendingSaves ? 'Salvando alterações...' : 'Finalizar treino')}
              </button>
              <button
                className="abandon-workout-button"
                type="button"
                onClick={() => setAbandonOpen(true)}
                disabled={finishing || abandoning || hasPendingSaves}
              >
                <Icon>cancel</Icon>
                Abandonar treino
              </button>
            </div>
          )}
        </>
      )}

      <ActionSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finalizar este treino?"
        description={`${completedSets} de ${totalSets} séries concluídas.`}
        icon="flag"
        actions={[{
          key: 'finish',
          label: 'Finalizar e salvar no histórico',
          description: 'A sessão ficará disponível no histórico',
          icon: 'check_circle',
          keepOpen: true,
          onSelect: finish,
        }]}
      />
      <AbandonWorkoutConfirmModal
        open={abandonOpen}
        onClose={() => {
          if (!abandoning) setAbandonOpen(false);
        }}
        onConfirm={abandon}
        loading={abandoning}
      />
      <FullscreenRestTimer
        timer={restTimer.timer}
        onFinish={restTimer.skip}
        onSkip={restTimer.skip}
        onPause={restTimer.pause}
        onResume={restTimer.resume}
        onRestart={restTimer.restart}
      />
    </AppShell>
  );
}
