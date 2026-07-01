import { apiCache } from '../services';

export function getCachedWorkout(id) {
  const detail = apiCache.getData(`/workouts/${id}`);
  if (detail) return detail;

  return apiCache.getArray('/workouts')
    .find((workout) => String(workout.id) === String(id)) || null;
}

export function hasCachedWorkout(id) {
  if (apiCache.has(`/workouts/${id}`)) return true;
  return apiCache.has('/workouts') && Boolean(getCachedWorkout(id));
}
