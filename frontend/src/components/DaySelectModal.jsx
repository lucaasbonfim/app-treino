import { useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { WEEK_ORDER, shortDayName } from '../utils/days';
import { errorMessage } from '../services/api';

export default function DaySelectModal({ workout, days = [], onSave, onClose }) {
  const [selected, setSelected] = useState(() => new Set(days.map(Number)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (value) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave([...selected]);
      onClose();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível salvar os dias.'));
      setSaving(false);
    }
  };

  return (
    <Modal title="Dias da semana" subtitle={workout.title} onClose={onClose}>
      <div className="form-stack">
        <p className="schedule-hint">
          <Icon>info</Icon>
          Marque os dias em que você faz este treino.
        </p>

        <div className="day-toggle-grid">
          {WEEK_ORDER.map((value) => (
            <button
              key={value}
              type="button"
              className={`day-toggle ${selected.has(value) ? 'selected' : ''}`}
              onClick={() => toggle(value)}
              disabled={saving}
            >
              {shortDayName(value)}
            </button>
          ))}
        </div>

        {error && <p className="error-banner">{error}</p>}

        <div className="form-actions">
          <button className="button button-muted" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="button button-primary" type="button" onClick={submit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar dias'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
