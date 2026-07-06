import Icon from './Icon';

function formatWeight(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return `${value} kg`;
  return `${number.toLocaleString('pt-BR')} kg`;
}

function formatSet(set) {
  const weight = formatWeight(set.performed_weight);
  const reps = set.performed_reps ? `${set.performed_reps} reps` : null;
  if (weight && reps) return `${weight} × ${reps}`;
  return weight || reps;
}

export default function LastPerformanceInfo({ performance }) {
  if (!performance) {
    return (
      <div className="last-performance-info empty">
        <Icon>history_toggle_off</Icon>
        <span>Primeira vez fazendo este exercício</span>
      </div>
    );
  }

  const sets = performance.sets || [];
  const details = sets.map(formatSet).filter(Boolean);
  let summary;

  if (!details.length) {
    summary = `${sets.length} ${sets.length === 1 ? 'série registrada' : 'séries registradas'}`;
  } else if (details.length > 1 && details.every((detail) => detail === details[0])) {
    summary = `${details[0]} · ${details.length} séries`;
  } else {
    const visible = details.slice(0, 4);
    summary = visible.join(' / ');
    if (details.length > visible.length) summary += ` / +${details.length - visible.length}`;
  }

  return (
    <div className="last-performance-info" title={details.join(' / ') || summary}>
      <Icon>history</Icon>
      <span><strong>Última vez:</strong> {summary}</span>
    </div>
  );
}
