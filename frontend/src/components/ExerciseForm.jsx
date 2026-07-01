import { useState } from 'react';
import Modal from './Modal';
import SelectField from './SelectField';
import { errorMessage } from '../services/api';
import { REST_TIME_OPTIONS } from '../utils/restTimes';

const empty = {
  name: '',
  sets: '',
  reps: '',
  weight: '',
  rest_time_seconds: '60',
  notes: '',
};

export default function ExerciseForm({ exercise, groupName, onSubmit, onClose }) {
  const [form, setForm] = useState(exercise ? {
    name: exercise.name || '',
    sets: exercise.sets ?? '',
    reps: exercise.reps || '',
    weight: exercise.weight ?? '',
    rest_time_seconds: String(exercise.rest_time_seconds || 60),
    notes: exercise.notes || '',
  } : empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => setForm((current) => ({
    ...current,
    [field]: event.target.value,
  }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível salvar o exercício.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={exercise ? 'Editar exercício' : 'Adicionar exercício'}
      subtitle={`Grupo: ${groupName}`}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>Exercício</span>
          <input
            autoFocus
            required
            maxLength={120}
            value={form.name}
            onChange={set('name')}
            placeholder="Ex.: Supino com halteres"
          />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>Séries</span>
            <input type="number" inputMode="numeric" min="1" max="100" value={form.sets} onChange={set('sets')} placeholder="4" />
          </label>
          <label className="field">
            <span>Repetições</span>
            <input maxLength={30} value={form.reps} onChange={set('reps')} placeholder="8–12" />
          </label>
          <label className="field">
            <span>Carga (kg)</span>
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.weight} onChange={set('weight')} placeholder="20" />
          </label>
        </div>
        <div className="field">
          <span>Tempo de descanso</span>
          <SelectField
            value={form.rest_time_seconds}
            onChange={(value) => setForm((current) => ({ ...current, rest_time_seconds: String(value) }))}
            options={REST_TIME_OPTIONS}
          />
        </div>
        <label className="field">
          <span>Observações</span>
          <textarea maxLength={2000} rows="3" value={form.notes} onChange={set('notes')} placeholder="Ajuste do banco, descanso..." />
        </label>
        {error && <p className="error-banner">{error}</p>}
        <div className="form-actions">
          <button className="button button-muted" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
