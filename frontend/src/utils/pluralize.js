export function exerciseCount(count) {
  return `${count} ${count === 1 ? 'exercício' : 'exercícios'}`;
}

export function groupCount(count) {
  return `${count} ${count === 1 ? 'grupo' : 'grupos'}`;
}
