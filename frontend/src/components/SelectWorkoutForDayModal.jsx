import { useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { workoutIcon } from '../utils/workoutIcons';

function groupsLabel(workout) {
  const sections = (workout.muscle_groups || []).filter((group) => !group.is_default);
  if (sections.length) return sections.map((group) => group.name).join(' · ');
  const exercises = (workout.muscle_groups || []).flatMap((group) => group.exercises || []);
  if (exercises.length) return exercises.map((exercise) => exercise.name).join(' · ');
  return 'Sem exercícios ainda';
}

export default function SelectWorkoutForDayModal({
  day,
  workouts = [],
  saving = false,
  error = '',
  onSave,
  onRest,
  onRemove,
  onClose,
}) {
  const [selected, setSelected] = useState(
    () => new Set((day.workouts || []).map((workout) => workout.id)),
  );

  // Só há o que "remover" quando o dia foi configurado manualmente na agenda.
  const isExplicit = day.source === 'schedule' || day.source === 'rest';

  const toggle = (workoutId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(workoutId)) next.delete(workoutId);
      else next.add(workoutId);
      return next;
    });
  };

  const save = () => onSave([...selected]);

  return (
    <Modal title="Treinos do dia" subtitle={day.label} onClose={onClose}>
      <div className="schedule-select">
        {day.source === 'workout_day' && (
          <p className="schedule-hint">
            <Icon>info</Icon>
            Estes treinos vieram do dia marcado em cada treino. Ajuste abaixo para mudar só {day.label}.
          </p>
        )}
        {error && <p className="error-banner">{error}</p>}

        <div className="schedule-select-list">
          {workouts.length === 0 && (
            <p className="schedule-select-empty">
              Nenhum treino ativo disponível. Crie ou reative um treino primeiro.
            </p>
          )}
          {workouts.map((workout) => {
            const isOn = selected.has(workout.id);
            return (
              <button
                key={workout.id}
                type="button"
                className={`schedule-option ${isOn ? 'selected' : ''}`}
                onClick={() => toggle(workout.id)}
                disabled={saving}
              >
                <span className="schedule-option-icon"><Icon filled>{workoutIcon(workout.icon)}</Icon></span>
                <span className="schedule-option-copy">
                  <strong>{workout.title}</strong>
                  <small>{groupsLabel(workout)}</small>
                </span>
                <Icon className="schedule-option-check">
                  {isOn ? 'check_box' : 'check_box_outline_blank'}
                </Icon>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`schedule-option rest ${day.is_rest_day ? 'selected' : ''}`}
          onClick={onRest}
          disabled={saving}
        >
          <span className="schedule-option-icon"><Icon filled>self_improvement</Icon></span>
          <span className="schedule-option-copy">
            <strong>Marcar como descanso</strong>
            <small>Recuperar também faz parte</small>
          </span>
          <Icon className="schedule-option-check">
            {day.is_rest_day ? 'check_circle' : 'radio_button_unchecked'}
          </Icon>
        </button>

        {isExplicit && (
          <button
            type="button"
            className="schedule-option danger"
            onClick={onRemove}
            disabled={saving}
          >
            <span className="schedule-option-icon"><Icon>close</Icon></span>
            <span className="schedule-option-copy">
              <strong>Limpar o dia</strong>
              <small>Deixar sem treino e sem descanso</small>
            </span>
          </button>
        )}

        <div className="form-actions">
          <button className="button button-muted" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="button button-primary" type="button" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar dia'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
