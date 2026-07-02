import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import WeekDayScheduleCard from './WeekDayScheduleCard';
import SelectWorkoutForDayModal from './SelectWorkoutForDayModal';
import { EmptyView, LoadingView } from './StatusView';
import { apiCache, scheduleService, workoutService } from '../services';
import { errorMessage } from '../services/api';

// Semana começando na segunda-feira (0 = Domingo ... 6 = Sábado).
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function WeeklyScheduleBoard({ showSummary = false }) {
  const [schedule, setSchedule] = useState(() => apiCache.getData('/schedule') || null);
  const [workouts, setWorkouts] = useState(() => apiCache.getArray('/workouts'));
  const [loading, setLoading] = useState(() => !apiCache.has('/schedule'));
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(async (options) => {
    try {
      const [scheduleResult, workoutsResult] = await Promise.all([
        scheduleService.list(options),
        workoutService.list(options),
      ]);
      setError('');
      setSchedule(scheduleResult.data);
      setWorkouts(workoutsResult.data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível carregar a agenda.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([scheduleService.list(), workoutService.list()])
      .then(([scheduleResult, workoutsResult]) => {
        if (!active) return;
        setSchedule(scheduleResult.data);
        setWorkouts(workoutsResult.data);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar a agenda.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const applyChange = async (operation) => {
    setSaving(true);
    setModalError('');
    try {
      await operation();
      await load({ force: true, allowStale: false });
      setSelectedDay(null);
    } catch (requestError) {
      setModalError(errorMessage(requestError, 'Não foi possível salvar a agenda.'));
    } finally {
      setSaving(false);
    }
  };

  const saveDay = (workoutIds) => applyChange(
    () => scheduleService.setDay(selectedDay.day_of_week, { workout_ids: workoutIds }),
  );
  const markRest = () => applyChange(
    () => scheduleService.setDay(selectedDay.day_of_week, { is_rest_day: true }),
  );
  const removeDay = () => applyChange(
    () => scheduleService.removeDay(selectedDay.day_of_week),
  );

  const orderedDays = schedule
    ? DISPLAY_ORDER
      .map((dow) => schedule.days.find((day) => day.day_of_week === dow))
      .filter(Boolean)
    : [];

  const planned = schedule?.summary?.planned ?? 0;
  const rest = schedule?.summary?.rest ?? 0;

  return (
    <>
      {error && (
        <div className="error-banner with-action">
          <span>{error}</span>
          <button type="button" onClick={() => load({ force: true, allowStale: false })}>Tentar novamente</button>
        </div>
      )}

      {loading && <LoadingView />}

      {!loading && schedule && (
        <>
          {showSummary && (
            <section className="schedule-summary">
              <div>
                <span className="schedule-summary-value">{planned}</span>
                <span className="schedule-summary-label">{planned === 1 ? 'treino planejado' : 'treinos planejados'}</span>
              </div>
              <div>
                <span className="schedule-summary-value">{rest}</span>
                <span className="schedule-summary-label">{rest === 1 ? 'dia de descanso' : 'dias de descanso'}</span>
              </div>
            </section>
          )}

          <p className="schedule-hint">
            <Icon>info</Icon>
            Toque em um dia para adicionar treinos ou marcar descanso.
          </p>

          <section className="schedule-week" aria-label="Minha semana">
            {orderedDays.map((day) => (
              <WeekDayScheduleCard key={day.day_of_week} day={day} onSelect={setSelectedDay} />
            ))}
          </section>

          {workouts.length === 0 && (
            <EmptyView
              title="Você ainda não tem treinos"
              text="Crie um treino em “Meus treinos” para poder adicioná-lo à sua semana."
            />
          )}
        </>
      )}

      {selectedDay && (
        <SelectWorkoutForDayModal
          day={selectedDay}
          workouts={workouts}
          saving={saving}
          error={modalError}
          onSave={saveDay}
          onRest={markRest}
          onRemove={removeDay}
          onClose={() => { setSelectedDay(null); setModalError(''); }}
        />
      )}
    </>
  );
}
