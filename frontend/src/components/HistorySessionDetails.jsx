import Modal from './Modal';
import Icon from './Icon';
import SessionExerciseItem from './SessionExerciseItem';
import {
  formatDate,
  formatTime,
  formatDuration,
  sessionMetrics,
} from '../utils/historyStats';

export default function HistorySessionDetails({ session, onClose }) {
  if (!session) return null;
  const metrics = sessionMetrics(session);
  const duration = formatDuration(metrics.durationMin);

  return (
    <Modal
      title={session.workout_name}
      subtitle={formatDate(session.finished_at || session.started_at)}
      onClose={onClose}
    >
      <div className="session-detail-meta">
        <div>
          <span>Início</span>
          <strong>{formatTime(session.started_at) || '—'}</strong>
        </div>
        <div>
          <span>Fim</span>
          <strong>{formatTime(session.finished_at) || '—'}</strong>
        </div>
        <div>
          <span>Duração</span>
          <strong>{duration || '—'}</strong>
        </div>
      </div>

      <div className="session-detail-stats">
        <span><Icon>fitness_center</Icon> {metrics.completedExercises}/{metrics.exerciseCount} exercícios</span>
        <span><Icon>repeat</Icon> {metrics.completedSets}/{metrics.totalSets} séries</span>
      </div>

      <div className="session-detail-list">
        {session.exercises.map((exercise) => (
          <SessionExerciseItem key={exercise.id} exercise={exercise} />
        ))}
      </div>

      {session.notes && (
        <div className="history-notes">
          <Icon>notes</Icon>
          <p>{session.notes}</p>
        </div>
      )}

      <button type="button" className="button button-muted button-large" onClick={onClose}>
        <Icon>arrow_back</Icon> Voltar
      </button>
    </Modal>
  );
}
