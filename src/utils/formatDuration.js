export const formatDuration = (minutes) => {
  const total = Number(minutes) || 0;
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  const hoursLabel = `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  return remaining === 0 ? hoursLabel : `${hoursLabel} ${remaining} min`;
};
