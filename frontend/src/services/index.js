import api from './api';
import { apiCache, cachedGet, runMutation } from './apiCache';

export { apiCache };

export const authService = {
  login: (data) => runMutation(() => api.post('/auth/login', data)),
  register: (data) => runMutation(() => api.post('/auth/register', data)),
  verifyRegisterCode: (data) => runMutation(() => api.post('/auth/register/verify', data)),
  me: () => cachedGet('/auth/me'),
  updateName: (data) => runMutation(() => api.put('/auth/name', data)),
  changePassword: (data) => runMutation(() => api.post('/auth/change-password', data)),
  requestEmailChange: (data) => runMutation(() => api.post('/auth/email/request', data)),
  confirmEmailChange: (data) => runMutation(() => api.post('/auth/email/confirm', data)),
};

export const workoutService = {
  list: (options) => cachedGet('/workouts', {}, options),
  listArchived: (options) => cachedGet('/workouts', { params: { status: 'archived' } }, options),
  get: (id, options) => cachedGet(`/workouts/${id}`, {}, options),
  create: (data) => runMutation(() => api.post('/workouts', data)),
  update: (id, data) => runMutation(() => api.put(`/workouts/${id}`, data)),
  archive: (id) => runMutation(() => api.put(`/workouts/${id}/archive`)),
  reactivate: (id) => runMutation(() => api.put(`/workouts/${id}/reactivate`)),
  remove: (id) => runMutation(() => api.delete(`/workouts/${id}`)),
};

export const muscleGroupService = {
  create: (workoutId, data) => runMutation(() => api.post(`/workouts/${workoutId}/muscle-groups`, data)),
  update: (id, data) => runMutation(() => api.put(`/muscle-groups/${id}`, data)),
  remove: (id) => runMutation(() => api.delete(`/muscle-groups/${id}`)),
};

export const exerciseService = {
  create: (muscleGroupId, data) => runMutation(() => api.post(`/muscle-groups/${muscleGroupId}/exercises`, data)),
  createFromLibrary: (muscleGroupId, data) => runMutation(
    () => api.post(`/muscle-groups/${muscleGroupId}/exercises/from-library`, data),
  ),
  update: (id, data) => runMutation(() => api.put(`/exercises/${id}`, data)),
  remove: (id) => runMutation(() => api.delete(`/exercises/${id}`)),
};

export const progressService = {
  weeklySummary: (options) => cachedGet('/progress/weekly-summary', {}, options),
  monthlyCheckins: (options) => cachedGet('/progress/monthly-checkins', {}, options),
  checkin: () => runMutation(() => api.post('/progress/checkin')),
  updateWeeklyGoal: (data) => runMutation(() => api.put('/progress/weekly-goal', data)),
};

export const scheduleService = {
  list: (options) => cachedGet('/schedule', {}, options),
  today: (options) => cachedGet('/schedule/today', {}, options),
  setDay: (dayOfWeek, data) => runMutation(() => api.put(`/schedule/${dayOfWeek}`, data)),
  removeDay: (dayOfWeek) => runMutation(() => api.delete(`/schedule/${dayOfWeek}`)),
  setWorkoutDays: (workoutId, days) => runMutation(() => api.put(`/schedule/workout/${workoutId}`, { days })),
  startDay: (dayOfWeek) => runMutation(() => api.post(`/schedule/${dayOfWeek}/sessions`)),
};

export const exerciseLibraryService = {
  list: (params, options) => cachedGet('/exercise-library', params ? { params } : {}, options),
  groups: (options) => cachedGet('/exercise-library/groups', {}, options),
  get: (id, options) => cachedGet(`/exercise-library/${id}`, {}, options),
};

export const workoutSessionService = {
  start: (workoutId) => runMutation(() => api.post(`/workouts/${workoutId}/sessions`)),
  list: (options) => cachedGet('/workout-sessions', {}, options),
  summary: (options) => cachedGet('/workout-sessions/summary', {}, options),
  evolution: (options) => cachedGet('/workout-sessions/evolution', {}, options),
  get: (id, options) => cachedGet(`/workout-sessions/${id}`, {}, options),
  update: (id, data) => runMutation(() => api.put(`/workout-sessions/${id}`, data)),
  updateExercise: (sessionId, exerciseId, data) => runMutation(
    () => api.put(`/workout-sessions/${sessionId}/exercises/${exerciseId}`, data),
  ),
  updateSet: (sessionId, setId, data) => runMutation(
    () => api.put(`/workout-sessions/${sessionId}/sets/${setId}`, data),
  ),
  finish: (id, data) => runMutation(() => api.post(`/workout-sessions/${id}/finish`, data)),
};
