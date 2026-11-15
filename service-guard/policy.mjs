export function decide({healthy, occupied, running, attempts, now}) {
  if (healthy) return 'healthy';
  if (occupied || running) return 'degraded';
  if (attempts.filter(time => now - time < 600000).length >= 3) return 'limited';
  return 'start';
}
