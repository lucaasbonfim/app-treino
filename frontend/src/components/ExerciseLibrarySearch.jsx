import Icon from './Icon';

export default function ExerciseLibrarySearch({ value, onChange }) {
  return (
    <div className="lib-search">
      <Icon>search</Icon>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar exercício"
        aria-label="Buscar exercício"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Limpar busca">
          <Icon>close</Icon>
        </button>
      )}
    </div>
  );
}
