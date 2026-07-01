import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { LoadingView } from './StatusView';
import MuscleGroupChips from './MuscleGroupChips';
import ExerciseLibrarySearch from './ExerciseLibrarySearch';
import ExerciseLibraryCard from './ExerciseLibraryCard';
import AddExerciseFromLibraryForm from './AddExerciseFromLibraryForm';
import { apiCache, exerciseLibraryService } from '../services';
import { errorMessage } from '../services/api';

export default function ExerciseLibraryModal({ groupName, onClose, onAdd }) {
  const [exercises, setExercises] = useState(() => apiCache.getArray('/exercise-library'));
  const [groups, setGroups] = useState(() => apiCache.getArray('/exercise-library/groups'));
  const [loading, setLoading] = useState(() => !apiCache.has('/exercise-library'));
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;

    // Sempre revalida na rede ao abrir para não ficar preso a um cache vazio
    // (ex.: biblioteca ainda não populada na primeira vez).
    exerciseLibraryService.list(null, { force: true })
      .then(({ data }) => { if (active) setExercises(Array.isArray(data) ? data : []); })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar a biblioteca.'));
      })
      .finally(() => { if (active) setLoading(false); });

    exerciseLibraryService.groups({ force: true })
      .then(({ data }) => { if (active) setGroups(Array.isArray(data) ? data : []); })
      .catch(() => {});

    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesGroup = activeGroup === 'all' || exercise.muscle_group === activeGroup;
      const matchesSearch = !term || exercise.name.toLowerCase().includes(term);
      return matchesGroup && matchesSearch;
    });
  }, [exercises, activeGroup, search]);

  const availableGroups = useMemo(() => {
    if (groups.length) return groups;
    return [...new Set(exercises.map((exercise) => exercise.muscle_group))];
  }, [groups, exercises]);

  if (selected) {
    return (
      <Modal title="Ajustar exercício" subtitle={`Grupo: ${groupName}`} onClose={onClose}>
        <AddExerciseFromLibraryForm
          exercise={selected}
          onBack={() => setSelected(null)}
          onSubmit={onAdd}
        />
      </Modal>
    );
  }

  return (
    <Modal title="Biblioteca de exercícios" subtitle={`Grupo: ${groupName}`} onClose={onClose}>
      <ExerciseLibrarySearch value={search} onChange={setSearch} />
      <MuscleGroupChips groups={availableGroups} value={activeGroup} onChange={setActiveGroup} />

      {error && <p className="error-banner">{error}</p>}
      {loading && exercises.length === 0 && <LoadingView />}

      {!loading && filtered.length === 0 && !error && (
        <div className="lib-empty">
          <Icon>search_off</Icon>
          <p>Nenhum exercício encontrado.</p>
        </div>
      )}

      <div className="lib-list">
        {filtered.map((exercise) => (
          <ExerciseLibraryCard key={exercise.id} exercise={exercise} onAdd={setSelected} />
        ))}
      </div>
    </Modal>
  );
}
