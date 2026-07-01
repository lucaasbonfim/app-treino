import Icon from './Icon';

const ICONS = {
  done: 'check',
  today: 'radio_button_unchecked',
  pending: 'close',
  future: 'remove',
};

export default function WeekDaysStatus({ days = [], compact = false }) {
  return (
    <div className={`week-days ${compact ? 'compact' : ''}`}>
      {days.map((day) => (
        <div className={`week-day ${day.status}`} key={day.date}>
          <span className="week-day-dot"><Icon filled={day.status === 'done'}>{ICONS[day.status]}</Icon></span>
          <small>{day.short}</small>
        </div>
      ))}
    </div>
  );
}
