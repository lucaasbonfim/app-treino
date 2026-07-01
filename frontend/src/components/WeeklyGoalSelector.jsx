const OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export default function WeeklyGoalSelector({ value, onChange }) {
  return (
    <div className="goal-selector" role="radiogroup" aria-label="Meta semanal de treinos">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`goal-option ${value === option ? 'active' : ''}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
