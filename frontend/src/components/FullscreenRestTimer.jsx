import { useEffect } from 'react';
import CircularTimerProgress from './CircularTimerProgress';
import Icon from './Icon';

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function FullscreenRestTimer({
  timer,
  onFinish,
  onSkip,
  onPause,
  onResume,
  onRestart,
}) {
  const open = Boolean(timer);
  const finished = timer?.status === 'finished';

  // Trava o scroll do fundo enquanto o descanso estiver aberto.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Ao terminar, fecha sozinho depois de alguns segundos (o usuário também
  // pode tocar em "Continuar treino" antes disso).
  useEffect(() => {
    if (!finished) return undefined;
    const timeout = window.setTimeout(() => onFinish?.(), 5000);
    return () => window.clearTimeout(timeout);
  }, [finished, onFinish]);

  if (!open) return null;

  const paused = timer.status === 'paused';
  const progress = timer.duration
    ? Math.max(0, Math.min(1, timer.remaining / timer.duration))
    : 0;

  return (
    <div
      className={`rest-fs ${finished ? 'finished' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Descanso do treino"
    >
      <div className="rest-fs-inner">
        <div className="rest-fs-head">
          {timer.exerciseName && <p className="rest-fs-exercise">{timer.exerciseName}</p>}
          <p className="rest-fs-set">
            {finished
              ? 'Descanso finalizado'
              : (timer.setNumber ? `Série ${timer.setNumber} concluída` : 'Descanso')}
          </p>
          <span className="rest-fs-label">
            {finished ? 'Pronto para a próxima' : (paused ? 'Pausado' : 'Descanso')}
          </span>
        </div>

        <CircularTimerProgress progress={progress} finished={finished}>
          <strong className="rest-fs-count">{formatTime(timer.remaining)}</strong>
          <small className="rest-fs-count-label">{finished ? 'Vamos lá!' : 'restante'}</small>
        </CircularTimerProgress>

        <div className={`rest-fs-actions ${finished ? 'single' : ''}`}>
          {finished ? (
            <button type="button" className="rest-fs-primary" onClick={onFinish}>
              <Icon filled>arrow_forward</Icon>
              Continuar treino
            </button>
          ) : (
            <>
              <button type="button" onClick={paused ? onResume : onPause}>
                <Icon filled>{paused ? 'play_arrow' : 'pause'}</Icon>
                {paused ? 'Continuar' : 'Pausar'}
              </button>
              <button type="button" onClick={onRestart}>
                <Icon>replay</Icon>
                Reiniciar
              </button>
              <button type="button" className="rest-fs-skip" onClick={onSkip}>
                <Icon>skip_next</Icon>
                Pular descanso
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
