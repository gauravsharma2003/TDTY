export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BC`;
  return `${year} AD`;
}

export function yearDisplay(year: number): string {
  return String(Math.abs(year));
}
