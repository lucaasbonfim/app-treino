import Modal from './Modal';
import Icon from './Icon';
import ProgressBar from './ProgressBar';
import WeekDaysStatus from './WeekDaysStatus';

function dayLabel(value) {
  return `${value} ${value === 1 ? 'dia' : 'dias'}`;
}

export default function ProgressDetails({ summary, monthly, onClose, onEditGoal }) {
  const stats = [
    { label: 'Meta semanal', value: dayLabel(summary.goal), icon: 'target' },
    { label: 'Treinos na semana', value: `${summary.completed}/${summary.goal}`, icon: 'exercise' },
    { label: 'Sequência atual', value: dayLabel(summary.streak), icon: 'local_fire_department' },
    { label: 'Melhor sequência', value: dayLabel(summary.best_streak), icon: 'trophy' },
    { label: 'Check-ins no mês', value: `${monthly?.count ?? 0}`, icon: 'calendar_month' },
  ];

  return (
    <Modal title="Progresso" subtitle="Sua constância nos treinos" onClose={onClose}>
      <section className="progress-hero">
        <div>
          <span className="eyebrow">Esta semana</span>
          <strong>{summary.completed}/{summary.goal} treinos</strong>
          <p>{summary.message}</p>
        </div>
        <ProgressBar percent={summary.progress_percent} />
      </section>

      <WeekDaysStatus days={summary.week_days} />

      {summary.plan?.planned > 0 && (
        <section className="plan-summary" aria-label="Agenda semanal">
          <header className="plan-summary-head">
            <span className="eyebrow">Agenda semanal</span>
          </header>
          <div className="plan-summary-grid">
            <div><strong>{summary.plan.planned}</strong><small>Planejado</small></div>
            <div className="done"><strong>{summary.plan.completed}</strong><small>Concluído</small></div>
            <div className="pending"><strong>{summary.plan.pending}</strong><small>Pendente</small></div>
            <div className="rest"><strong>{summary.plan.rest}</strong><small>Descanso</small></div>
          </div>
        </section>
      )}

      <div className="progress-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="progress-stat">
            <span className="progress-stat-icon"><Icon filled>{stat.icon}</Icon></span>
            <div>
              <small>{stat.label}</small>
              <strong>{stat.value}</strong>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="button button-muted button-large" onClick={onEditGoal}>
        <Icon>tune</Icon> Alterar meta semanal
      </button>
    </Modal>
  );
}
