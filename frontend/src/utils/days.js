export const DAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

export function dayName(value) {
  return DAYS.find((day) => day.value === Number(value))?.label || 'Dia não informado';
}

// Semana começando na segunda-feira.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function shortDayName(value) {
  return DAYS.find((day) => day.value === Number(value))?.short || '';
}

export function sortDaysMonFirst(values) {
  return [...values].sort((a, b) => WEEK_ORDER.indexOf(Number(a)) - WEEK_ORDER.indexOf(Number(b)));
}

