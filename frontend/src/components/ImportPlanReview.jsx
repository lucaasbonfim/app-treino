import { useState } from 'react';
import ExerciseForm from './ExerciseForm';
import Icon from './Icon';
import { WEEK_ORDER, shortDayName } from '../utils/days';
import { exerciseCount } from '../utils/pluralize';
import { WORKOUT_ICONS, workoutIcon } from '../utils/workoutIcons';

function exerciseSummary(exercise) {
  return [
    exercise.sets ? `${exercise.sets} séries` : null,
    exercise.reps ? `${exercise.reps} reps` : null,
    exercise.weight ? `${Number(exercise.weight).toLocaleString('pt-BR')} kg` : null,
    `${exercise.rest_time_seconds || 60}s`,
  ].filter(Boolean).join(' · ');
}

function countExercises(workout) {
  return workout.sections.reduce((total, section) => total + section.exercises.length, 0);
}

/**
 * Tela de conferência do que a IA leu. Tudo aqui é edição local: só o botão
 * final grava. `plan` já vem com chaves estáveis (key) para as listas.
 */
export default function ImportPlanReview({ plan, onChange, onConfirm, onRestart, saving, error }) {
  const [editing, setEditing] = useState(null);

  // Um dia com treino não pode ser descanso: o treino ganha, aqui e no servidor.
  const busyDays = new Set(plan.workouts.flatMap((workout) => workout.days));
  const restDays = plan.rest_days.filter((day) => !busyDays.has(day));

  const updateWorkout = (workoutKey, patch) => onChange({
    ...plan,
    workouts: plan.workouts.map((workout) => (
      workout.key === workoutKey ? { ...workout, ...patch } : workout
    )),
  });

  const removeWorkout = (workoutKey) => onChange({
    ...plan,
    workouts: plan.workouts.filter((workout) => workout.key !== workoutKey),
  });

  const toggleDay = (workout, day) => updateWorkout(workout.key, {
    days: workout.days.includes(day)
      ? workout.days.filter((value) => value !== day)
      : [...workout.days, day].sort((a, b) => a - b),
  });

  const toggleRestDay = (day) => onChange({
    ...plan,
    rest_days: plan.rest_days.includes(day)
      ? plan.rest_days.filter((value) => value !== day)
      : [...plan.rest_days, day].sort((a, b) => a - b),
  });

  // Seção sem exercício e treino sem seção somem na hora — é o mesmo descarte
  // que o servidor faria na gravação, então a contagem do botão não mente.
  const updateExercises = (workoutKey, sectionKey, update) => onChange({
    ...plan,
    workouts: plan.workouts
      .map((workout) => {
        if (workout.key !== workoutKey) return workout;
        const sections = workout.sections
          .map((section) => (section.key === sectionKey
            ? { ...section, exercises: update(section.exercises) }
            : section))
          .filter((section) => section.exercises.length > 0);
        return { ...workout, sections };
      })
      .filter((workout) => workout.sections.length > 0),
  });

  const removeExercise = (workoutKey, sectionKey, exerciseKey) => updateExercises(
    workoutKey,
    sectionKey,
    (exercises) => exercises.filter((exercise) => exercise.key !== exerciseKey),
  );

  const saveExercise = (form) => {
    const { workoutKey, sectionKey, exercise } = editing;
    updateExercises(workoutKey, sectionKey, (exercises) => exercises.map((item) => (
      item.key === exercise.key ? {
        ...item,
        name: form.name.trim(),
        sets: form.sets === '' ? null : Number(form.sets),
        reps: form.reps.trim() || null,
        weight: form.weight === '' ? null : Number(form.weight),
        rest_time_seconds: Number(form.rest_time_seconds),
        notes: form.notes.trim() || null,
      } : item
    )));
    return Promise.resolve();
  };

  const total = plan.workouts.length;

  return (
    <>
      {plan.summary && (
        <p className="schedule-hint">
          <Icon>auto_awesome</Icon>
          {plan.summary}
        </p>
      )}

      {total === 0 && (
        <div className="status-card empty-card">
          <div className="empty-icon"><Icon>search_off</Icon></div>
          <h2>Nenhum treino para adicionar</h2>
          <p>A IA não encontrou uma ficha no que foi enviado, ou você removeu todos os treinos.</p>
        </div>
      )}

      {plan.workouts.map((workout) => (
        <section className="form-card ai-plan-card" key={workout.key}>
          <div className="ai-plan-head">
            <div className="ai-plan-heading">
              <span className="eyebrow">Treino</span>
              <input
                className="ai-plan-title"
                maxLength={120}
                value={workout.title}
                onChange={(event) => updateWorkout(workout.key, { title: event.target.value })}
                aria-label="Nome do treino"
              />
            </div>
            <button
              className="more-button more-button-compact"
              type="button"
              onClick={() => removeWorkout(workout.key)}
              aria-label={`Remover ${workout.title}`}
            >
              <Icon>close</Icon>
            </button>
          </div>

          <div className="ai-icon-row" role="group" aria-label="Ícone do treino">
            {WORKOUT_ICONS.map((icon) => (
              <button
                key={icon.value}
                type="button"
                title={icon.label}
                aria-label={icon.label}
                aria-pressed={workout.icon === icon.value}
                className={workoutIcon(workout.icon) === icon.value ? 'selected' : ''}
                onClick={() => updateWorkout(workout.key, { icon: icon.value })}
              >
                <Icon filled={workoutIcon(workout.icon) === icon.value}>{icon.value}</Icon>
              </button>
            ))}
          </div>

          <div className="ai-plan-block">
            <span className="ai-plan-label">Dias da semana</span>
            <div className="day-toggle-grid">
              {WEEK_ORDER.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`day-toggle ${workout.days.includes(day) ? 'selected' : ''}`}
                  onClick={() => toggleDay(workout, day)}
                >
                  {shortDayName(day)}
                </button>
              ))}
            </div>
          </div>

          {workout.sections.map((section) => (
            <div className="ai-plan-block" key={section.key}>
              <span className="ai-plan-label">
                {section.name || `Exercícios · ${exerciseCount(section.exercises.length)}`}
              </span>
              <ul className="ai-exercise-list">
                {section.exercises.map((exercise) => (
                  <li className="exercise-row" key={exercise.key}>
                    <div className="exercise-index"><Icon>fitness_center</Icon></div>
                    <div className="exercise-copy">
                      <strong>{exercise.name}</strong>
                      <p>{exerciseSummary(exercise)}</p>
                      {exercise.notes && <span>{exercise.notes}</span>}
                    </div>
                    <div className="ai-row-actions">
                      <button
                        className="more-button more-button-compact"
                        type="button"
                        aria-label={`Editar ${exercise.name}`}
                        onClick={() => setEditing({
                          workoutKey: workout.key,
                          sectionKey: section.key,
                          sectionName: section.name || workout.title,
                          exercise,
                        })}
                      >
                        <Icon>edit</Icon>
                      </button>
                      <button
                        className="more-button more-button-compact"
                        type="button"
                        aria-label={`Remover ${exercise.name}`}
                        onClick={() => removeExercise(workout.key, section.key, exercise.key)}
                      >
                        <Icon>close</Icon>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="ai-plan-foot">
            <Icon>fitness_center</Icon>
            {exerciseCount(countExercises(workout))}
            {workout.days.length === 0 && ' · sem dia definido'}
          </p>
        </section>
      ))}

      {total > 0 && (
        <section className="form-card">
          <div className="ai-plan-block">
            <span className="ai-plan-label">Dias de descanso</span>
            <p className="ai-plan-hint">Marcar um dia como descanso limpa o que estiver nele na agenda.</p>
            <div className="day-toggle-grid">
              {WEEK_ORDER.map((day) => (
                <button
                  key={day}
                  type="button"
                  disabled={busyDays.has(day)}
                  className={`day-toggle ${restDays.includes(day) ? 'selected' : ''}`}
                  onClick={() => toggleRestDay(day)}
                >
                  {shortDayName(day)}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {error && <p className="error-banner">{error}</p>}

      <div className="ai-actions">
        <button
          className="button button-primary"
          type="button"
          disabled={saving || total === 0}
          onClick={onConfirm}
        >
          {saving ? 'Adicionando...' : `Adicionar ${total === 1 ? 'treino' : `${total} treinos`}`}
        </button>
        <button className="button button-muted" type="button" disabled={saving} onClick={onRestart}>
          Enviar outra ficha
        </button>
      </div>

      {editing && (
        <ExerciseForm
          exercise={editing.exercise}
          groupName={editing.sectionName}
          onSubmit={saveExercise}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
