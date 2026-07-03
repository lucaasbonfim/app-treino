import Icon from './Icon';

export default function ContinueWorkoutButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="current-workout-button"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon filled>play_arrow</Icon>
      Continuar treino
    </button>
  );
}
