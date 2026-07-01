import Icon from './Icon';

export default function HistorySummaryCards({ summary }) {
  const items = [
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
    {
      key: 'exercises',
      icon: 'fitness_center',
      label: 'Exercícios realizados',
      value: summary?.exercises_completed ?? 0,
    },
    {
      key: 'last',
      icon: 'schedule',
      label: 'Último treino',
      value: summary?.last_workout_name || '—',
      wide: true,
    },
  ];

  return (
    <section className="history-summary-grid">
      {items.map((item) => (
        <article className={`history-summary-card ${item.wide ? 'wide' : ''}`} key={item.key}>
          <span className="history-summary-icon"><Icon filled>{item.icon}</Icon></span>
          <div>
            <strong>{item.value}</strong>
            <small>{item.label}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
