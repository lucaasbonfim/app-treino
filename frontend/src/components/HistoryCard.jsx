import Icon from './Icon';
import SessionExerciseItem from './SessionExerciseItem';
import {
  formatDate,
  formatDuration,
  sessionMetrics,
  previousExecution,
} from '../utils/historyStats';

export default function HistoryCard({
  session,
  sessions,
  expanded,
  onToggle,
  onOpenDetails,
}) {
  const metrics = sessionMetrics(session);
  const duration = formatDuration(metrics.durationMin);
  const metaParts = [
    `${metrics.completedExercises} ${metrics.completedExercises === 1 ? 'exercício' : 'exercícios'}`,
    `${metrics.completedSets} ${metrics.completedSets === 1 ? 'série' : 'séries'}`,
    duration,
  ];
  const detailsId = `history-session-${session.id}`;

  return (
    <article className={`history-card ${expanded ? 'expanded' : ''}`}>
      <button
        className="history-summary"
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggle}
      >
        <span className="history-card-copy">
          <strong>{session.workout_name}</strong>
          <small>{formatDate(session.finished_at || session.started_at)}</small>
          <em>{metaParts.join(' • ')}</em>
          {session.workout_status === 'archived' && (
            <span className="history-archived-tag"><Icon>inventory_2</Icon> Treino arquivado</span>
          )}
        </span>
        <span className="history-expand-icon" aria-hidden="true">
          <Icon>{expanded ? 'expand_less' : 'expand_more'}</Icon>
        </span>
      </button>

      {expanded && (
        <div className="history-details" id={detailsId}>
          <div className="history-exercise-list">
            {session.exercises.map((exercise) => (
              <SessionExerciseItem
                key={exercise.id}
                exercise={exercise}
                showComparison
                previous={previousExecution(
                  sessions,
                  session,
                  exercise.exercise_name,
                  exercise.muscle_group_name,
                )}
              />
            ))}
          </div>

          {session.notes && (
            <div className="history-notes">
              <Icon>notes</Icon>
              <p>{session.notes}</p>
            </div>
          )}

          <button type="button" className="history-details-button" onClick={() => onOpenDetails(session)}>
            <Icon>open_in_full</Icon>
            Ver detalhes
          </button>
        </div>
      )}
    </article>
  );
}
