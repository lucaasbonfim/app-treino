import Icon from './Icon';

export default function CheckinButton({ checkedIn, loading, onCheckin }) {
  return (
    <button
      type="button"
      className={`checkin-button ${checkedIn ? 'done' : ''}`}
      disabled={checkedIn || loading}
      onClick={onCheckin}
    >
      <Icon filled={checkedIn}>{checkedIn ? 'check_circle' : 'add_task'}</Icon>
      {checkedIn ? 'Treino de hoje registrado' : (loading ? 'Registrando...' : 'Marcar treino de hoje')}
    </button>
  );
}
