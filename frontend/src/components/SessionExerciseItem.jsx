import { useId, useState } from 'react';
import Icon from './Icon';
import ExerciseProgressComparison from './ExerciseProgressComparison';
import { exercisePerformance, formatWeight } from '../utils/historyStats';

function setLine(set) {
  const weight = formatWeight(set.performed_weight) || '—';
  const reps = set.performed_reps ? `${set.performed_reps} reps` : '—';
  return `${weight} × ${reps}`;
}

function exerciseSummary(performance) {
  if (performance.setsDone === 0) return 'Nenhuma série concluída';

  const parts = [
    `${performance.setsDone} ${performance.setsDone === 1 ? 'série' : 'séries'}`,
  ];
  const weight = formatWeight(performance.weight);
  if (weight) parts.push(weight);
  if (performance.reps) parts.push(`${performance.reps} reps`);
  return parts.join(' • ');
}

export default function SessionExerciseItem({
  exercise,
  previous,
  showComparison = false,
  defaultSetsExpanded = false,
}) {
  const sets = exercise.sets || [];
  const performance = exercisePerformance(exercise);
  const [setsExpanded, setSetsExpanded] = useState(defaultSetsExpanded);
  const detailsId = useId();

  return (
    <div className="session-exercise">
      <span className={exercise.completed ? 'done' : ''}>
        <Icon filled>{exercise.completed ? 'check' : 'remove'}</Icon>
      </span>
      <div>
        <strong>{exercise.exercise_name}</strong>
        <small>{exercise.muscle_group_name}</small>
        <p className="session-exercise-summary">{exerciseSummary(performance)}</p>

        {sets.length > 0 && (
          <button
            type="button"
            className="session-sets-toggle"
            aria-expanded={setsExpanded}
            aria-controls={detailsId}
            onClick={() => setSetsExpanded((current) => !current)}
          >
            {setsExpanded ? 'Ocultar séries' : 'Ver séries'}
            <Icon>{setsExpanded ? 'expand_less' : 'expand_more'}</Icon>
          </button>
        )}

        {setsExpanded && (
          <div className="session-set-details" id={detailsId}>
            {sets.length > 0 ? (
              <ul className="session-set-lines">
                {sets.map((set) => (
                  <li key={set.id} className={set.completed ? 'done' : ''}>
                    <span>Série {set.set_number}</span>
                    <em>{setLine(set)}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="session-set-empty">Sem séries registradas</p>
            )}

            {exercise.notes && <em className="session-note">{exercise.notes}</em>}

            {showComparison && performance.setsDone > 0 && (
              <ExerciseProgressComparison
                current={{ weight: performance.weight, reps: performance.reps }}
                previous={previous}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
