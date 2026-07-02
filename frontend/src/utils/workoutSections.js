// A "seção" default é invisível: segura os exercícios soltos do treino.
// Seções nomeadas (is_default = false) dividem o treino em partes.

export function defaultSection(workout) {
  return (workout?.muscle_groups || []).find((group) => group.is_default) || null;
}

export function namedSections(workout) {
  return (workout?.muscle_groups || []).filter((group) => !group.is_default);
}

export function allExercises(workout) {
  return (workout?.muscle_groups || []).flatMap((group) => group.exercises || []);
}

// Texto de apoio do card: nomes das seções quando o treino é dividido,
// senão a lista de exercícios.
export function workoutSubtitle(workout) {
  const sections = namedSections(workout);
  if (sections.length) return sections.map((section) => section.name).join(' · ');

  const exercises = allExercises(workout);
  if (exercises.length) return exercises.map((exercise) => exercise.name).join(' · ');

  return 'Adicione exercícios';
}
