export default function MuscleGroupChips({ groups, value, onChange }) {
  const options = ['all', ...groups];

  return (
    <div className="lib-chips" role="tablist" aria-label="Filtrar por grupo muscular">
      {options.map((group) => (
        <button
          key={group}
          type="button"
          role="tab"
          aria-selected={value === group}
          className={`lib-chip ${value === group ? 'active' : ''}`}
          onClick={() => onChange(group)}
        >
          {group === 'all' ? 'Todos' : group}
        </button>
      ))}
    </div>
  );
}
