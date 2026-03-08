const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function getAllSlugs(): string[] {
  const slugs: string[] = [];
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= DAYS_IN_MONTH[m]; d++) {
      slugs.push(`${MONTH_NAMES[m]}-${d}`);
    }
  }
  return slugs;
}

export function slugToDateKey(slug: string): string | null {
  const match = slug.match(/^([a-z]+)-(\d+)$/);
  if (!match) return null;
  const mi = MONTH_NAMES.indexOf(match[1]);
  const day = parseInt(match[2]);
  if (mi === -1 || day < 1 || day > DAYS_IN_MONTH[mi]) return null;
  return `${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateKeyToSlug(dateKey: string): string {
  const [mm, dd] = dateKey.split("-");
  return `${MONTH_NAMES[parseInt(mm) - 1]}-${parseInt(dd)}`;
}

export function getAdjacentSlugs(slug: string): { prev: string; next: string } {
  const all = getAllSlugs();
  const idx = all.indexOf(slug);
  return {
    prev: all[(idx - 1 + all.length) % all.length],
    next: all[(idx + 1) % all.length],
  };
}

export function slugToDisplayDate(slug: string): string {
  const match = slug.match(/^([a-z]+)-(\d+)$/);
  if (!match) return slug;
  const name = match[1];
  return `${name.charAt(0).toUpperCase() + name.slice(1)} ${match[2]}`;
}
