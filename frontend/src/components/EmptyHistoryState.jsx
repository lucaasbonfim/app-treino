import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function EmptyHistoryState({
  icon = 'fitness_center',
  title,
  text,
  actionLabel = null,
  actionTo = '/workouts',
}) {
  return (
    <div className="status-card empty-card history-empty-state">
      <div className="empty-icon"><Icon>{icon}</Icon></div>
      <h2>{title}</h2>
      <p>{text}</p>
      {actionLabel && (
        <Link className="button button-primary history-empty-action" to={actionTo}>
          {actionLabel}
          <Icon>arrow_forward</Icon>
        </Link>
      )}
    </div>
  );
}
