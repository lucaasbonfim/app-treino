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
    `${metrics.exerciseCount} ${metrics.exerciseCount === 1 ? 'exercício' : 'exercícios'}`,
    `${metrics.completedSets} ${metrics.completedSets === 1 ? 'série' : 'séries'}`,
  ];
  if (duration) metaParts.push(duration);

  return (
    <article className="history-card">
      <button className="history-summary" type="button" onClick={onToggle}>
        <span className="history-icon"><Icon filled>trophy</Icon></span>
        <span>
          <small>{formatDate(session.finished_at || session.started_at)}</small>
          <strong>{session.workout_name}</strong>
          <em>{metaParts.join(' • ')}</em>
          {session.workout_status === 'archived' && (
            <span className="history-archived-tag"><Icon>inventory_2</Icon> Treino arquivado</span>
          )}
        </span>
        <Icon>{expanded ? 'expand_less' : 'expand_more'}</Icon>
      </button>

      {expanded && (
        <div className="history-details">
          <div className="history-stat-row">
            <span><b>{metrics.completedExercises}/{metrics.exerciseCount}</b> exercícios</span>
            <span><b>{metrics.completedSets}/{metrics.totalSets}</b> séries</span>
            {duration && <span><b>{duration}</b> duração</span>}
          </div>

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
