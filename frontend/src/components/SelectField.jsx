import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

export default function SelectField({ value, onChange, options, placeholder = 'Selecione' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div className={`select-field ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? '' : 'placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon>expand_more</Icon>
      </button>

      {open && (
        <ul className="select-list" role="listbox">
          {options.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`select-option ${active ? 'active' : ''}`}
                  onClick={() => pick(option)}
                >
                  <span>{option.label}</span>
                  {active && <Icon>check</Icon>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
