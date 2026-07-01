import { useState } from 'react';
import Icon from './Icon';
import SelectField from './SelectField';
import { errorMessage } from '../services/api';
import { REST_TIME_OPTIONS } from '../utils/restTimes';

export default function AddExerciseFromLibraryForm({ exercise, onBack, onSubmit }) {
  const [form, setForm] = useState({
    sets: exercise.default_sets ?? '',
    reps: exercise.default_reps || '',
    weight: '',
    rest_time_seconds: String(exercise.default_rest_time_seconds || 60),
    notes: '',
  });
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
      await onSubmit({
        exercise_library_id: exercise.id,
        sets: form.sets === '' ? null : form.sets,
        reps: form.reps || null,
        weight: form.weight === '' ? null : form.weight,
        rest_time_seconds: form.rest_time_seconds,
        notes: form.notes || null,
      });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível adicionar o exercício.'));
      setSaving(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={submit}>
      <button type="button" className="lib-back" onClick={onBack}>
        <Icon>arrow_back</Icon> Voltar à biblioteca
      </button>

      <div className="lib-selected">
        <span className="lib-card-icon"><Icon filled>fitness_center</Icon></span>
        <div>
          <strong>{exercise.name}</strong>
          <small>{exercise.muscle_group}{exercise.equipment ? ` · ${exercise.equipment}` : ''}</small>
        </div>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Séries</span>
          <input type="number" inputMode="numeric" min="1" max="100" value={form.sets} onChange={set('sets')} placeholder="3" />
        </label>
        <label className="field">
          <span>Repetições</span>
          <input maxLength={30} value={form.reps} onChange={set('reps')} placeholder="10-12" />
        </label>
        <label className="field">
          <span>Carga (kg)</span>
          <input type="number" inputMode="decimal" min="0" step="0.01" value={form.weight} onChange={set('weight')} placeholder="20" />
        </label>
      </div>
      <div className="field">
        <span>Descanso</span>
        <SelectField
          value={form.rest_time_seconds}
          onChange={(value) => setForm((current) => ({ ...current, rest_time_seconds: String(value) }))}
          options={REST_TIME_OPTIONS}
        />
      </div>
      <label className="field">
        <span>Observações</span>
        <textarea maxLength={2000} rows="3" value={form.notes} onChange={set('notes')} placeholder="Ajuste do banco, cadência..." />
      </label>

      {error && <p className="error-banner">{error}</p>}
      <div className="form-actions">
        <button className="button button-muted" type="button" onClick={onBack}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={saving}>
          {saving ? 'Adicionando...' : 'Adicionar exercício'}
        </button>
      </div>
    </form>
  );
}
