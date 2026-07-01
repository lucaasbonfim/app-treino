export const DEFAULT_WORKOUT_ICON = 'fitness_center';

export const WORKOUT_ICONS = [
  { value: 'fitness_center', label: 'Musculação' },
  { value: 'directions_run', label: 'Corrida' },
  { value: 'sports_gymnastics', label: 'Funcional' },
  { value: 'self_improvement', label: 'Mobilidade' },
  { value: 'sports_martial_arts', label: 'Luta' },
  { value: 'hiking', label: 'Outdoor' },
  { value: 'favorite', label: 'Cardio' },
  { value: 'local_fire_department', label: 'Intenso' },
];

export function workoutIcon(value) {
  return WORKOUT_ICONS.some((icon) => icon.value === value)
    ? value
    : DEFAULT_WORKOUT_ICON;
}
