import Icon from './Icon';
import LastPerformanceInfo from './LastPerformanceInfo';
import SetExecutionRow from './SetExecutionRow';

function plannedValue(value, suffix = '') {
  return value === null || value === undefined || value === ''
    ? 'Não informado'
    : `${value}${suffix}`;
}

export default function ExerciseExecutionCard({
  exercise,
  disabled,
  savingSetIds,
  onSetFieldChange,
  onSetSave,
  onSetToggle,
  onStartRest,
  showLastPerformance = false,
}) {
  const sets = exercise.sets || [];
  const completedSets = sets.filter((set) => set.completed).length;
  const restSeconds = exercise.rest_time_seconds || 60;
  // A "série atual" é a primeira ainda não concluída — só ela fica expandida.
  const activeSet = sets.find((set) => !set.completed);

  return (
    <article className={`run-exercise-card ${exercise.completed ? 'completed' : ''}`}>
      <header>
        <span className="run-exercise-status">
          <Icon filled>{exercise.completed ? 'check' : 'fitness_center'}</Icon>
        </span>
        <div>
          <h3>{exercise.exercise_name}</h3>
          <p>{exercise.muscle_group_name}</p>
        </div>
        <span className="run-exercise-count">{completedSets}/{sets.length}</span>
      </header>

      {showLastPerformance && (
        <LastPerformanceInfo performance={exercise.last_performance} />
      )}

      <div className="planned-strip">
        <span><small>Planejado</small><strong>{plannedValue(sets.length, ' séries')}</strong></span>
        <span><small>Repetições</small><strong>{plannedValue(exercise.planned_reps)}</strong></span>
        <span><small>Carga</small><strong>{plannedValue(exercise.planned_weight, ' kg')}</strong></span>
      </div>

      <div className="run-set-list">
        {sets.map((set) => (
          <SetExecutionRow
            key={set.id}
            exercise={exercise}
            set={set}
            active={activeSet?.id === set.id}
            disabled={disabled}
            saving={Boolean(savingSetIds[set.id])}
            onFieldChange={onSetFieldChange}
            onSave={onSetSave}
            onToggle={onSetToggle}
          />
        ))}
      </div>

      <div className="exercise-rest-row">
        <span><Icon>timer</Icon><strong>Descanso</strong><small>{restSeconds}s</small></span>
        {!disabled && (
          <button type="button" onClick={() => onStartRest(exercise)}>
            <Icon filled>play_arrow</Icon>
            Descansar
          </button>
        )}
      </div>
    </article>
  );
}
