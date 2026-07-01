import Icon from './Icon';

export default function WorkoutStatusBadge({ status }) {
  const archived = status === 'archived';
  return (
    <span className={`status-badge ${archived ? 'archived' : 'active'}`}>
      <Icon>{archived ? 'inventory_2' : 'bolt'}</Icon>
      {archived ? 'Arquivado' : 'Atual'}
    </span>
  );
}
