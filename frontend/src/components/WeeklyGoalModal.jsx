import { useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import WeeklyGoalSelector from './WeeklyGoalSelector';
import { errorMessage } from '../services/api';

export default function WeeklyGoalModal({ current, onClose, onSave }) {
  const [goal, setGoal] = useState(current || 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(goal);
      onClose();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível salvar a meta.'));
      setSaving(false);
    }
  };

  return (
    <Modal title="Meta semanal" subtitle="Quantos treinos por semana?" onClose={onClose}>
      <div className="form-stack">
        <WeeklyGoalSelector value={goal} onChange={setGoal} />
        <p className="goal-hint">
          <Icon>target</Icon>
          Treinar {goal} {goal === 1 ? 'vez' : 'vezes'} por semana
        </p>
        {error && <p className="error-banner">{error}</p>}
        <div className="form-actions">
          <button className="button button-muted" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" type="button" onClick={submit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar meta'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
