import Icon from './Icon';

// Cada estado tem ícone e cor próprios: azul = treinou, vermelho = tinha treino
// e não fez, cinza = descanso ou dia que ainda não chegou. A associação dos
// ícones é ensinada pela linha da agenda semanal, logo abaixo no modal.
const STATUS = {
  done: { icon: 'check', title: 'Treino feito' },
  missed: { icon: 'close', title: 'Tinha treino e não foi feito' },
  rest: { icon: 'self_improvement', title: 'Dia de descanso' },
  today: { icon: 'radio_button_unchecked', title: 'Hoje' },
  free: { icon: 'remove', title: 'Sem treino planejado' },
  future: { icon: 'remove', title: 'Ainda não chegou' },
  // Nome antigo de "dia passado sem check-in", ainda presente em respostas
  // guardadas no cache do navegador. Sem este apelido o dia cairia no fallback
  // e apareceria como "ainda não chegou", que é o oposto do que aconteceu.
  pending: { icon: 'close', title: 'Tinha treino e não foi feito' },
};

export default function WeekDaysStatus({ days = [], compact = false }) {
  return (
    <div className={`week-days ${compact ? 'compact' : ''}`}>
      {days.map((day) => {
        const meta = STATUS[day.status] || STATUS.future;
        return (
          <div
            className={`week-day ${day.status} ${day.is_today ? 'is-today' : ''}`}
            key={day.date}
            title={`${day.label}: ${meta.title}`}
          >
            <span className="week-day-dot">
              <Icon filled={day.status === 'done'}>{meta.icon}</Icon>
            </span>
            <small>{day.short}</small>
          </div>
        );
      })}
    </div>
  );
}
