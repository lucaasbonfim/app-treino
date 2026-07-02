import Icon from './Icon';

export default function HistorySummaryCards({ summary }) {
  const primaryItems = [
    {
      key: 'workouts',
      icon: 'exercise',
      label: 'Treinos feitos',
      value: summary?.workouts_done ?? 0,
    },
    {
      key: 'sets',
      icon: 'repeat',
      label: 'Séries concluídas',
      value: summary?.sets_completed ?? 0,
    },
  ];
  const exercises = summary?.exercises_completed ?? 0;

  return (
    <section className="history-overview" aria-label="Resumo geral">
      <span className="history-overview-label">Resumo geral</span>

      <div className="history-summary-grid">
        {primaryItems.map((item) => (
          <div className="history-summary-card" key={item.key}>
            <span className="history-summary-icon"><Icon filled>{item.icon}</Icon></span>
            <div>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="history-summary-secondary">
        <span>
          <Icon>fitness_center</Icon>
          {exercises} {exercises === 1 ? 'exercício realizado' : 'exercícios realizados'}
        </span>
        <span>
          <Icon>schedule</Icon>
          Último treino: <strong>{summary?.last_workout_name || 'não registrado'}</strong>
        </span>
      </div>
    </section>
  );
}
