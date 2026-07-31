import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import ImportPlanReview from '../components/ImportPlanReview';
import { aiService } from '../services';
import { errorMessage } from '../services/api';
import { ACCEPTED_IMAGE_TYPES, prepareImage } from '../utils/imageFile';

const EXAMPLE = `Segunda - Peito e tríceps
Supino reto 4x10
Crucifixo 3x12
Tríceps corda 3x15

Quarta - Costas e bíceps
Puxada frontal 4x10
Remada curvada 3x12
Rosca direta 3x12`;

const LEVELS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

const GOALS = [
  { value: 'hipertrofia', label: 'Ganhar massa' },
  { value: 'emagrecimento', label: 'Emagrecer' },
  { value: 'forca', label: 'Força' },
  { value: 'condicionamento', label: 'Condicionamento' },
];

const FREQUENCIES = [2, 3, 4, 5, 6];

let nextKey = 0;
const key = () => { nextKey += 1; return `p${nextKey}`; };

// As listas da conferência precisam de identidade estável para o React não
// embaralhar linhas quando o usuário remove um exercício.
function withKeys(plan) {
  return {
    ...plan,
    rest_days: plan.rest_days || [],
    workouts: (plan.workouts || []).map((workout) => ({
      ...workout,
      key: key(),
      days: workout.days || [],
      sections: (workout.sections || []).map((section) => ({
        ...section,
        key: key(),
        exercises: (section.exercises || []).map((exercise) => ({ ...exercise, key: key() })),
      })),
    })),
  };
}

// Manda de volta só o que o backend valida — as chaves locais e o vínculo com a
// biblioteca ficam de fora (o servidor refaz o vínculo pelo nome).
function withoutKeys(plan) {
  return {
    rest_days: plan.rest_days,
    workouts: plan.workouts.map((workout) => ({
      title: workout.title,
      icon: workout.icon,
      notes: workout.notes,
      days: workout.days,
      sections: workout.sections.map((section) => ({
        name: section.name,
        exercises: section.exercises.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          rest_time_seconds: exercise.rest_time_seconds,
          notes: exercise.notes,
        })),
      })),
    })),
  };
}

function ChoiceRow({ label, options, value, onChange }) {
  return (
    <div className="ai-choice" role="group" aria-label={label}>
      <span className="ai-plan-label">{label}</span>
      <div className="ai-choice-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={value === option.value ? 'selected' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WorkoutImport() {
  const [source, setSource] = useState('text');
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [briefing, setBriefing] = useState({
    level: 'iniciante',
    goal: 'hipertrofia',
    days_per_week: 3,
    notes: '',
  });
  const [plan, setPlan] = useState(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(true);
  const fileInput = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    aiService.status()
      .then(({ data }) => { if (active) setEnabled(data.enabled); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const pickImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    try {
      setImage(await prepareImage(file));
    } catch (imageError) {
      setError(imageError.message);
    }
  };

  const read = async () => {
    setReading(true);
    setError('');
    try {
      const { data } = await aiService.previewWorkoutPlan(source === 'build'
        ? { mode: 'build', ...briefing }
        : {
          text: source === 'text' ? text : '',
          image: source === 'photo' && image ? { mime_type: image.mime_type, data: image.data } : undefined,
        });
      setPlan(withKeys(data.plan));
    } catch (requestError) {
      setError(errorMessage(requestError, source === 'build'
        ? 'Não foi possível montar o treino.'
        : 'Não foi possível ler a ficha.'));
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await aiService.importWorkoutPlan(withoutKeys(plan));
      navigate(data.workouts.length === 1 ? `/workouts/${data.workouts[0].id}` : '/workouts', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível adicionar os treinos.'));
      setSaving(false);
    }
  };

  const restart = () => {
    setPlan(null);
    setError('');
  };

  const canRead = {
    text: () => text.trim().length > 0,
    photo: () => Boolean(image),
    build: () => true,
  }[source]();

  const setBriefingField = (field) => (value) => setBriefing((current) => ({ ...current, [field]: value }));

  return (
    <AppShell title="Montar com IA" subtitle="Peça um treino, cole a ficha ou mande uma foto" back>
      {!enabled && (
        <p className="error-banner">
          A leitura por IA não está configurada no servidor. Defina GEMINI_API_KEY no backend.
        </p>
      )}

      {plan ? (
        <ImportPlanReview
          plan={plan}
          onChange={setPlan}
          onConfirm={confirm}
          onRestart={restart}
          saving={saving}
          error={error}
        />
      ) : (
        <section className="form-card">
          <div className="section-heading">
            <span className="eyebrow">Passo 1 de 2</span>
            <h2>{source === 'build' ? 'Como é o seu treino?' : 'De onde vem a sua ficha?'}</h2>
            <p>
              {source === 'build'
                ? 'A IA monta a rotina com base no seu perfil. Você confere tudo antes de salvar.'
                : 'A IA lê o que você mandar e monta os treinos. Você confere tudo antes de salvar.'}
            </p>
          </div>

          <div className="form-stack">
            <div className="ai-source-switch" role="group" aria-label="Como começar">
              <button
                type="button"
                aria-pressed={source === 'build'}
                className={source === 'build' ? 'selected' : ''}
                onClick={() => setSource('build')}
              >
                <Icon>auto_awesome</Icon> Pedir
              </button>
              <button
                type="button"
                aria-pressed={source === 'text'}
                className={source === 'text' ? 'selected' : ''}
                onClick={() => setSource('text')}
              >
                <Icon>edit_note</Icon> Escrever
              </button>
              <button
                type="button"
                aria-pressed={source === 'photo'}
                className={source === 'photo' ? 'selected' : ''}
                onClick={() => setSource('photo')}
              >
                <Icon>photo_camera</Icon> Foto
              </button>
            </div>

            {source === 'build' && (
              <>
                <ChoiceRow
                  label="Seu nível"
                  options={LEVELS}
                  value={briefing.level}
                  onChange={setBriefingField('level')}
                />
                <ChoiceRow
                  label="Objetivo"
                  options={GOALS}
                  value={briefing.goal}
                  onChange={setBriefingField('goal')}
                />
                <ChoiceRow
                  label="Dias de treino por semana"
                  options={FREQUENCIES.map((value) => ({ value, label: `${value}x` }))}
                  value={briefing.days_per_week}
                  onChange={setBriefingField('days_per_week')}
                />
                <label className="field">
                  <span>Observações (opcional)</span>
                  <textarea
                    rows="3"
                    maxLength={1000}
                    value={briefing.notes}
                    onChange={(event) => setBriefingField('notes')(event.target.value)}
                    placeholder="Lesões, equipamentos que você tem, exercícios que prefere evitar..."
                  />
                </label>
              </>
            )}

            {source === 'text' && (
              <label className="field">
                <span>Ficha de treino</span>
                <textarea
                  rows="10"
                  maxLength={8000}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={EXAMPLE}
                />
              </label>
            )}

            {source === 'photo' && (
              <div className="ai-photo-picker">
                <input
                  ref={fileInput}
                  className="visually-hidden"
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  onChange={pickImage}
                />
                {image ? (
                  <>
                    <img className="ai-photo-preview" src={image.preview} alt="Ficha enviada" />
                    <div className="form-actions">
                      <button className="button button-muted" type="button" onClick={() => setImage(null)}>
                        Remover
                      </button>
                      <button className="button button-muted" type="button" onClick={() => fileInput.current?.click()}>
                        Trocar foto
                      </button>
                    </div>
                  </>
                ) : (
                  <button className="ai-photo-drop" type="button" onClick={() => fileInput.current?.click()}>
                    <Icon>add_a_photo</Icon>
                    <strong>Escolher foto da ficha</strong>
                    <span>Papel da academia, print de app ou anotação no caderno</span>
                  </button>
                )}
              </div>
            )}

            {error && <p className="error-banner">{error}</p>}

            {reading ? (
              <div className="status-card">
                <span className="spinner" />
                <p>
                  {source === 'build'
                    ? 'Escolhendo os exercícios e dividindo a semana...'
                    : 'Organizando os treinos e os dias da semana...'}
                </p>
              </div>
            ) : (
              <div className="ai-actions">
                <button
                  className="button button-primary"
                  type="button"
                  disabled={!canRead || !enabled}
                  onClick={read}
                >
                  {source === 'build' ? 'Montar meu treino' : 'Ler com IA'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}
