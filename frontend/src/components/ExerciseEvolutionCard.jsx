import Icon from './Icon';
import { formatWeight, formatShortDate } from '../utils/historyStats';

function evolutionMessage(item) {
  if (item.previous_weight === null || item.previous_weight === undefined) {
    return { tone: 'first', icon: 'flag', text: 'Primeiro registro deste exercício' };
  }
  const delta = item.delta ?? 0;
  if (delta > 0) {
    return { tone: 'up', icon: 'trending_up', text: `Você evoluiu +${formatWeight(delta)}` };
  }
  if (delta < 0) {
    return { tone: 'down', icon: 'trending_down', text: `Reduziu ${formatWeight(Math.abs(delta))}` };
  }
  return { tone: 'same', icon: 'trending_flat', text: 'Você manteve a carga anterior' };
}

export default function ExerciseEvolutionCard({ item }) {
  const message = evolutionMessage(item);
  const stats = [
    { label: 'Última carga', value: formatWeight(item.last_weight) || '—' },
    { label: 'Maior carga', value: formatWeight(item.max_weight) || '—' },
    { label: 'Últimas reps', value: item.last_reps ? `${item.last_reps} reps` : '—' },
    { label: 'Última execução', value: formatShortDate(item.last_done_at) || '—' },
  ];

  return (
    <article className="evolution-card">
      <header>
        <span className="evolution-icon"><Icon filled>monitoring</Icon></span>
        <div>
          <strong>{item.exercise_name}</strong>
          <small>{item.muscle_group_name}</small>
        </div>
        <span className="evolution-times">
          {item.times_done} {item.times_done === 1 ? 'treino' : 'treinos'}
        </span>
      </header>

      <div className="evolution-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className={`progress-compare ${message.tone === 'first' ? 'first' : message.tone}`}>
        <Icon filled={message.tone !== 'first'}>{message.icon}</Icon>
        <div><strong>{message.text}</strong></div>
      </div>
    </article>
  );
}
