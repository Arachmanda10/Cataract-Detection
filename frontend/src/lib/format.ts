export function pct(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

export function formatUptime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h} j ${m} m ${s} d`;
}