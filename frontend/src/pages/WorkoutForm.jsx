import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import SelectField from '../components/SelectField';
import { LoadingView } from '../components/StatusView';
import { workoutService } from '../services';
import { errorMessage } from '../services/api';
import { DAYS } from '../utils/days';
import { getCachedWorkout, hasCachedWorkout } from '../utils/workoutCache';
import { DEFAULT_WORKOUT_ICON, WORKOUT_ICONS } from '../utils/workoutIcons';

const emptyForm = {
  title: '',
  icon: DEFAULT_WORKOUT_ICON,
  day_of_week: '1',
  notes: '',
};

export default function WorkoutForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const [initialWorkout] = useState(() => (editing ? getCachedWorkout(id) : null));
  const [form, setForm] = useState(() => (initialWorkout ? {
    title: initialWorkout.title,
    icon: initialWorkout.icon || DEFAULT_WORKOUT_ICON,
    day_of_week: String(initialWorkout.day_of_week),
    notes: initialWorkout.notes || '',
  } : emptyForm));
  const [loading, setLoading] = useState(() => editing && !hasCachedWorkout(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!editing) return;
    workoutService.get(id)
      .then(({ data }) => setForm({
        title: data.title,
        icon: data.icon || DEFAULT_WORKOUT_ICON,
        day_of_week: String(data.day_of_week),
        notes: data.notes || '',
      }))
      .catch((requestError) => setError(errorMessage(requestError, 'Não foi possível carregar o treino.')))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (field) => (event) => setForm((current) => ({
    ...current,
    [field]: event.target.value,
  }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, day_of_week: Number(form.day_of_week) };
      const { data } = editing
        ? await workoutService.update(id, payload)
        : await workoutService.create(payload);
      navigate(`/workouts/${data.id}`, { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível salvar o treino.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title={editing ? 'Editar treino' : 'Novo treino'}
      subtitle={editing ? 'Atualize os dados principais' : 'Defina o começo da sua ficha'}
      back
    >
      {loading ? <LoadingView /> : (
        <section className="form-card">
          <div className="section-heading">
            <span className="eyebrow">Informações básicas</span>
            <h2>{editing ? 'Ajuste o seu treino' : 'Como será este treino?'}</h2>
            <p>Depois de salvar, você poderá adicionar grupos musculares e exercícios.</p>
          </div>
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              <span>Nome do treino</span>
              <input autoFocus required maxLength={120} value={form.title} onChange={set('title')} placeholder="Ex.: Peito, ombro e tríceps" />
            </label>
            <fieldset className="icon-picker">
              <legend>Ícone do treino</legend>
              <div className="icon-picker-grid">
                {WORKOUT_ICONS.map((icon) => (
                  <button
                    className={form.icon === icon.value ? 'selected' : ''}
                    type="button"
                    key={icon.value}
                    aria-pressed={form.icon === icon.value}
                    onClick={() => setForm((current) => ({ ...current, icon: icon.value }))}
                  >
                    <Icon filled={form.icon === icon.value}>{icon.value}</Icon>
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <span>Dia da semana</span>
              <SelectField
                value={form.day_of_week}
                onChange={(value) => setForm((current) => ({ ...current, day_of_week: String(value) }))}
                options={DAYS}
              />
            </div>
            <label className="field">
              <span>Observações</span>
              <textarea rows="4" maxLength={2000} value={form.notes} onChange={set('notes')} placeholder="Objetivo, duração ou lembretes (opcional)" />
            </label>
            {error && <p className="error-banner">{error}</p>}
            <div className="form-actions vertical-mobile">
              <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              <button className="button button-muted" type="button" onClick={() => navigate(-1)}>Cancelar</button>
            </div>
          </form>
        </section>
      )}
    </AppShell>
  );
}
