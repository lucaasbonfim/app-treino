import Modal from './Modal';
import Icon from './Icon';
import ProgressBar from './ProgressBar';
import WeekDaysStatus from './WeekDaysStatus';

function dayLabel(value) {
  return `${value} ${value === 1 ? 'dia' : 'dias'}`;
}

export default function ProgressDetails({ summary, monthly, onClose, onEditGoal }) {
  const goalFromSchedule = summary.goal_source === 'schedule';

  // "Meta semanal" e "Treinos na semana" saíram daqui: os dois só repetiam o
  // "1/5 treinos" que já aparece grande no topo do modal.
  const stats = [
    { label: 'Sequência', value: dayLabel(summary.streak), icon: 'local_fire_department' },
    { label: 'Recorde', value: dayLabel(summary.best_streak), icon: 'trophy' },
    { label: 'No mês', value: `${monthly?.count ?? 0}`, icon: 'calendar_month' },
  ];

  return (
    <Modal title="Progresso" subtitle="Sua constância nos treinos" onClose={onClose}>
      {/* O espaçamento entre os blocos vem todo do stack: cada bloco cuidando da
          própria margem era o que deixava a fileira de dias colada na agenda. */}
      <div className="progress-stack">
        <section className="progress-hero">
          <div>
            <span className="eyebrow">Esta semana</span>
            <strong>{summary.completed}/{summary.goal} treinos</strong>
            <p>{summary.message}</p>
          </div>
          <ProgressBar percent={summary.progress_percent} />
        </section>

        <section className="progress-block" aria-label="Dias da semana">
          <span className="eyebrow">Sua semana</span>
          <WeekDaysStatus days={summary.week_days} />
        </section>

        {/* Com a meta derivada da agenda, "planejado" virou o denominador do
            topo e "pendente" é a subtração dele. Sobra o formato da agenda. */}
        {summary.plan?.planned > 0 && (
          <section className="progress-block" aria-label="Agenda semanal">
            <span className="eyebrow">Agenda semanal</span>
            {/* Os mesmos ícones da fileira de dias aparecem aqui ao lado do que
                significam: a agenda ensina a leitura sem precisar de legenda. */}
            <p className="progress-note">
              <span className="progress-note-item">
                <span className="progress-note-icon done"><Icon filled>check</Icon></span>
                <strong>{summary.plan.planned}</strong>
                {summary.plan.planned === 1 ? ' dia de treino' : ' dias de treino'}
              </span>
              {summary.plan.rest > 0 && (
                <span className="progress-note-item">
                  <span className="progress-note-icon rest"><Icon>self_improvement</Icon></span>
                  <strong>{summary.plan.rest}</strong> de descanso
                </span>
              )}
            </p>
          </section>
        )}

        <section className="progress-block" aria-label="Constância">
          <span className="eyebrow">Constância</span>
          <div className="progress-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="progress-stat">
                <span className="progress-stat-icon"><Icon filled>{stat.icon}</Icon></span>
                <strong>{stat.value}</strong>
                <small>{stat.label}</small>
              </div>
            ))}
          </div>
        </section>

        <button type="button" className="button button-muted button-large" onClick={onEditGoal}>
          <Icon>{goalFromSchedule ? 'event' : 'tune'}</Icon>
          {goalFromSchedule ? 'Editar agenda da semana' : 'Alterar meta semanal'}
        </button>
      </div>
    </Modal>
  );
}
