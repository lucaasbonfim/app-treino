import Icon from './Icon';
import ExerciseProgressComparison from './ExerciseProgressComparison';
import { exercisePerformance, formatWeight } from '../utils/historyStats';

function setLine(set) {
  const weight = formatWeight(set.performed_weight) || '—';
  const reps = set.performed_reps ? `${set.performed_reps} reps` : '—';
  return `${weight} × ${reps}`;
}

export default function SessionExerciseItem({ exercise, previous, showComparison = false }) {
  const sets = exercise.sets || [];
  const performance = exercisePerformance(exercise);

  return (
    <div className="session-exercise">
      <span className={exercise.completed ? 'done' : ''}>
        <Icon filled>{exercise.completed ? 'check' : 'remove'}</Icon>
      </span>
      <div>
        <strong>{exercise.exercise_name}</strong>
        <small>{exercise.muscle_group_name}</small>

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
    </div>
  );
}
