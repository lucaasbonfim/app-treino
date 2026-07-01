import Icon from './Icon';

function formatWeight(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return `${value}`;
  return `${number.toLocaleString('pt-BR')} kg`;
}

function summary(set) {
  const parts = [formatWeight(set.performed_weight)];
  if (set.performed_reps) parts.push(`${set.performed_reps} reps`);
  const filled = parts.filter(Boolean);
  return filled.length ? filled.join(' · ') : 'Sem registro';
}

export default function SetExecutionRow({
  exercise,
  set,
  active,
  disabled,
  saving,
  onFieldChange,
  onSave,
  onToggle,
}) {
  const completed = Boolean(set.completed);

  // Séries concluídas viram uma linha compacta; tocar reabre para edição.
  if (completed) {
    return (
      <button
        type="button"
        className="run-set-compact done"
        disabled={disabled}
        onClick={() => onToggle(exercise, set)}
      >
        <span className="run-set-compact-check"><Icon filled>check_circle</Icon></span>
        <span className="run-set-compact-title">Série {set.set_number}</span>
        <span className="run-set-compact-values">{summary(set)}</span>
        {!disabled && <Icon className="run-set-compact-edit">edit</Icon>}
      </button>
    );
  }

  // Séries que ainda não chegaram a vez ficam recolhidas (apenas prévia).
  if (!active) {
    return (
      <div className="run-set-compact upcoming">
        <span className="run-set-compact-num">{set.set_number}</span>
        <span className="run-set-compact-title">Série {set.set_number}</span>
        <span className="run-set-compact-values">{summary(set)}</span>
      </div>
    );
  }

  const handleSave = (field, value) => {
    onSave(exercise.id, set.id, { ...set, [field]: value });
  };

  return (
    <div className="run-set-row active">
      <div className="run-set-head">
        <span className="run-set-number">Série {set.set_number}</span>
        <span className="run-set-current">Série atual</span>
        {saving && <span className="run-set-saving"><Icon>sync</Icon></span>}
      </div>

      <div className="run-set-fields">
        <label>
          <span>Carga realizada</span>
          <div className="run-set-input">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              disabled={disabled}
              value={set.performed_weight ?? ''}
              onChange={(event) => onFieldChange(exercise.id, set.id, 'performed_weight', event.target.value)}
              onBlur={(event) => handleSave('performed_weight', event.target.value)}
              placeholder="0"
            />
            <small>kg</small>
          </div>
        </label>
        <label>
          <span>Reps realizadas</span>
          <div className="run-set-input">
            <input
              type="text"
              inputMode="numeric"
              maxLength={30}
              disabled={disabled}
              value={set.performed_reps ?? ''}
              onChange={(event) => onFieldChange(exercise.id, set.id, 'performed_reps', event.target.value)}
              onBlur={(event) => handleSave('performed_reps', event.target.value)}
              placeholder="Ex.: 10"
            />
          </div>
        </label>
      </div>

      <button
        type="button"
        className="run-set-complete"
        disabled={disabled}
        onClick={() => onToggle(exercise, set)}
      >
        <Icon filled>radio_button_unchecked</Icon>
        Concluir série
      </button>
    </div>
  );
}
