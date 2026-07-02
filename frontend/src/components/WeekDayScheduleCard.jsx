import Icon from './Icon';
import RestDayBadge from './RestDayBadge';
import { workoutIcon } from '../utils/workoutIcons';

export default function WeekDayScheduleCard({ day, onSelect }) {
  const workouts = day.workouts || [];
  const hasWorkout = workouts.length > 0;
  const icon = workouts.length === 1
    ? workoutIcon(workouts[0].icon)
    : (day.is_rest_day ? 'self_improvement' : hasWorkout ? 'exercise' : 'add');

  return (
    <button
      type="button"
      className={`schedule-day ${day.is_today ? 'is-today' : ''}`}
      onClick={() => onSelect(day)}
    >
      <span className="schedule-day-dow">{day.short}</span>

      <span className={`schedule-day-icon ${day.is_rest_day ? 'rest' : ''} ${hasWorkout ? '' : 'empty'}`}>
        <Icon filled={hasWorkout || day.is_rest_day}>{icon}</Icon>
      </span>

      <span className="schedule-day-main">
        {hasWorkout && (
          <>
            <strong>{workouts.map((workout) => workout.title).join(' · ')}</strong>
            <small>{day.label}</small>
          </>
        )}
        {!hasWorkout && day.is_rest_day && (
          <>
            <strong>Dia de descanso</strong>
            <small>{day.label}</small>
          </>
        )}
        {!hasWorkout && !day.is_rest_day && (
          <>
            <strong className="muted">Nenhum treino</strong>
            <small>{day.label}</small>
          </>
        )}
      </span>

      {day.is_rest_day && <RestDayBadge />}
      {day.source === 'workout_day' && <span className="schedule-day-source">Do treino</span>}
      {day.is_today && <span className="schedule-day-today">Hoje</span>}
      <Icon className="schedule-day-arrow">chevron_right</Icon>
    </button>
  );
}
