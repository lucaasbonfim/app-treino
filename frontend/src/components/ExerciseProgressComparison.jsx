import Icon from './Icon';
import { formatWeight } from '../utils/historyStats';

function performanceLabel(performance) {
  if (!performance) return null;
  const weight = formatWeight(performance.weight) || 'Sem carga';
  return performance.reps ? `${weight} × ${performance.reps} reps` : weight;
}

export default function ExerciseProgressComparison({ current, previous }) {
  const currentLabel = performanceLabel(current);

  if (!previous) {
    return (
      <div className="progress-compare first">
        <Icon>flag</Icon>
        <div>
          <strong>Primeiro registro deste exercício</strong>
          {currentLabel && <small>Atual: {currentLabel}</small>}
        </div>
      </div>
    );
  }

  const hasNumbers = current?.weight != null && previous?.weight != null;
  const delta = hasNumbers ? Number((current.weight - previous.weight).toFixed(2)) : null;

  let tone = 'same';
  let icon = 'trending_flat';
  let message = 'Você manteve a carga anterior';
  if (delta !== null && delta > 0) {
    tone = 'up';
    icon = 'trending_up';
    message = `Você evoluiu +${formatWeight(delta)}`;
  } else if (delta !== null && delta < 0) {
    tone = 'down';
    icon = 'trending_down';
    message = `Reduziu ${formatWeight(Math.abs(delta))}`;
  }

  return (
    <div className={`progress-compare ${tone}`}>
      <Icon filled>{icon}</Icon>
      <div>
        <strong>{message}</strong>
        <small>
          Atual: {currentLabel} · Anterior: {performanceLabel(previous)}
        </small>
      </div>
    </div>
  );
}
