import Icon from './Icon';

export default function ExerciseLibraryCard({ exercise, onAdd }) {
  const meta = [
    exercise.default_sets ? `${exercise.default_sets} séries` : null,
    exercise.default_reps ? `${exercise.default_reps} reps` : null,
    `${exercise.default_rest_time_seconds || 60}s descanso`,
  ].filter(Boolean);

  return (
    <article className="lib-card">
      <span className="lib-card-icon"><Icon filled>fitness_center</Icon></span>
      <div className="lib-card-copy">
        <strong>{exercise.name}</strong>
        <small>{exercise.muscle_group}{exercise.equipment ? ` · ${exercise.equipment}` : ''}</small>
        <p>{meta.join(' · ')}</p>
      </div>
      <button type="button" className="lib-card-add" onClick={() => onAdd(exercise)} aria-label={`Adicionar ${exercise.name}`}>
        <Icon>add</Icon>
      </button>
    </article>
  );
}
