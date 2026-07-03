import { useEffect } from 'react';
import Icon from './Icon';

export default function ActionSheet({
  open,
  onClose,
  title,
  description,
  icon = 'more_horiz',
  actions = [],
}) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="action-sheet-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="action-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="action-sheet-handle" />

        <header className="action-sheet-header">
          <span className="action-sheet-icon"><Icon filled>{icon}</Icon></span>
          <div>
            <span className="action-sheet-kicker">Ações rápidas</span>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        </header>

        <div className="action-sheet-actions">
          {actions.filter(Boolean).map((action) => (
            <button
              className={`action-sheet-action ${action.tone === 'danger' ? 'danger' : ''}`}
              type="button"
              key={action.key || action.label}
              disabled={action.disabled}
              onClick={() => {
                if (action.disabled) return;
                action.onSelect?.();
                if (!action.keepOpen) onClose();
              }}
            >
              <span className="action-sheet-action-icon"><Icon>{action.icon}</Icon></span>
              <span className="action-sheet-action-copy">
                <strong>{action.label}</strong>
                {action.description && <small>{action.description}</small>}
              </span>
              <Icon className="action-sheet-arrow">chevron_right</Icon>
            </button>
          ))}
        </div>

        <button className="action-sheet-cancel" type="button" onClick={onClose}>
          Cancelar
        </button>
      </section>
    </div>
  );
}
